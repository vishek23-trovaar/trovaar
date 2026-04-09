import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "contractor") {
      return NextResponse.json({ error: "Contractor access required" }, { status: 403 });
    }

    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);

    const db = getDb();
  await initializeDatabase();

    // Get or create tax record for this year
    let taxRecord = await db.prepare(
      "SELECT * FROM tax_records WHERE contractor_id = ? AND tax_year = ?"
    ).get(payload.userId, year) as {
      id: number;
      contractor_id: string;
      tax_year: number;
      total_earned_cents: number;
      total_jobs: number;
      form_generated: number;
      form_generated_at: string | null;
      contractor_name: string | null;
      contractor_email: string | null;
      contractor_address: string | null;
      ein_or_ssn_last4: string | null;
    } | undefined;

    // Calculate earnings from completed jobs
    const earnings = await db.prepare(`
      SELECT
        COALESCE(SUM(b.price), 0) as total_cents,
        COUNT(*) as job_count
      FROM jobs j
      JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE b.contractor_id = ?
        AND j.status = 'completed'
        AND strftime('%Y', j.completed_at) = ?
    `).get(payload.userId, String(year)) as { total_cents: number; job_count: number };

    // Monthly breakdown
    const monthlyBreakdown = await db.prepare(`
      SELECT
        CAST(strftime('%m', j.completed_at) AS INTEGER) as month,
        COALESCE(SUM(b.price), 0) as earned_cents,
        COUNT(*) as jobs
      FROM jobs j
      JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE b.contractor_id = ?
        AND j.status = 'completed'
        AND strftime('%Y', j.completed_at) = ?
      GROUP BY strftime('%m', j.completed_at)
      ORDER BY month
    `).all(payload.userId, String(year)) as Array<{ month: number; earned_cents: number; jobs: number }>;

    // Fill in all 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyBreakdown.find((m) => m.month === i + 1);
      return {
        month: i + 1,
        earned_cents: found?.earned_cents || 0,
        jobs: found?.jobs || 0,
      };
    });

    // Platform fee estimate (20%)
    const platformFeeCents = Math.round(earnings.total_cents * 0.2);
    const netEarningsCents = earnings.total_cents - platformFeeCents;

    return NextResponse.json({
      year,
      totalEarnedCents: earnings.total_cents,
      netEarningsCents,
      platformFeeCents,
      totalJobs: earnings.job_count,
      monthlyBreakdown: months,
      threshold1099: 60000, // $600 in cents
      meetsThreshold: netEarningsCents >= 60000,
      formGenerated: taxRecord?.form_generated === 1,
      formGeneratedAt: taxRecord?.form_generated_at || null,
      taxInfo: taxRecord ? {
        name: taxRecord.contractor_name,
        email: taxRecord.contractor_email,
        address: taxRecord.contractor_address,
        einOrSsnLast4: taxRecord.ein_or_ssn_last4,
      } : null,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /contractor/tax error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "contractor") {
      return NextResponse.json({ error: "Contractor access required" }, { status: 403 });
    }

    const { year, name, email, address, einOrSsnLast4 } = await request.json();
    const taxYear = year || new Date().getFullYear();

    const db = getDb();
  await initializeDatabase();

    // Upsert tax info
    const existing = await db.prepare(
      "SELECT id FROM tax_records WHERE contractor_id = ? AND tax_year = ?"
    ).get(payload.userId, taxYear);

    if (existing) {
      await db.prepare(`
        UPDATE tax_records
        SET contractor_name = ?, contractor_email = ?, contractor_address = ?, ein_or_ssn_last4 = ?
        WHERE contractor_id = ? AND tax_year = ?
      `).run(name || null, email || null, address || null, einOrSsnLast4 || null, payload.userId, taxYear);
    } else {
      await db.prepare(`
        INSERT INTO tax_records (contractor_id, tax_year, contractor_name, contractor_email, contractor_address, ein_or_ssn_last4)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(payload.userId, taxYear, name || null, email || null, address || null, einOrSsnLast4 || null);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "PUT /contractor/tax error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
