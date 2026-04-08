import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/insights/surge — returns surge insights for a contractor's service categories
// Compares job volume in last 7 days vs 30-day rolling average
export async function GET(req: NextRequest) {
  const payload = getAuthPayload(req.headers);
  if (!payload || (payload.role !== "contractor" && payload.role !== "consumer")) {
    return NextResponse.json({ insights: [] });
  }

  const db = getDb();
  await initializeDatabase();

  // Get all categories with recent job counts
  const recentJobs = await db.prepare(`
    SELECT category, COUNT(*) as count_7d
    FROM jobs
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY category
  `).all() as Array<{ category: string; count_7d: number }>;

  const historicalJobs = await db.prepare(`
    SELECT category, COUNT(*) / 4.0 as avg_weekly
    FROM jobs
    WHERE created_at >= datetime('now', '-30 days')
      AND created_at < datetime('now', '-7 days')
    GROUP BY category
  `).all() as Array<{ category: string; avg_weekly: number }>;

  // Calculate surge multipliers
  const insights = recentJobs
    .map(r => {
      const hist = historicalJobs.find(h => h.category === r.category);
      const baseline = hist?.avg_weekly ?? 1;
      const multiplier = r.count_7d / baseline;
      return { category: r.category, count_7d: r.count_7d, multiplier };
    })
    .filter(i => i.multiplier >= 1.5 && i.count_7d >= 2) // Only show meaningful surges
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 3);

  return NextResponse.json({ insights });
}
