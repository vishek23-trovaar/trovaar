import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/contractor/jobs — List jobs the contractor is working on
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "active" or specific status

  const db = getDb();
  await initializeDatabase();

  let statusFilter = "";
  if (status === "active") {
    statusFilter = "AND j.status IN ('accepted', 'in_progress')";
  } else if (status) {
    statusFilter = `AND j.status = '${status.replace(/[^a-z_]/g, "")}'`;
  }

  const jobs = await db.prepare(`
    SELECT j.*, b.price as bid_price, b.status as bid_status,
           u.name as consumer_name
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    JOIN users u ON j.consumer_id = u.id
    WHERE b.contractor_id = ? AND b.status = 'accepted' ${statusFilter}
    ORDER BY j.updated_at DESC, j.created_at DESC
  `).all(payload.userId) as Array<Record<string, unknown>>;

  return NextResponse.json({ jobs });
}
