import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { notifyReviewReceived } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import logger from "@/lib/logger";

// GET /api/reviews?jobId=xxx — fetch reviews for a specific job
// Optional: &type=consumer_to_contractor or contractor_to_consumer
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const reviewType = searchParams.get("type");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  if (reviewType) {
    const reviews = await db.prepare(`
      SELECT r.*, u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.job_id = ? AND r.review_type = ?
      ORDER BY r.created_at DESC
    `).all(jobId, reviewType);
    return NextResponse.json({ reviews, review: reviews[0] || null });
  }

  // Default: return all reviews for this job
  const reviews = await db.prepare(`
    SELECT r.*, u.name as reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.job_id = ?
    ORDER BY r.created_at DESC
  `).all(jobId);

  // Backward compat: return single review as well
  const review = reviews.length > 0 ? reviews[0] : null;
  return NextResponse.json({ review, reviews });
}

// POST /api/reviews — submit a review
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, contractorId, consumerId, rating, comment, photos, reviewType } = await request.json();

    const type = reviewType || "consumer_to_contractor";

    if (!["consumer_to_contractor", "contractor_to_consumer"].includes(type)) {
      return NextResponse.json({ error: "Invalid review_type" }, { status: 400 });
    }

    if (!jobId || !rating) {
      return NextResponse.json({ error: "jobId and rating are required" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Verify job exists and is completed
    const job = await db.prepare(`
      SELECT j.*, b.contractor_id as accepted_contractor_id
      FROM jobs j
      LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE j.id = ?
    `).get(jobId) as {
      consumer_id: string;
      accepted_contractor_id: string | null;
      status: string;
      title: string;
    } | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // Allow reviews on completed jobs OR jobs where contractor has confirmed (pending client review + confirmation)
    const isCompletedOrPendingReview = job.status === "completed" ||
      (["in_progress", "accepted"].includes(job.status) && (job as any).contractor_confirmed === 1);
    if (!isCompletedOrPendingReview) {
      return NextResponse.json({ error: "Can only review jobs that are completed or pending your confirmation" }, { status: 400 });
    }

    if (type === "consumer_to_contractor") {
      // Consumer reviewing contractor
      if (payload.role !== "consumer") {
        return NextResponse.json({ error: "Only consumers can leave reviews for contractors" }, { status: 403 });
      }
      if (job.consumer_id !== payload.userId) {
        return NextResponse.json({ error: "Not authorized to review this job" }, { status: 403 });
      }
      if (!contractorId) {
        return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
      }

      // Check for duplicate
      const existing = await db.prepare(
        "SELECT id FROM reviews WHERE job_id = ? AND reviewer_id = ? AND review_type = 'consumer_to_contractor'"
      ).get(jobId, payload.userId);
      if (existing) {
        return NextResponse.json({ error: "You have already reviewed this job" }, { status: 409 });
      }

      const id = uuidv4();
      db.prepare(`
        INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, photos, review_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'consumer_to_contractor')
      `).run(id, jobId, payload.userId, contractorId, Math.round(rating), comment || null, JSON.stringify(photos || []));

      // Update contractor aggregate rating
      db.prepare(`
        UPDATE contractor_profiles
        SET
          rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE contractor_id = ? AND review_type = 'consumer_to_contractor'),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE contractor_id = ? AND review_type = 'consumer_to_contractor')
        WHERE user_id = ?
      `).run(contractorId, contractorId, contractorId);

      // Notify the contractor about the review
      notifyReviewReceived(contractorId, Math.round(rating), job.title ?? "a job", jobId);

      try { trackEvent("review_submitted", { userId: payload.userId, jobId, properties: { contractorId, rating, type } }); } catch {}

      const review = await db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
      return NextResponse.json({ review }, { status: 201 });

    } else {
      // Contractor reviewing consumer
      if (payload.role !== "contractor") {
        return NextResponse.json({ error: "Only contractors can leave reviews for consumers" }, { status: 403 });
      }
      // Verify this contractor was the accepted contractor on the job
      if (job.accepted_contractor_id !== payload.userId) {
        return NextResponse.json({ error: "Not authorized to review this job" }, { status: 403 });
      }

      const targetConsumerId = consumerId || job.consumer_id;

      // Check for duplicate
      const existing = await db.prepare(
        "SELECT id FROM reviews WHERE job_id = ? AND reviewer_id = ? AND review_type = 'contractor_to_consumer'"
      ).get(jobId, payload.userId);
      if (existing) {
        return NextResponse.json({ error: "You have already reviewed this client" }, { status: 409 });
      }

      const id = uuidv4();
      db.prepare(`
        INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, photos, review_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'contractor_to_consumer')
      `).run(id, jobId, payload.userId, targetConsumerId, Math.round(rating), comment || null, JSON.stringify(photos || []));

      // Update consumer aggregate rating
      db.prepare(`
        UPDATE users
        SET
          consumer_rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE contractor_id = ? AND review_type = 'contractor_to_consumer'),
          consumer_rating_count = (SELECT COUNT(*) FROM reviews WHERE contractor_id = ? AND review_type = 'contractor_to_consumer')
        WHERE id = ?
      `).run(targetConsumerId, targetConsumerId, targetConsumerId);

      // Notify the consumer about the review
      try {
        notifyReviewReceived(targetConsumerId, Math.round(rating), job.title ?? "a job", jobId);
      } catch {}

      try { trackEvent("review_submitted", { userId: payload.userId, jobId, properties: { consumerId: targetConsumerId, rating, type } }); } catch {}

      const review = await db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
      return NextResponse.json({ review }, { status: 201 });
    }
  } catch (error) {
    logger.error({ err: error }, "Submit review error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
