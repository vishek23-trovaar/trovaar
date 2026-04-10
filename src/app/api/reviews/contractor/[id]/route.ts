import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// GET /api/reviews/contractor/[id] — all reviews for a contractor
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const reviews = await db.prepare(`
    SELECT r.id, r.job_id, r.rating, r.comment, r.photos, r.created_at,
      substr(u.name, 1, instr(u.name || ' ', ' ') - 1) as reviewer_first_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.contractor_id = ?
    ORDER BY r.created_at DESC
  `).all(id);

  return NextResponse.json({ reviews: Array.isArray(reviews) ? reviews : [] });
}
