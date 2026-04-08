import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface ScheduleChangeRequest {
  id: string;
  job_id: string;
  bid_id: string;
  requested_by: string;
  proposed_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

interface BidRow {
  id: string;
  contractor_id: string;
  job_id: string;
  availability_date: string;
  status: string;
}

interface JobRow {
  id: string;
  consumer_id: string;
  title: string;
}

// POST — contractor proposes a new date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can propose a reschedule" }, { status: 403 });
  }

  const body = await request.json() as {
    bidId: string;
    proposedDate: string;
    reason?: string;
  };

  if (!body.bidId || !body.proposedDate) {
    return NextResponse.json({ error: "bidId and proposedDate are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify job exists
  const job = await db.prepare("SELECT id, consumer_id, title FROM jobs WHERE id = ?").get(jobId) as JobRow | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Verify the bid belongs to this contractor and is accepted
  const bid = await db.prepare(
    "SELECT id, contractor_id, job_id, availability_date, status FROM bids WHERE id = ? AND job_id = ?"
  ).get(body.bidId, jobId) as BidRow | undefined;

  if (!bid) {
    return NextResponse.json({ error: "Bid not found for this job" }, { status: 404 });
  }
  if (bid.contractor_id !== payload.userId) {
    return NextResponse.json({ error: "You are not the contractor for this bid" }, { status: 403 });
  }
  if (bid.status !== "accepted") {
    return NextResponse.json({ error: "Can only reschedule an accepted bid" }, { status: 400 });
  }

  const requestId = uuidv4();

  db.prepare(`
    INSERT INTO schedule_change_requests (id, job_id, bid_id, requested_by, proposed_date, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(requestId, jobId, body.bidId, payload.userId, body.proposedDate, body.reason ?? null);

  // Notify consumer
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
      VALUES (?, ?, 'reschedule_proposed', 'Reschedule Requested', ?, ?, datetime('now'))
    `).run(
      uuidv4(),
      job.consumer_id,
      `Your contractor has proposed a new date for "${job.title}". Please review and respond.`,
      jobId
    );
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, requestId }, { status: 201 });
}

// PATCH — consumer accepts or rejects a reschedule proposal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "consumer") {
    return NextResponse.json({ error: "Only consumers can accept or reject a reschedule" }, { status: 403 });
  }

  const body = await request.json() as {
    requestId: string;
    action: "accept" | "reject";
  };

  if (!body.requestId || !body.action) {
    return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
  }
  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json({ error: "action must be accept or reject" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare("SELECT id, consumer_id, title FROM jobs WHERE id = ?").get(jobId) as JobRow | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.consumer_id !== payload.userId) {
    return NextResponse.json({ error: "You are not the consumer for this job" }, { status: 403 });
  }

  const changeReq = await db.prepare(
    "SELECT * FROM schedule_change_requests WHERE id = ? AND job_id = ? AND status = 'pending'"
  ).get(body.requestId, jobId) as ScheduleChangeRequest | undefined;

  if (!changeReq) {
    return NextResponse.json({ error: "Pending reschedule request not found" }, { status: 404 });
  }

  const newStatus = body.action === "accept" ? "accepted" : "rejected";
  await db.prepare("UPDATE schedule_change_requests SET status = ? WHERE id = ?").run(newStatus, body.requestId);

  if (body.action === "accept") {
    // Update the bid's availability_date
    await db.prepare("UPDATE bids SET availability_date = ? WHERE id = ?").run(
      changeReq.proposed_date,
      changeReq.bid_id
    );
  }

  // Notify contractor
  try {
    const actionWord = body.action === "accept" ? "accepted" : "rejected";
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
      VALUES (?, ?, 'reschedule_response', ?, ?, ?, datetime('now'))
    `).run(
      uuidv4(),
      changeReq.requested_by,
      `Reschedule ${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)}`,
      `The consumer has ${actionWord} your reschedule request for "${job.title}".`,
      jobId
    );
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true });
}

// GET — returns the latest pending reschedule request for this job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  const changeReq = await db.prepare(`
    SELECT * FROM schedule_change_requests
    WHERE job_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(jobId) as ScheduleChangeRequest | undefined;

  return NextResponse.json({ request: changeReq ?? null });
}
