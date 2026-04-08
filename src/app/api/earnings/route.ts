import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/earnings — contractor earnings summary
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const contractorId = payload.userId;

  // Completed jobs where this contractor was accepted
  const completedJobs = await db.prepare(`
    SELECT
      j.id,
      j.title,
      j.category,
      j.status,
      j.payment_status,
      j.platform_fee_cents,
      j.completed_at,
      b.price as bid_amount_cents,
      b.labor_cents,
      b.materials_json
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.contractor_id = ? AND b.status = 'accepted'
    WHERE j.status = 'completed'
    ORDER BY j.completed_at DESC
  `).all(contractorId) as Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    payment_status: string;
    platform_fee_cents: number | null;
    completed_at: string | null;
    bid_amount_cents: number;
    labor_cents: number | null;
    materials_json: string | null;
  }>;

  // Tips received — uses the tips table schema (consumer_id / contractor_id columns)
  const tips = await db.prepare(`
    SELECT t.*, j.title as job_title, u.name as tipper_name
    FROM tips t
    JOIN jobs j ON j.id = t.job_id
    JOIN users u ON u.id = t.consumer_id
    WHERE t.contractor_id = ?
    ORDER BY t.created_at DESC
  `).all(contractorId) as Array<{
    id: string;
    amount_cents: number;
    message: string | null;
    created_at: string;
    job_title: string;
    tipper_name: string;
  }>;

  // Pending jobs (accepted, not yet completed)
  const pendingJobs = await db.prepare(`
    SELECT j.id, j.title, j.category, j.payment_status, b.price as bid_amount_cents
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.contractor_id = ? AND b.status = 'accepted'
    WHERE j.status = 'accepted'
  `).all(contractorId) as Array<{
    id: string;
    title: string;
    category: string;
    payment_status: string;
    bid_amount_cents: number;
  }>;

  // Aggregate totals
  const totalEarnedCents = completedJobs.reduce((sum, j) => {
    const fee = j.platform_fee_cents ?? 0;
    return sum + j.bid_amount_cents - fee;
  }, 0);

  const totalTipsCents = tips.reduce((sum, t) => sum + t.amount_cents, 0);

  const pendingCents = pendingJobs.reduce((sum, j) => sum + j.bid_amount_cents, 0);

  // Monthly breakdown (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyMap: Record<string, number> = {};
  for (const job of completedJobs) {
    if (!job.completed_at) continue;
    const d = new Date(job.completed_at);
    if (d < sixMonthsAgo) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const net = job.bid_amount_cents - (job.platform_fee_cents ?? 0);
    monthlyMap[key] = (monthlyMap[key] ?? 0) + net;
  }

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cents]) => ({ month, cents }));

  // Mobile-app-compatible response shape
  // All amounts are in cents; the mobile app divides by 100 for display.
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const thisWeek = completedJobs
    .filter((j) => j.completed_at && new Date(j.completed_at) >= weekAgo)
    .reduce((sum, j) => sum + j.bid_amount_cents - (j.platform_fee_cents ?? 0), 0);

  const thisMonth = completedJobs
    .filter((j) => j.completed_at && new Date(j.completed_at) >= monthAgo)
    .reduce((sum, j) => sum + j.bid_amount_cents - (j.platform_fee_cents ?? 0), 0);

  const thisYear = completedJobs
    .filter((j) => j.completed_at && new Date(j.completed_at) >= yearAgo)
    .reduce((sum, j) => sum + j.bid_amount_cents - (j.platform_fee_cents ?? 0), 0);

  // Weekly chart data (last 7 days, indexed 0=oldest … 6=today)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStr = day.toISOString().split("T")[0];
    return completedJobs
      .filter((j) => j.completed_at?.startsWith(dayStr))
      .reduce((sum, j) => sum + j.bid_amount_cents - (j.platform_fee_cents ?? 0), 0);
  });

  const items = completedJobs.map((j) => ({
    job_title: j.title,
    amount: j.bid_amount_cents - (j.platform_fee_cents ?? 0),
    date: j.completed_at ?? "",
    category: j.category,
  }));

  return NextResponse.json({
    // Mobile-compatible fields
    total: totalEarnedCents,
    thisWeek,
    thisMonth,
    thisYear,
    weeklyData,
    items,
    // Legacy fields kept for backward compatibility
    totalEarnedCents,
    totalTipsCents,
    pendingCents,
    completedJobCount: completedJobs.length,
    recentJobs: completedJobs.slice(0, 10),
    recentTips: tips.slice(0, 5),
    monthly,
  });
}
