import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  // Build client list from completed jobs
  const clients = await db.prepare(`
    SELECT
      u.id as consumer_id,
      u.name,
      u.email,
      u.location,
      MIN(j.completed_at) as first_job_date,
      MAX(j.completed_at) as last_job_date,
      COUNT(j.id) as total_jobs,
      COALESCE(SUM(b.price), 0) as total_earned_cents,
      cc.notes,
      COALESCE(cc.is_favorite, 0) as is_favorite,
      cc.id as client_record_id
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    JOIN users u ON j.consumer_id = u.id
    LEFT JOIN contractor_clients cc ON cc.contractor_id = ? AND cc.consumer_id = u.id
    WHERE b.contractor_id = ?
      AND b.status = 'accepted'
      AND j.status = 'completed'
    GROUP BY u.id, u.name, u.email, u.location, cc.notes, cc.is_favorite, cc.id
    ORDER BY MAX(j.completed_at) DESC
  `).all(payload.userId, payload.userId) as Array<Record<string, unknown>>;

  // Compute aggregate stats
  const totalClients = clients.length;
  const repeatClients = clients.filter((c) => (c.total_jobs as number) > 1).length;
  const totalEarned = clients.reduce((s, c) => s + (c.total_earned_cents as number), 0);
  const avgPerClient = totalClients > 0 ? Math.round(totalEarned / totalClients) : 0;

  return NextResponse.json({
    clients,
    stats: {
      totalClients,
      repeatClients,
      totalEarned,
      avgPerClient,
    },
  });
}
