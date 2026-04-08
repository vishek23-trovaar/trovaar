import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";

// GET — list change orders for a job
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const orders = await db.prepare(`
    SELECT co.*, u.name as contractor_name
    FROM change_orders co
    JOIN users u ON u.id = co.contractor_id
    WHERE co.job_id = ?
    ORDER BY co.created_at DESC
  `).all(id);

  return NextResponse.json({ change_orders: orders });
}

// POST — contractor submits a change order
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare(`
    SELECT j.*, b.id as bid_id, b.contractor_id
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as { consumer_id: string; bid_id: string; contractor_id: string; status: string } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found or no accepted bid" }, { status: 404 });
  if (payload.userId !== job.contractor_id) {
    return NextResponse.json({ error: "Only the assigned contractor can submit change orders" }, { status: 403 });
  }
  if (!["accepted", "in_progress"].includes(job.status)) {
    return NextResponse.json({ error: "Change orders can only be submitted on active jobs" }, { status: 400 });
  }

  const body = await request.json();
  const { title, description, additional_cost_cents, materials_json } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const orderId = randomUUID();

  db.prepare(`
    INSERT INTO change_orders (id, job_id, bid_id, contractor_id, title, description, additional_cost_cents, materials_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(orderId, id, job.bid_id, payload.userId, title.trim(), description.trim(), additional_cost_cents || 0, materials_json || null, now, now);

  // Notify consumer
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
    VALUES (?, ?, 'change_order', 'Change Order Submitted', 'Your contractor has submitted a change order that requires your approval before work continues.', ?, ?)
  `).run(randomUUID(), job.consumer_id, id, now);

  const order = await db.prepare("SELECT * FROM change_orders WHERE id = ?").get(orderId);
  return NextResponse.json({ change_order: order }, { status: 201 });
}

// PATCH — consumer approves or rejects
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as { consumer_id: string } | undefined;
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (payload.userId !== job.consumer_id) {
    return NextResponse.json({ error: "Only the consumer can approve/reject change orders" }, { status: 403 });
  }

  const { change_order_id, action, rejection_reason } = await request.json();
  if (!change_order_id || !["approved", "rejected"].includes(action)) {
    return NextResponse.json({ error: "change_order_id and action (approved/rejected) required" }, { status: 400 });
  }

  const order = await db.prepare("SELECT * FROM change_orders WHERE id = ? AND job_id = ?").get(change_order_id, id) as {
    contractor_id: string;
    additional_cost_cents: number;
    title: string;
  } | undefined;
  if (!order) return NextResponse.json({ error: "Change order not found" }, { status: 404 });

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE change_orders SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?
  `).run(action, action === "rejected" ? (rejection_reason || null) : null, now, change_order_id);

  // Notify contractor
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
    VALUES (?, ?, 'change_order_response', ?, ?, ?, ?)
  `).run(
    randomUUID(),
    order.contractor_id,
    action === "approved" ? "Change Order Approved ✅" : "Change Order Rejected",
    action === "approved"
      ? `The consumer approved your change order: "${order.title}". You may proceed.`
      : `The consumer rejected your change order: "${order.title}". ${rejection_reason ? `Reason: ${rejection_reason}` : ""}`,
    id,
    now
  );

  return NextResponse.json({ message: `Change order ${action}` });
}
