import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { applyMarkup } from "@/lib/pricing";
import { sendSMS } from "@/lib/sms";
import { checkSuspension } from "@/lib/strikes";
import { sendNewBidEmail, sendBidAcceptedEmail, sendJobCompletedEmail, sendInvoiceEmail } from "@/lib/email";
import { notifyNewBid } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import { jobsLogger as logger } from "@/lib/logger";

// Simple in-memory rate limiter: max 10 bids per contractor per hour
const bidRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(contractorId: string): boolean {
  const now = Date.now();
  const entry = bidRateLimit.get(contractorId);
  if (!entry || now > entry.resetAt) {
    bidRateLimit.set(contractorId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id: jobId } = await params;
  const db = getDb();
  await initializeDatabase();
  const payload = getAuthPayload(request.headers);

  // Contractors only see their own bids (with original pricing)
  if (payload?.role === "contractor") {
    const bids = await db.prepare(`
      SELECT b.*, u.name as contractor_name,
        cp.rating as contractor_rating,
        cp.years_experience as contractor_years_experience,
        cp.profile_photo as contractor_photo,
        cp.verification_status as contractor_verification_status,
        cp.insurance_status as contractor_insurance_status,
        cp.contractor_type as contractor_type,
        cp.qualifications as contractor_qualifications,
        cp.background_check_status as contractor_background_check,
        cp.headline as contractor_headline,
        cs.avg_response_minutes as avg_response_hours,
        (
          SELECT COUNT(*) FROM bids b2
          JOIN jobs j ON b2.job_id = j.id
          WHERE b2.contractor_id = b.contractor_id
            AND b2.status = 'accepted'
            AND j.status = 'completed'
        ) as contractor_completed_jobs,
        (
          SELECT COUNT(*) FROM bids b3
          JOIN jobs j2 ON b3.job_id = j2.id
          WHERE b3.contractor_id = b.contractor_id
            AND b3.status = 'accepted'
            AND j2.status = 'completed'
            AND j2.payment_status = 'paid'
        ) as contractor_paid_completions,
        (
          SELECT COUNT(*) FROM bids b4
          WHERE b4.contractor_id = b.contractor_id AND b4.status = 'accepted'
        ) as contractor_total_accepted,
        (
          SELECT STRING_AGG(cc.name, '||') FROM (
            SELECT name FROM certifications WHERE contractor_id = b.contractor_id
            ORDER BY verified DESC LIMIT 3
          ) cc
        ) as contractor_certifications_list
      FROM bids b
      JOIN users u ON b.contractor_id = u.id
      LEFT JOIN contractor_profiles cp ON b.contractor_id = cp.user_id
      LEFT JOIN contractor_stats cs ON cs.contractor_id = b.contractor_id
      WHERE b.job_id = ? AND b.contractor_id = ?
      ORDER BY b.created_at DESC
    `).all(jobId, payload.userId);
    return NextResponse.json({ bids });
  }

  // Consumers (and admin/unauthenticated) see all bids with markup applied
  const rawBids = await db.prepare(`
    SELECT b.*, u.name as contractor_name,
      cp.rating as contractor_rating,
      cp.years_experience as contractor_years_experience,
      cp.profile_photo as contractor_photo,
      cp.verification_status as contractor_verification_status,
      cp.insurance_status as contractor_insurance_status,
      cp.contractor_type as contractor_type,
      cp.qualifications as contractor_qualifications,
      cp.background_check_status as contractor_background_check,
      cp.headline as contractor_headline,
      cs.avg_response_minutes as avg_response_hours,
      (
        SELECT COUNT(*) FROM bids b2
        JOIN jobs j ON b2.job_id = j.id
        WHERE b2.contractor_id = b.contractor_id
          AND b2.status = 'accepted'
          AND j.status = 'completed'
      ) as contractor_completed_jobs,
      (
        SELECT COUNT(*) FROM bids b3
        JOIN jobs j2 ON b3.job_id = j2.id
        WHERE b3.contractor_id = b.contractor_id
          AND b3.status = 'accepted'
          AND j2.status = 'completed'
          AND j2.payment_status = 'paid'
      ) as contractor_paid_completions,
      (
        SELECT COUNT(*) FROM bids b4
        WHERE b4.contractor_id = b.contractor_id AND b4.status = 'accepted'
      ) as contractor_total_accepted,
      (
        SELECT STRING_AGG(cc.name, '||') FROM (
          SELECT name FROM certifications WHERE contractor_id = b.contractor_id
          ORDER BY verified DESC LIMIT 3
        ) cc
      ) as contractor_certifications_list
    FROM bids b
    JOIN users u ON b.contractor_id = u.id
    LEFT JOIN contractor_profiles cp ON b.contractor_id = cp.user_id
    LEFT JOIN contractor_stats cs ON cs.contractor_id = b.contractor_id
    WHERE b.job_id = ?
    ORDER BY b.created_at DESC
  `).all(jobId) as Array<Record<string, unknown>>;

  // Apply 20% markup: store original price as contractor_price, marked-up as price
  const bids = rawBids.map((bid) => ({
    ...bid,
    contractor_price: bid.price,
    price: applyMarkup(bid.price as number),
  }));

  return NextResponse.json({ bids });
  } catch (err) {
    logger.error({ err }, "GET bids error");
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can submit bids" }, { status: 403 });
  }

  // Suspension check — suspended contractors cannot bid
  const suspension = await checkSuspension(payload.userId);
  if (suspension.suspended) {
    return NextResponse.json({
      error: suspension.until
        ? `Your account is suspended until ${new Date(suspension.until).toLocaleDateString()}. You cannot bid on jobs during this time.`
        : "Your account has been permanently suspended. Please contact support.",
    }, { status: 403 });
  }

  const { id: jobId } = await params;

  // Portfolio check — contractors must have at least 3 portfolio photos to bid
  try {
    const db = getDb();
    await initializeDatabase();

    // Count portfolio_items (before/after projects)
    const portfolioItemCount = await db
      .prepare("SELECT COUNT(*) as count FROM portfolio_items WHERE contractor_id = ?")
      .get(payload.userId) as { count: number };

    // Count portfolio_photos JSON entries on contractor_profiles
    const profileRow = await db
      .prepare("SELECT portfolio_photos FROM contractor_profiles WHERE user_id = ?")
      .get(payload.userId) as { portfolio_photos: string } | undefined;

    let photoCount = portfolioItemCount.count;
    if (profileRow?.portfolio_photos) {
      try {
        const photos = JSON.parse(profileRow.portfolio_photos);
        if (Array.isArray(photos)) photoCount += photos.length;
      } catch { /* ignore parse errors */ }
    }

    if (photoCount < 3) {
      return NextResponse.json({
        error: "You need at least 3 portfolio photos before you can bid. Go to your profile to add work photos.",
      }, { status: 403 });
    }
  } catch (err) {
    logger.error({ err }, "Portfolio check error during bid submission");
    // Don't block bids if portfolio check itself fails
  }

  try {
    const body = await request.json();
    let { price } = body;
    const { timeline_days, availability_date, message, labor_cents, materials_json, parts_summary, equipment_json } = body;

    // Parse price if passed as a string
    if (typeof price === 'string') {
      price = parseFloat(price);
    }

    if (!timeline_days || !availability_date) {
      return NextResponse.json({ error: "Price, timeline, and availability date are required" }, { status: 400 });
    }

    if (!price || typeof price !== 'number' || price <= 0 || price > 1000000) {
      return NextResponse.json({ error: "Price must be a positive number up to $1,000,000" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as {
      status: string;
      consumer_id: string;
      title: string;
      created_at: string;
    } | undefined;
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!["posted", "bidding"].includes(job.status)) {
      return NextResponse.json({ error: "Job is no longer accepting bids" }, { status: 400 });
    }

    const existingBid = await db.prepare(
      "SELECT id FROM bids WHERE job_id = ? AND contractor_id = ?"
    ).get(jobId, payload.userId);
    if (existingBid) {
      return NextResponse.json({ error: "You have already submitted a bid for this job" }, { status: 409 });
    }

    // Rate limit: max 10 bids per contractor per hour
    if (!checkRateLimit(payload.userId)) {
      return NextResponse.json({ error: "Too many bids submitted. Please wait before bidding again." }, { status: 429 });
    }

    const bidId = uuidv4();
    await db.prepare(
      `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, labor_cents, materials_json, parts_summary, equipment_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(bidId, jobId, payload.userId, price, timeline_days, availability_date, message || null, labor_cents ?? null, materials_json ?? null, parts_summary ?? null, equipment_json ?? null);

    await db.prepare(
      "UPDATE jobs SET status = 'bidding', updated_at = datetime('now') WHERE id = ? AND status = 'posted'"
    ).run(jobId);

    try { trackEvent("bid_placed", { userId: payload.userId, jobId, properties: { price, timeline_days } }); } catch {}

    // Track first_bid_at for analytics (only set if not already set)
    await db.prepare(
      "UPDATE jobs SET first_bid_at = datetime('now') WHERE id = ? AND first_bid_at IS NULL"
    ).run(jobId);

    // Upsert contractor_stats with response time (Feature 23)
    const responseHours = Math.abs((Date.now() - new Date(job.created_at).getTime()) / 3600000);
    await db.prepare(`
      INSERT INTO contractor_stats (contractor_id, total_bids, avg_response_hours, updated_at)
      VALUES (?, 1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(contractor_id) DO UPDATE SET
        total_bids = total_bids + 1,
        avg_response_hours = CASE
          WHEN avg_response_hours IS NULL THEN excluded.avg_response_hours
          ELSE (avg_response_hours * total_bids + excluded.avg_response_hours) / (total_bids + 1)
        END,
        updated_at = CURRENT_TIMESTAMP
    `).run(payload.userId, responseHours);

    // Notify the consumer
    {
      const contractorUser = await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | null;
      const displayPrice = Math.round((price / 100) * 1.2);
      notifyNewBid(job.consumer_id, job.title, contractorUser?.name ?? "A contractor", displayPrice, jobId);
    }

    // Send email notification to consumer
    try {
      const consumer = await db.prepare("SELECT email, name FROM users WHERE id = ?").get(job.consumer_id) as { email: string; name: string } | null;
      const contractor = await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | null;
      if (consumer && contractor) {
        const displayPrice = Math.round((price / 100) * 1.2); // consumer sees marked-up price
        await sendNewBidEmail({
          toEmail: consumer.email,
          toName: consumer.name,
          jobTitle: job.title as string,
          contractorName: contractor.name,
          bidPrice: displayPrice,
          jobId: jobId,
        });
      }
    } catch { /* never block bid creation */ }

    // Feature 26 — SMS Bid Alerts: send SMS to consumer if enabled
    const smsOwner = await db.prepare(
      "SELECT phone_number, sms_alerts_enabled FROM users WHERE id = ?"
    ).get(job.consumer_id) as {
      phone_number: string | null;
      sms_alerts_enabled: number;
    } | undefined;

    if (smsOwner?.sms_alerts_enabled && smsOwner.phone_number) {
      const smsDisplayPrice = Math.round((price / 100) * 1.2);
      const msg = `Trovaar: New bid of $${smsDisplayPrice} on your job "${job.title}". View bids: ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"}/jobs/${jobId}`;
      sendSMS(smsOwner.phone_number, msg).catch((err) => {
        logger.error({ err }, "Failed to send bid alert SMS");
      });
    }

    const bid = await db.prepare("SELECT * FROM bids WHERE id = ?").get(bidId);

    return NextResponse.json({ bid }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create bid error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
