import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();

  const totalUsers = (await db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  const totalConsumers = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'consumer'").get() as { c: number }).c;
  const totalContractors = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'contractor'").get() as { c: number }).c;
  const totalJobs = (await db.prepare("SELECT COUNT(*) as c FROM jobs").get() as { c: number }).c;
  const totalBids = (await db.prepare("SELECT COUNT(*) as c FROM bids").get() as { c: number }).c;

  // Platform revenue = sum of accepted bid prices * 0.20 (the platform's cut)
  const acceptedBidSum = (await db.prepare(
    "SELECT COALESCE(SUM(price), 0) as total FROM bids WHERE status = 'accepted'"
  ).get() as { total: number }).total;
  const totalRevenue = Math.round(acceptedBidSum * 0.20);

  // Jobs by status
  const jobStatusRows = await db.prepare(
    "SELECT status, COUNT(*) as count FROM jobs GROUP BY status"
  ).all() as Array<{ status: string; count: number }>;
  const jobsByStatus: Record<string, number> = {
    posted: 0, bidding: 0, accepted: 0, completed: 0, cancelled: 0,
  };
  for (const row of jobStatusRows) {
    jobsByStatus[row.status] = row.count;
  }

  // Recent signups — last 7 days
  const recentSignups = (await db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days')"
  ).get() as { c: number }).c;

  // Top 5 categories by job count
  const topCategories = await db.prepare(`
    SELECT category, COUNT(*) as count
    FROM jobs
    GROUP BY category
    ORDER BY count DESC
    LIMIT 5
  `).all() as Array<{ category: string; count: number }>;

  // Legacy fields kept for the existing admin/page.tsx
  const activeJobs = jobsByStatus.posted ?? 0;
  const completedJobs = jobsByStatus.completed ?? 0;
  const acceptedBids = (await db.prepare("SELECT COUNT(*) as c FROM bids WHERE status = 'accepted'").get() as { c: number }).c;
  const markupRevenueCents = totalRevenue;
  const newUsersLast30 = (await db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-30 days')"
  ).get() as { c: number }).c;

  // Recent jobs (last 10)
  const recentJobs = await db.prepare(`
    SELECT j.id, j.title, j.category, j.status, j.created_at, j.location,
           u.name as consumer_name
    FROM jobs j
    JOIN users u ON u.id = j.consumer_id
    ORDER BY j.created_at DESC
    LIMIT 10
  `).all() as Record<string, unknown>[];

  // Recent bids (last 10) with markup info
  const recentBids = await db.prepare(`
    SELECT b.id, b.price, b.status, b.created_at,
           j.title as job_title,
           u.name as contractor_name
    FROM bids b
    JOIN jobs j ON j.id = b.job_id
    JOIN users u ON u.id = b.contractor_id
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all() as Array<Record<string, unknown>>;

  const recentBidsWithMarkup = recentBids.map((b) => ({
    ...b,
    contractor_price: b.price,
    client_price: Math.ceil((b.price as number) * 1.20),
    markup_cents: Math.round((b.price as number) * 0.20),
  }));

  return NextResponse.json({
    // New canonical shape
    totalUsers,
    totalConsumers,
    totalContractors,
    totalJobs,
    totalBids,
    totalRevenue,
    jobsByStatus,
    recentSignups,
    topCategories,
    // Legacy fields (existing page uses these)
    activeJobs,
    completedJobs,
    acceptedBids,
    markupRevenueCents,
    newUsersLast30,
    recentJobs,
    recentBids: recentBidsWithMarkup,
  });
}
