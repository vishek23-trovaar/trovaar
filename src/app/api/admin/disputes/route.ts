import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/disputes — list all disputes with full context (admin only)
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();

  const disputes = await db.prepare(`
    SELECT d.*, j.title as job_title, j.id as job_id,
      j.status as job_status, j.category as job_category, j.created_at as job_created_at,
      j.consumer_id as consumer_id,
      uc.name as consumer_name, uc.email as consumer_email,
      u2.name as contractor_name, u2.email as contractor_email,
      b.contractor_id as contractor_id,
      b.price as bid_price, b.created_at as bid_created_at,
      CASE WHEN b.status = 'accepted' THEN b.created_at ELSE NULL END as bid_accepted_at,
      dr.resolution_type, dr.client_refund_cents, dr.contractor_payout_cents,
      dr.client_accepted, dr.contractor_accepted, dr.final_resolution,
      dr.admin_notes
    FROM disputes d
    JOIN jobs j ON j.id = d.job_id
    JOIN users uc ON uc.id = j.consumer_id
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    LEFT JOIN users u2 ON u2.id = b.contractor_id
    LEFT JOIN dispute_resolutions dr ON dr.dispute_id = d.id
    ORDER BY d.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  return NextResponse.json({ disputes });
}
