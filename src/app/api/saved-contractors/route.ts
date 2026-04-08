import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/saved-contractors — list saved contractors for current consumer
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const saved = db.prepare(`
    SELECT sc.id as save_id, sc.created_at as saved_at,
      u.id, u.name, u.location,
      cp.rating, cp.rating_count, cp.verification_status,
      cp.insurance_status, cp.contractor_type, cp.profile_photo,
      cp.years_experience,
      (SELECT COUNT(*) FROM bids b JOIN jobs j ON b.job_id = j.id
       WHERE b.contractor_id = u.id AND b.status = 'accepted' AND j.status = 'completed'
      ) as completed_jobs
    FROM saved_contractors sc
    JOIN users u ON sc.contractor_id = u.id
    LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
    WHERE sc.consumer_id = ?
    ORDER BY sc.created_at DESC
  `).all(payload.userId);

  return NextResponse.json({ saved });
}

// POST /api/saved-contractors — save a contractor
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractorId } = await request.json();
  if (!contractorId) {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Check if already saved
  const existing = await db.prepare(
    "SELECT id FROM saved_contractors WHERE consumer_id = ? AND contractor_id = ?"
  ).get(payload.userId, contractorId);
  if (existing) {
    return NextResponse.json({ error: "Already saved" }, { status: 409 });
  }

  const id = uuidv4();
  db.prepare(
    "INSERT INTO saved_contractors (id, consumer_id, contractor_id) VALUES (?, ?, ?)"
  ).run(id, payload.userId, contractorId);

  return NextResponse.json({ id, success: true }, { status: 201 });
}

// DELETE /api/saved-contractors?contractorId=xxx — unsave a contractor
export async function DELETE(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get("contractorId");
  if (!contractorId) {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  await db.prepare(
    "DELETE FROM saved_contractors WHERE consumer_id = ? AND contractor_id = ?"
  ).run(payload.userId, contractorId);

  return NextResponse.json({ success: true });
}
