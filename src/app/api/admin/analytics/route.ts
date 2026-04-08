import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const daysParam = url.searchParams.get("days");

  // Determine the number of days — supports both ?range=30d and ?days=30 formats
  let days: string[];
  let sqlInterval: string;
  if (daysParam === null && rangeParam === null) {
    // No param = all time
    const firstRow = await db.prepare(
      "SELECT MIN(date(created_at)) as d FROM users"
    ).get() as { d: string | null };
    const startDate = firstRow?.d ? new Date(firstRow.d) : new Date();
    const diffDays = Math.max(Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 30);
    const count = diffDays;
    sqlInterval = `-${count} days`;
    days = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
  } else if (rangeParam === "ytd") {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diffMs = now.getTime() - startOfYear.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const count = Math.max(diffDays, 1);
    sqlInterval = `-${count} days`;
    days = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
  } else {
    // Support ?days=7 or ?range=7d
    const countFromDays = daysParam ? parseInt(daysParam, 10) : 0;
    const countMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const count = countFromDays > 0 ? countFromDays : (countMap[rangeParam ?? "30d"] ?? 30);
    sqlInterval = `-${count} days`;
    days = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
  }

  // Daily signups for the selected range
  const signupRows = await db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM users
    WHERE created_at >= datetime('now', '${sqlInterval}')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; count: number }>;

  // Daily jobs posted for the selected range
  const jobRows = await db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM jobs
    WHERE created_at >= datetime('now', '${sqlInterval}')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; count: number }>;

  // Daily platform revenue (markup) for the selected range — from accepted bids
  const revenueRows = await db.prepare(`
    SELECT date(b.created_at) as day,
           ROUND(SUM(b.price * 0.20)) as revenue_cents
    FROM bids b
    WHERE b.status = 'accepted'
      AND b.created_at >= datetime('now', '${sqlInterval}')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; revenue_cents: number }>;

  // Revenue by category (all time)
  const revByCat = await db.prepare(`
    SELECT j.category,
           COUNT(b.id) as jobs,
           ROUND(SUM(b.price * 0.20)) as revenue_cents,
           ROUND(AVG(b.price)) as avg_bid_cents
    FROM bids b
    JOIN jobs j ON j.id = b.job_id
    WHERE b.status = 'accepted'
    GROUP BY j.category
    ORDER BY revenue_cents DESC
    LIMIT 10
  `).all() as Array<{ category: string; jobs: number; revenue_cents: number; avg_bid_cents: number }>;

  // Build a merged series with zero-fill
  const signupMap = Object.fromEntries(signupRows.map((r) => [r.day, r.count]));
  const jobMap = Object.fromEntries(jobRows.map((r) => [r.day, r.count]));
  const revenueMap = Object.fromEntries(revenueRows.map((r) => [r.day, r.revenue_cents]));

  const timeSeries = days.map((day) => ({
    day: day.slice(5), // MM-DD
    fullDay: day,
    signups: signupMap[day] ?? 0,
    jobs: jobMap[day] ?? 0,
    revenue: (revenueMap[day] ?? 0) / 100, // dollars
  }));

  // KPIs (always all-time and last 30/7 regardless of selected range)
  const totalRevAllTime = (await db.prepare(
    "SELECT COALESCE(ROUND(SUM(price * 0.20)), 0) as r FROM bids WHERE status = 'accepted'"
  ).get() as { r: number }).r;

  const last30RevenueRows = await db.prepare(`
    SELECT ROUND(SUM(price * 0.20)) as r FROM bids
    WHERE status = 'accepted' AND created_at >= datetime('now', '-30 days')
  `).get() as { r: number | null };
  const totalRevLast30 = last30RevenueRows.r ?? 0;

  const last7RevenueRows = await db.prepare(`
    SELECT ROUND(SUM(price * 0.20)) as r FROM bids
    WHERE status = 'accepted' AND created_at >= datetime('now', '-7 days')
  `).get() as { r: number | null };
  const totalRevLast7 = last7RevenueRows.r ?? 0;

  const avgBidCents = (await db.prepare(
    "SELECT COALESCE(ROUND(AVG(price)), 0) as a FROM bids WHERE status = 'accepted'"
  ).get() as { a: number }).a;

  const conversionRate = await (async () => {
    const posted = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status != 'cancelled'").get() as { c: number }).c;
    const accepted = (await db.prepare("SELECT COUNT(*) as c FROM bids WHERE status = 'accepted'").get() as { c: number }).c;
    return posted > 0 ? Math.round((accepted / posted) * 100) : 0;
  })();

  return NextResponse.json({
    timeSeries,
    revByCat,
    kpis: {
      totalRevAllTime,
      totalRevLast30,
      totalRevLast7,
      avgBidCents,
      conversionRate,
    },
  });
}
