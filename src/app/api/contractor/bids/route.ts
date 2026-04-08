import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();
  const bids = await db.prepare(`
    SELECT b.*, j.title as job_title, j.category, j.status as job_status, j.consumer_id
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.contractor_id = ?
    ORDER BY b.created_at DESC
  `).all(payload.userId) as Array<Record<string, unknown>>;

  return NextResponse.json({ bids });
}
