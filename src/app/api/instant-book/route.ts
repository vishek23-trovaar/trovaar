import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/instant-book — contractor reads their current instant_book setting
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();
  const row = await db.prepare(
    "SELECT instant_book_enabled, instant_book_price FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { instant_book_enabled: number | null; instant_book_price: number | null } | undefined;

  return NextResponse.json({
    enabled: row ? !!row.instant_book_enabled : false,
    price: row?.instant_book_price ?? null,
  });
}

// PATCH /api/instant-book — contractor toggles instant_book on/off
export async function PATCH(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { enabled?: boolean; price?: number };
  const db = getDb();
  await initializeDatabase();

  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.enabled !== undefined) {
    updates.push("instant_book_enabled = ?");
    vals.push(body.enabled ? 1 : 0);
  }
  if (body.price !== undefined) {
    updates.push("instant_book_price = ?");
    vals.push(body.price);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  vals.push(payload.userId);
  await db.prepare(`UPDATE contractor_profiles SET ${updates.join(", ")} WHERE user_id = ?`).run(...vals);

  const row = await db.prepare(
    "SELECT instant_book_enabled, instant_book_price FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { instant_book_enabled: number | null; instant_book_price: number | null } | undefined;

  return NextResponse.json({
    enabled: row ? !!row.instant_book_enabled : false,
    price: row?.instant_book_price ?? null,
  });
}

// POST /api/instant-book — consumer instantly books a contractor for a job
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId, contractorId } = await request.json();
  if (!jobId || !contractorId) {
    return NextResponse.json({ error: "jobId and contractorId are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify job belongs to this consumer and is in biddable state
  const job = await db.prepare(
    "SELECT * FROM jobs WHERE id = ? AND consumer_id = ? AND status IN ('posted', 'bidding')"
  ).get(jobId, payload.userId) as { id: string; title: string } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found or not available for instant book" }, { status: 404 });
  }

  // Verify contractor has instant book enabled and get their price
  const contractorProfile = await db.prepare(
    "SELECT instant_book_enabled, instant_book_price FROM contractor_profiles WHERE user_id = ?"
  ).get(contractorId) as { instant_book_enabled: number; instant_book_price: number | null } | undefined;

  if (!contractorProfile?.instant_book_enabled || !contractorProfile.instant_book_price) {
    return NextResponse.json({ error: "Contractor does not have Instant Book enabled" }, { status: 400 });
  }

  // Create an accepted bid on behalf of both parties
  const bidId = uuidv4();
  await db.prepare(
    `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status)
     VALUES (?, ?, ?, ?, 3, date('now', '+3 days'), 'Instant Book', 'accepted')`
  ).run(bidId, jobId, contractorId, contractorProfile.instant_book_price);

  // Reject any other pending bids
  await db.prepare(
    "UPDATE bids SET status = 'rejected' WHERE job_id = ? AND id != ? AND status = 'pending'"
  ).run(jobId, bidId);

  // Move job to accepted state and mark as instant book
  await db.prepare(
    "UPDATE jobs SET status = 'accepted', is_instant_book = 1 WHERE id = ?"
  ).run(jobId);

  // Notify contractor
  const contractorName = (await db.prepare("SELECT name FROM users WHERE id = ?").get(contractorId) as { name: string } | undefined)?.name;
  await db.prepare(
    "INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    uuidv4(), contractorId, "instant_book",
    "⚡ Instant Book!",
    `You've been instantly booked for "${job.title}". Check the job details.`,
    jobId
  );

  return NextResponse.json({ bidId, price: contractorProfile.instant_book_price });
}
