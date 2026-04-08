import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/disputes/my — get all disputes involving the current user
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  // Get disputes where user is the reporter, the consumer of the job, or the contractor of the job
  const disputes = await db.prepare(`
    SELECT d.id, d.job_id, d.reporter_id, d.reason, d.details, d.status,
      d.resolution_status, d.created_at, d.updated_at,
      j.title as job_title, j.status as job_status, j.consumer_id,
      uc.name as consumer_name,
      u2.name as contractor_name,
      b.contractor_id, b.price as bid_price,
      dr.resolution_type, dr.client_refund_cents, dr.contractor_payout_cents,
      dr.client_accepted, dr.contractor_accepted, dr.final_resolution,
      dr.admin_notes
    FROM disputes d
    JOIN jobs j ON j.id = d.job_id
    JOIN users uc ON uc.id = j.consumer_id
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    LEFT JOIN users u2 ON u2.id = b.contractor_id
    LEFT JOIN dispute_resolutions dr ON dr.dispute_id = d.id
    WHERE j.consumer_id = ? OR b.contractor_id = ? OR d.reporter_id = ?
    ORDER BY d.created_at DESC
  `).all(payload.userId, payload.userId, payload.userId) as Array<Record<string, unknown>>;

  return NextResponse.json({ disputes });
}
