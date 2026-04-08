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

  const log = db
    .prepare(
      `SELECT cl.*,
        caller.name as caller_name,
        receiver.name as receiver_name,
        j.title as job_title
       FROM call_logs cl
       JOIN users caller ON caller.id = cl.caller_id
       JOIN users receiver ON receiver.id = cl.receiver_id
       JOIN jobs j ON j.id = cl.job_id
       WHERE cl.id = ?
         AND (cl.caller_id = ? OR cl.receiver_id = ? OR ?)`
    )
    .get(id, payload.userId, payload.userId, payload.isAdmin ? 1 : 0);

  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ log });
}
