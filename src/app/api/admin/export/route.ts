import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminLogger as logger } from "@/lib/logger";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h] ?? "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(",")
    )
  ];
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const type = new URL(request.url).searchParams.get("type") ?? "users";
  const db = getDb();
  await initializeDatabase();

  let rows: Record<string, unknown>[] = [];
  let filename = "export.csv";

  try {
    if (type === "users") {
      rows = await db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, u.account_number,
          COUNT(DISTINCT j.id) as total_jobs
        FROM users u
        LEFT JOIN jobs j ON j.consumer_id = u.id
        GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at, u.account_number
        ORDER BY u.created_at DESC
      `).all() as Record<string, unknown>[];
      filename = "users.csv";
    } else if (type === "consumers") {
      rows = await db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.created_at, u.account_number,
          COUNT(DISTINCT j.id) as jobs_posted,
          COALESCE(SUM(b.price * 1.20), 0) as total_spent_cents
        FROM users u
        LEFT JOIN jobs j ON j.consumer_id = u.id
        LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
        WHERE u.role = 'consumer'
        GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.account_number
        ORDER BY u.created_at DESC
      `).all() as Record<string, unknown>[];
      filename = "consumers.csv";
    } else if (type === "contractors") {
      rows = await db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.created_at, u.account_number,
          cp.rating, cp.completion_count as completed_jobs, cp.insurance_verified,
          COALESCE(SUM(b.price), 0) as total_earned_cents
        FROM users u
        LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
        LEFT JOIN bids b ON b.contractor_id = u.id AND b.status = 'accepted'
        WHERE u.role = 'contractor'
        GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.account_number, cp.rating, cp.completion_count, cp.insurance_verified
        ORDER BY u.created_at DESC
      `).all() as Record<string, unknown>[];
      filename = "contractors.csv";
    } else if (type === "jobs") {
      rows = await db.prepare(`
        SELECT j.id, j.title, j.category, j.status, j.urgency, j.location,
          j.created_at, u.name as consumer_name, u.email as consumer_email,
          COUNT(DISTINCT b.id) as bid_count,
          MAX(CASE WHEN b.status = 'accepted' THEN b.price END) as accepted_price
        FROM jobs j
        JOIN users u ON u.id = j.consumer_id
        LEFT JOIN bids b ON b.job_id = j.id
        GROUP BY j.id, j.title, j.category, j.status, j.urgency, j.location, j.created_at, u.name, u.email
        ORDER BY j.created_at DESC
      `).all() as Record<string, unknown>[];
      filename = "jobs.csv";
    } else if (type === "revenue") {
      rows = await db.prepare(`
        SELECT
          TO_CHAR(b.created_at, 'YYYY-MM-DD') as date,
          COUNT(*) as bids_accepted,
          SUM(b.price) as contractor_revenue_cents,
          SUM(b.price * 1.20) as client_charged_cents,
          SUM(b.price * 0.20) as platform_revenue_cents
        FROM bids b WHERE b.status = 'accepted'
        GROUP BY TO_CHAR(b.created_at, 'YYYY-MM-DD')
        ORDER BY date DESC
      `).all() as Record<string, unknown>[];
      filename = "revenue.csv";
    }
  } catch (err) {
    logger.error({ err }, "Export error");
    return NextResponse.json({ error: "Export failed", detail: String(err) }, { status: 500 });
  }

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
