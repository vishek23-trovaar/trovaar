import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const invoice = await db.prepare(`
    SELECT i.*,
           j.title as job_title, j.category as job_category, j.description as job_description,
           j.location as job_location, j.completed_at,
           cu.name as consumer_name, cu.email as consumer_email, cu.phone as consumer_phone,
           cu.location as consumer_location,
           co.name as contractor_name, co.email as contractor_email, co.phone as contractor_phone,
           co.location as contractor_location
    FROM invoices i
    JOIN jobs j ON i.job_id = j.id
    JOIN users cu ON i.consumer_id = cu.id
    JOIN users co ON i.contractor_id = co.id
    WHERE i.id = ?
      AND (i.contractor_id = ? OR i.consumer_id = ?)
  `).get(id, payload.userId, payload.userId) as Record<string, unknown> | undefined;

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  // Verify ownership
  const existing = await db.prepare(
    "SELECT id, status FROM invoices WHERE id = ? AND contractor_id = ?"
  ).get(id, payload.userId) as { id: number; status: string } | undefined;

  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = await request.json();
  const { labor_cents, materials_json, notes, due_date, tax_cents } = body;

  // Recalculate totals if amounts changed
  let laborAmount = labor_cents;
  let materialsStr = materials_json;
  let taxAmount = tax_cents;

  if (laborAmount === undefined || materialsStr === undefined) {
    const current = await db.prepare("SELECT labor_cents, materials_json, tax_cents FROM invoices WHERE id = ?").get(id) as {
      labor_cents: number; materials_json: string; tax_cents: number;
    };
    if (laborAmount === undefined) laborAmount = current.labor_cents;
    if (materialsStr === undefined) materialsStr = current.materials_json;
    if (taxAmount === undefined) taxAmount = current.tax_cents;
  }

  let materialsTotal = 0;
  try {
    const items = JSON.parse(materialsStr || "[]");
    materialsTotal = items.reduce((sum: number, item: { cost_cents?: number; total_cents?: number }) => {
      return sum + (item.cost_cents || item.total_cents || 0);
    }, 0);
  } catch { /* ignore */ }

  const subtotal = laborAmount + materialsTotal;
  const platformFee = Math.round(subtotal * 0.10);
  const total = subtotal + platformFee + (taxAmount || 0);

  await db.prepare(`
    UPDATE invoices SET
      labor_cents = ?, materials_json = ?, subtotal_cents = ?,
      platform_fee_cents = ?, tax_cents = ?, total_cents = ?,
      notes = COALESCE(?, notes), due_date = COALESCE(?, due_date)
    WHERE id = ? AND contractor_id = ?
  `).run(
    laborAmount, materialsStr, subtotal, platformFee, taxAmount || 0, total,
    notes ?? null, due_date ?? null, id, payload.userId
  );

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (body.action === "send") {
    const db = getDb();
  await initializeDatabase();
    const existing = await db.prepare(
      "SELECT id, status FROM invoices WHERE id = ? AND contractor_id = ?"
    ).get(id, payload.userId) as { id: number; status: string } | undefined;

    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").run(id);

    return NextResponse.json({ success: true, status: "sent" });
  }

  if (body.action === "mark_paid") {
    const db = getDb();
  await initializeDatabase();
    const existing = await db.prepare(
      "SELECT id, status FROM invoices WHERE id = ? AND contractor_id = ?"
    ).get(id, payload.userId) as { id: number; status: string } | undefined;

    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await db.prepare("UPDATE invoices SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(id);

    return NextResponse.json({ success: true, status: "paid" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
