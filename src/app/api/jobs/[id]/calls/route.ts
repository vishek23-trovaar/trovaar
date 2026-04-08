import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify user is part of this job
  const job = await db
    .prepare(
      `SELECT j.consumer_id, b.contractor_id as accepted_contractor_id
       FROM jobs j
       LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
       WHERE j.id = ?`
    )
    .get(id) as
    | { consumer_id: string; accepted_contractor_id: string | null }
    | undefined;

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAuthorized =
    payload.userId === job.consumer_id ||
    payload.userId === job.accepted_contractor_id ||
    payload.isAdmin;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const calls = db
    .prepare(
      `SELECT cl.id, cl.status, cl.duration_seconds, cl.created_at, cl.ended_at,
         cl.recording_url, cl.transcript,
         caller.name as caller_name,
         receiver.name as receiver_name
       FROM call_logs cl
       JOIN users caller ON caller.id = cl.caller_id
       JOIN users receiver ON receiver.id = cl.receiver_id
       WHERE cl.job_id = ?
       ORDER BY cl.created_at DESC`
    )
    .all(id);

  return NextResponse.json({ calls });
}
