import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();

  // ── Funnel ──────────────────────────────────────────────────
  const jobsPosted = (await db.prepare("SELECT COUNT(*) as c FROM jobs").get() as { c: number }).c;
  const jobsWithBids = (await db.prepare("SELECT COUNT(DISTINCT job_id) as c FROM bids").get() as { c: number }).c;
  const jobsAccepted = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status IN ('accepted','in_progress','completed')").get() as { c: number }).c;
  const jobsCompleted = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").get() as { c: number }).c;
  const jobsPaid = (await db.prepare("SELECT COUNT(*) as c FROM bids WHERE status = 'accepted'").get() as { c: number }).c;

  // ── Revenue Metrics ─────────────────────────────────────────
  const totalRevAllTime = (await db.prepare(
    "SELECT COALESCE(ROUND(SUM(price * 0.20)), 0) as r FROM bids WHERE status = 'accepted'"
  ).get() as { r: number }).r;

  const totalRevLast30 = (await db.prepare(
    "SELECT COALESCE(ROUND(SUM(price * 0.20)), 0) as r FROM bids WHERE status = 'accepted' AND created_at >= datetime('now', '-30 days')"
  ).get() as { r: number }).r;

  const totalRevLast7 = (await db.prepare(
    "SELECT COALESCE(ROUND(SUM(price * 0.20)), 0) as r FROM bids WHERE status = 'accepted' AND created_at >= datetime('now', '-7 days')"
  ).get() as { r: number }).r;

  const avgRevenuePerJob = (await db.prepare(
    "SELECT COALESCE(ROUND(AVG(price * 0.20)), 0) as a FROM bids WHERE status = 'accepted'"
  ).get() as { a: number }).a;

  // Daily revenue for last 30 days
  const revenueTimeSeries = await db.prepare(`
    SELECT date(b.created_at) as day,
           ROUND(SUM(b.price * 0.20)) as revenue_cents
    FROM bids b
    WHERE b.status = 'accepted'
      AND b.created_at >= datetime('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; revenue_cents: number }>;

  // Revenue by category
  const revenueByCat = await db.prepare(`
    SELECT j.category,
           ROUND(SUM(b.price * 0.20)) as revenue_cents,
           COUNT(b.id) as jobs
    FROM bids b
    JOIN jobs j ON j.id = b.job_id
    WHERE b.status = 'accepted'
    GROUP BY j.category
    ORDER BY revenue_cents DESC
  `).all() as Array<{ category: string; revenue_cents: number; jobs: number }>;

  // ── User Growth ─────────────────────────────────────────────
  // Signups per day for last 30 days, split by role
  const consumerSignups = await db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM users
    WHERE role = 'consumer' AND created_at >= datetime('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; count: number }>;

  const contractorSignups = await db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM users
    WHERE role = 'contractor' AND created_at >= datetime('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all() as Array<{ day: string; count: number }>;

  // Total active users (posted a job or bid in last 30 days)
  const activeUsers = (await db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM (
      SELECT consumer_id as user_id FROM jobs WHERE created_at >= datetime('now', '-30 days')
      UNION
      SELECT contractor_id as user_id FROM bids WHERE created_at >= datetime('now', '-30 days')
    )
  `).get() as { c: number }).c;

  // Retention: users signed up 30+ days ago active in last 7 days
  const retainedUsers = (await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as c
    FROM users u
    WHERE u.created_at < datetime('now', '-30 days')
      AND (
        u.id IN (SELECT consumer_id FROM jobs WHERE created_at >= datetime('now', '-7 days'))
        OR u.id IN (SELECT contractor_id FROM bids WHERE created_at >= datetime('now', '-7 days'))
      )
  `).get() as { c: number }).c;

  const eligibleForRetention = (await db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE created_at < datetime('now', '-30 days')"
  ).get() as { c: number }).c;

  const retentionRate = eligibleForRetention > 0
    ? Math.round((retainedUsers / eligibleForRetention) * 100)
    : 0;

  const totalUsers = (await db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;

  // Build 30-day user growth series
  const consumerMap = Object.fromEntries(consumerSignups.map(r => [r.day, r.count]));
  const contractorMap = Object.fromEntries(contractorSignups.map(r => [r.day, r.count]));
  const revenueMap = Object.fromEntries(revenueTimeSeries.map(r => [r.day, r.revenue_cents]));

  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const userGrowthSeries = days.map(day => ({
    day: day.slice(5),
    consumers: consumerMap[day] ?? 0,
    contractors: contractorMap[day] ?? 0,
  }));

  const revenueSeries = days.map(day => ({
    day: day.slice(5),
    revenue: ((revenueMap[day] ?? 0) / 100),
  }));

  // ── LTV & Churn ─────────────────────────────────────────────
  // Total consumers who completed at least 1 job
  const consumersWithCompletedJobs = (await db.prepare(`
    SELECT COUNT(DISTINCT j.consumer_id) as c
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
  `).get() as { c: number }).c;

  const customerLTV = consumersWithCompletedJobs > 0
    ? Math.round(totalRevAllTime / consumersWithCompletedJobs)
    : 0;

  // Churn: users inactive 30+ days
  const inactiveUsers = (await db.prepare(`
    SELECT COUNT(*) as c FROM users
    WHERE id NOT IN (
      SELECT consumer_id FROM jobs WHERE created_at >= datetime('now', '-30 days')
      UNION
      SELECT contractor_id FROM bids WHERE created_at >= datetime('now', '-30 days')
    )
  `).get() as { c: number }).c;

  const churnRate = totalUsers > 0 ? Math.round((inactiveUsers / totalUsers) * 100) : 0;

  // Repeat client rate: clients with 2+ jobs
  const totalClients = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'consumer'").get() as { c: number }).c;
  const repeatClients = (await db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT consumer_id FROM jobs GROUP BY consumer_id HAVING COUNT(*) >= 2
    )
  `).get() as { c: number }).c;

  const repeatClientRate = totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;

  // Contractor utilization
  const totalContractors = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'contractor'").get() as { c: number }).c;
  const activeContractors = (await db.prepare(
    "SELECT COUNT(DISTINCT contractor_id) as c FROM bids WHERE status = 'accepted'"
  ).get() as { c: number }).c;

  const contractorUtilization = totalContractors > 0
    ? Math.round((activeContractors / totalContractors) * 100)
    : 0;

  // ── Time-to-Completion Stats ────────────────────────────────
  // Avg time from job posted to first bid (hours)
  const avgTimeToFirstBid = (await db.prepare(`
    SELECT AVG(first_bid_hours) as avg_hours FROM (
      SELECT
        (julianday(MIN(b.created_at)) - julianday(j.created_at)) * 24 as first_bid_hours
      FROM jobs j
      JOIN bids b ON b.job_id = j.id
      GROUP BY j.id
    )
  `).get() as { avg_hours: number | null }).avg_hours ?? 0;

  // Avg time from job posted to bid accepted (hours)
  const avgTimeToAccepted = (await db.prepare(`
    SELECT AVG(accept_hours) as avg_hours FROM (
      SELECT
        (julianday(b.created_at) - julianday(j.created_at)) * 24 as accept_hours
      FROM jobs j
      JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    )
  `).get() as { avg_hours: number | null }).avg_hours ?? 0;

  // Avg time from bid accepted to job completed (hours)
  const avgTimeToCompleted = (await db.prepare(`
    SELECT AVG(complete_hours) as avg_hours FROM (
      SELECT
        (julianday(j.updated_at) - julianday(b.created_at)) * 24 as complete_hours
      FROM jobs j
      JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE j.status = 'completed'
    )
  `).get() as { avg_hours: number | null }).avg_hours ?? 0;

  return NextResponse.json({
    funnel: {
      jobsPosted,
      jobsWithBids,
      jobsAccepted,
      jobsCompleted,
      jobsPaid,
    },
    revenue: {
      totalAllTime: totalRevAllTime,
      totalLast30: totalRevLast30,
      totalLast7: totalRevLast7,
      avgPerJob: avgRevenuePerJob,
      timeSeries: revenueSeries,
      byCategory: revenueByCat,
    },
    userGrowth: {
      totalUsers,
      activeUsers,
      retentionRate,
      timeSeries: userGrowthSeries,
    },
    ltv: {
      customerLTV,
      churnRate,
      repeatClientRate,
      contractorUtilization,
      totalClients,
      totalContractors,
      activeContractors,
      repeatClients,
    },
    timeStats: {
      avgTimeToFirstBidHours: Math.round(avgTimeToFirstBid * 10) / 10,
      avgTimeToAcceptedHours: Math.round(avgTimeToAccepted * 10) / 10,
      avgTimeToCompletedHours: Math.round(avgTimeToCompleted * 10) / 10,
    },
  });
}
