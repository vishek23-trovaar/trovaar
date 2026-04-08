import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { getContractorStats } from "@/lib/strikes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  // Response-time / bid stats (Feature 23)
  const bidStats = await db.prepare(
    `SELECT contractor_id, total_bids, accepted_bids, acceptance_rate, updated_at,
       CASE WHEN avg_response_hours IS NULL THEN NULL
            ELSE ABS(avg_response_hours)
       END as avg_response_hours
     FROM contractor_stats WHERE contractor_id = ?`
  ).get(id) as {
    contractor_id: string;
    avg_response_hours: number | null;
    total_bids: number;
    accepted_bids: number;
    acceptance_rate: number | null;
    updated_at: string;
  } | undefined;

  // Accountability stats (Contractor Accountability System)
  const accountabilityStats = getContractorStats(id);

  // Merge both into a single stats object
  const stats = accountabilityStats
    ? {
        ...accountabilityStats,
        avg_response_hours: bidStats?.avg_response_hours != null ? bidStats.avg_response_hours : 0,
        total_bids: bidStats?.total_bids ?? 0,
        accepted_bids: bidStats?.accepted_bids ?? 0,
        acceptance_rate: bidStats?.acceptance_rate ?? null,
      }
    : bidStats
    ? {
        ...bidStats,
        avg_response_hours: bidStats.avg_response_hours != null ? bidStats.avg_response_hours : 0,
        cancellation_count: 0,
        no_show_count: 0,
        acceptance_count: 0,
        completion_count: 0,
        strike_count: 0,
        is_suspended: 0,
        suspended_until: null,
        completionRate: null,
        activeStrikes: 0,
      }
    : null;

  if (!stats) {
    return NextResponse.json({ stats: null });
  }

  return NextResponse.json({ stats });
}
