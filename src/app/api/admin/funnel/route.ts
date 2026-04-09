import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();

  // Funnel: jobs posted → bids received → bid accepted → job completed
  const jobsPosted = (await db.prepare("SELECT COUNT(*) as c FROM jobs").get() as {c:number}).c;
  const jobsWithBids = (await db.prepare("SELECT COUNT(DISTINCT job_id) as c FROM bids").get() as {c:number}).c;
  const jobsAccepted = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status IN ('accepted','in_progress','completed')").get() as {c:number}).c;
  const jobsCompleted = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").get() as {c:number}).c;

  // Monthly retention: users who posted jobs in both the previous and current month
  const retentionRows = await db.prepare(`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(DISTINCT consumer_id) as active_clients
    FROM jobs
    WHERE created_at >= (NOW() - INTERVAL '6 months')
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `).all() as Array<{month: string; active_clients: number}>;

  // LTV: average total spend per consumer
  const ltvData = await db.prepare(`
    SELECT
      u.id,
      COALESCE(SUM(b.price * 1.20), 0) as lifetime_spend,
      COUNT(DISTINCT j.id) as total_jobs,
      MIN(j.created_at) as first_job,
      MAX(j.created_at) as last_job
    FROM users u
    LEFT JOIN jobs j ON j.consumer_id = u.id
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE u.role = 'consumer'
    GROUP BY u.id
  `).all() as Array<{id:string; lifetime_spend:number; total_jobs:number; first_job:string; last_job:string}>;

  const avgLTV = ltvData.length ? ltvData.reduce((s, r) => s + r.lifetime_spend, 0) / ltvData.length : 0;
  const avgJobsPerClient = ltvData.length ? ltvData.reduce((s, r) => s + r.total_jobs, 0) / ltvData.length : 0;
  const activeClients = ltvData.filter(r => r.last_job && new Date(r.last_job) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  const churnRate = ltvData.length ? ((ltvData.length - activeClients) / ltvData.length) * 100 : 0;

  // Top earning contractors
  const topContractors = await db.prepare(`
    SELECT u.name, u.id,
      COALESCE(SUM(b.price), 0) as earned_cents,
      COUNT(b.id) as jobs_won,
      cp.rating
    FROM users u
    LEFT JOIN bids b ON b.contractor_id = u.id AND b.status = 'accepted'
    LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
    WHERE u.role = 'contractor'
    GROUP BY u.id, u.name, cp.rating
    ORDER BY earned_cents DESC
    LIMIT 10
  `).all() as Array<{name:string; id:string; earned_cents:number; jobs_won:number; rating:number}>;

  // Category conversion rates
  const categoryFunnel = await db.prepare(`
    SELECT
      j.category,
      COUNT(*) as jobs_posted,
      COUNT(CASE WHEN j.status IN ('accepted','in_progress','completed') THEN 1 END) as jobs_converted,
      ROUND(COUNT(CASE WHEN j.status IN ('accepted','in_progress','completed') THEN 1 END) * 100.0 / COUNT(*), 1) as conversion_rate
    FROM jobs j
    GROUP BY j.category
    ORDER BY jobs_posted DESC
    LIMIT 10
  `).all() as Array<{category:string; jobs_posted:number; jobs_converted:number; conversion_rate:number}>;

  return NextResponse.json({
    funnel: { jobsPosted, jobsWithBids, jobsAccepted, jobsCompleted },
    retention: retentionRows,
    ltv: { avgLTV, avgJobsPerClient, activeClients, churnRate, totalClients: ltvData.length },
    topContractors,
    categoryFunnel,
  });
}
