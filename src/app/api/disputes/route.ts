import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { notifyDisputeOpened } from "@/lib/notifications";

// POST /api/disputes — file a dispute for a job
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, reason, description } = await request.json();
  if (!jobId || !reason || !description?.trim()) {
    return NextResponse.json({ error: "jobId, reason, and description are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Job must exist and be in a state that allows disputes
  const job = await db.prepare(`
    SELECT j.id, j.title, j.consumer_id, j.completed_at, b.contractor_id, b.price
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ? AND j.status IN ('accepted', 'in_progress', 'completed')
  `).get(jobId) as {
    id: string;
    title: string;
    consumer_id: string;
    completed_at: string | null;
    contractor_id: string | null;
    price: number | null;
  } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found or not eligible for dispute" }, { status: 404 });
  }

  // Simplified auth check: consumer is identified directly from jobs table (no join dependency)
  const authCheck = await db.prepare(`
    SELECT j.id FROM jobs j
    WHERE j.id = ?
    AND j.consumer_id = ?
    AND j.status IN ('accepted', 'in_progress', 'completed')
  `).get(jobId, payload.userId) as { id: string } | undefined;

  // Only consumer or contractor for this job can file a dispute
  if (!authCheck && job.contractor_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized to dispute this job" }, { status: 403 });
  }

  // Check for existing open dispute
  const existing = await db.prepare(
    "SELECT id FROM disputes WHERE job_id = ? AND status = 'open'"
  ).get(jobId);
  if (existing) {
    return NextResponse.json({ error: "An open dispute already exists for this job" }, { status: 409 });
  }

  // Determine satisfaction guarantee eligibility:
  // - Job must be completed
  // - Bid price must be under $1000 (100000 cents)
  // - Must be within 48 hours of completion
  let guaranteeEligible = 0;
  try {
    if (job.completed_at && job.price !== null) {
      const completedAt = new Date(job.completed_at).getTime();
      const now = Date.now();
      const hoursSinceCompletion = (now - completedAt) / (1000 * 60 * 60);
      if (job.price < 100000 && hoursSinceCompletion <= 48) {
        guaranteeEligible = 1;
      }
    }
  } catch {
    // If date parsing fails, just leave guarantee_eligible as 0
  }

  const disputeId = uuidv4();
  await db.prepare(
    "INSERT INTO disputes (id, job_id, reporter_id, reason, details, guarantee_eligible) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(disputeId, jobId, payload.userId, reason, description.trim(), guaranteeEligible);

  // Notify admin (we'll notify via a special user_id = 'admin' or use a platform notification)
  // Also notify the other party
  const otherPartyId = job.consumer_id === payload.userId ? job.contractor_id : job.consumer_id;
  if (otherPartyId) {
    notifyDisputeOpened(otherPartyId, job.title, jobId);
  }

  return NextResponse.json({ disputeId, guaranteeEligible: !!guaranteeEligible }, { status: 201 });
}

// GET /api/disputes?jobId=xxx — get disputes for a job (parties or admin)
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();

  // Verify access
  if (!payload.isAdmin) {
    const job = await db.prepare(`
      SELECT j.consumer_id, b.contractor_id
      FROM jobs j
      LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE j.id = ?
    `).get(jobId) as { consumer_id: string; contractor_id: string | null } | undefined;

    if (!job || (job.consumer_id !== payload.userId && job.contractor_id !== payload.userId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  const disputes = await db.prepare(
    "SELECT * FROM disputes WHERE job_id = ? ORDER BY created_at DESC"
  ).all(jobId);

  return NextResponse.json({ disputes });
}
