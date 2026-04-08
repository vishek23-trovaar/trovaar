import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const db = getDb();
  await initializeDatabase();

  let query = `
    SELECT i.*, j.title as job_title, j.category as job_category,
           u.name as consumer_name, u.email as consumer_email
    FROM invoices i
    JOIN jobs j ON i.job_id = j.id
    JOIN users u ON i.consumer_id = u.id
    WHERE i.contractor_id = ?
  `;
  const params: unknown[] = [payload.userId];

  if (status) {
    query += " AND i.status = ?";
    params.push(status);
  }

  query += " ORDER BY i.created_at DESC";

  const invoices = await db.prepare(query).all(...params);

  // Compute stats
  const stats = await db.prepare(`
    SELECT
      COALESCE(SUM(total_cents), 0) as total_invoiced,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN total_cents ELSE 0 END), 0) as total_outstanding,
      COUNT(*) as count
    FROM invoices WHERE contractor_id = ?
  `).get(payload.userId) as Record<string, number>;

  return NextResponse.json({ invoices, stats });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { job_id, labor_cents, materials_json, notes, due_date } = body;

  if (!job_id) {
    return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify the job belongs to this contractor
  const job = await db.prepare(`
    SELECT j.id, j.consumer_id, b.price, b.labor_cents as bid_labor_cents, b.materials_json as bid_materials_json
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ? AND b.contractor_id = ?
  `).get(job_id, payload.userId) as {
    id: string; consumer_id: string; price: number;
    bid_labor_cents: number | null; bid_materials_json: string | null;
  } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found or not assigned to you" }, { status: 404 });
  }

  // Generate invoice number: INV-YYYY-NNNN
  const year = new Date().getFullYear();
  const lastInvoice = await db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`INV-${year}-%`) as { invoice_number: string } | undefined;

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split("-");
    nextNum = parseInt(parts[2], 10) + 1;
  }
  const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, "0")}`;

  const laborAmount = labor_cents ?? job.bid_labor_cents ?? job.price;
  const materialsStr = materials_json ?? job.bid_materials_json ?? "[]";

  let materialsTotal = 0;
  try {
    const items = JSON.parse(materialsStr);
    materialsTotal = items.reduce((sum: number, item: { cost_cents?: number; total_cents?: number }) => {
      return sum + (item.cost_cents || item.total_cents || 0);
    }, 0);
  } catch { /* ignore */ }

  const subtotal = laborAmount + materialsTotal;
  const platformFee = Math.round(subtotal * 0.10); // 10% platform fee
  const tax = 0;
  const total = subtotal + platformFee + tax;

  const dueDateValue = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const result = await db.prepare(`
    INSERT INTO invoices (invoice_number, job_id, contractor_id, consumer_id, labor_cents, materials_json, subtotal_cents, platform_fee_cents, tax_cents, total_cents, status, notes, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(
    invoiceNumber, job_id, payload.userId, job.consumer_id,
    laborAmount, materialsStr, subtotal, platformFee, tax, total,
    notes ?? null, dueDateValue
  );

  return NextResponse.json({
    invoice: {
      id: result.lastInsertRowid,
      invoice_number: invoiceNumber,
      job_id,
      contractor_id: payload.userId,
      consumer_id: job.consumer_id,
      labor_cents: laborAmount,
      materials_json: materialsStr,
      subtotal_cents: subtotal,
      platform_fee_cents: platformFee,
      tax_cents: tax,
      total_cents: total,
      status: "draft",
      notes: notes ?? null,
      due_date: dueDateValue,
    }
  }, { status: 201 });
}
