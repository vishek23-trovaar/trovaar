import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminLogger as logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { error: adminError } = await requireAdmin(request);
    if (adminError) return adminError;

    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);

    const db = getDb();
  await initializeDatabase();

    // All contractors with earnings for this year
    const contractors = await db.prepare(`
      SELECT
        u.id as contractor_id,
        u.name,
        u.email,
        COALESCE(SUM(b.price), 0) as gross_earned_cents,
        COUNT(j.id) as total_jobs,
        tr.form_generated,
        tr.form_generated_at,
        tr.contractor_name as tax_name,
        tr.contractor_address as tax_address,
        tr.ein_or_ssn_last4
      FROM users u
      JOIN bids b ON b.contractor_id = u.id AND b.status = 'accepted'
      JOIN jobs j ON j.id = b.job_id AND j.status = 'completed' AND TO_CHAR(j.completed_at, 'YYYY') = ?
      LEFT JOIN tax_records tr ON tr.contractor_id = u.id AND tr.tax_year = ?
      WHERE u.role = 'contractor'
      GROUP BY u.id, u.name, u.email, tr.form_generated, tr.form_generated_at, tr.contractor_name, tr.contractor_address, tr.ein_or_ssn_last4
      HAVING COALESCE(SUM(b.price), 0) >= 60000
      ORDER BY gross_earned_cents DESC
    `).all(String(year), year) as Array<{
      contractor_id: string;
      name: string;
      email: string;
      gross_earned_cents: number;
      total_jobs: number;
      form_generated: number | null;
      form_generated_at: string | null;
      tax_name: string | null;
      tax_address: string | null;
      ein_or_ssn_last4: string | null;
    }>;

    // Summary stats
    const totalContractors = contractors.length;
    const totalEarningsCents = contractors.reduce((sum, c) => sum + c.gross_earned_cents, 0);
    const formsGenerated = contractors.filter((c) => c.form_generated === 1).length;
    const formsPending = totalContractors - formsGenerated;

    return NextResponse.json({
      year,
      summary: {
        totalContractors,
        totalEarningsCents,
        formsGenerated,
        formsPending,
      },
      contractors: contractors.map((c) => ({
        contractorId: c.contractor_id,
        name: c.name,
        email: c.email,
        grossEarnedCents: c.gross_earned_cents,
        netEarnedCents: c.gross_earned_cents - Math.round(c.gross_earned_cents * 0.2),
        platformFeeCents: Math.round(c.gross_earned_cents * 0.2),
        totalJobs: c.total_jobs,
        formGenerated: c.form_generated === 1,
        formGeneratedAt: c.form_generated_at,
        taxName: c.tax_name,
        taxAddress: c.tax_address,
        einOrSsnLast4: c.ein_or_ssn_last4,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "GET /admin/tax error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { contractorId, year } = await request.json();

    if (!contractorId || !year) {
      return NextResponse.json({ error: "contractorId and year are required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const now = new Date().toISOString();

    // Upsert with form_generated = 1
    const existing = await db.prepare(
      "SELECT id FROM tax_records WHERE contractor_id = ? AND tax_year = ?"
    ).get(contractorId, year);

    if (existing) {
      await db.prepare(`
        UPDATE tax_records SET form_generated = 1, form_generated_at = ? WHERE contractor_id = ? AND tax_year = ?
      `).run(now, contractorId, year);
    } else {
      // Calculate totals
      const earnings = await db.prepare(`
        SELECT
          COALESCE(SUM(b.price), 0) as total_cents,
          COUNT(*) as job_count
        FROM jobs j
        JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
        WHERE b.contractor_id = ?
          AND j.status = 'completed'
          AND strftime('%Y', j.completed_at) = ?
      `).get(contractorId, String(year)) as { total_cents: number; job_count: number };

      const user = await db.prepare("SELECT name, email FROM users WHERE id = ?").get(contractorId) as { name: string; email: string } | undefined;

      await db.prepare(`
        INSERT INTO tax_records (contractor_id, tax_year, total_earned_cents, total_jobs, form_generated, form_generated_at, contractor_name, contractor_email)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `).run(contractorId, year, earnings.total_cents, earnings.job_count, now, user?.name || null, user?.email || null);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "POST /admin/tax error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
