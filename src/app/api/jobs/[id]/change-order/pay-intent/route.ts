import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

// GET /api/jobs/[id]/change-order/pay-intent?order_id=...
// Returns the client secret for an approved-but-unpaid change order so the
// consumer can complete payment on the pay page. The intent itself is created
// at approval time (see ../route.ts PATCH).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = new URL(request.url).searchParams.get("order_id");
  if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare("SELECT consumer_id FROM jobs WHERE id = ?").get(id) as { consumer_id: string } | undefined;
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.consumer_id !== payload.userId) {
    return NextResponse.json({ error: "Only the job owner can pay for change orders" }, { status: 403 });
  }

  const order = await db.prepare(
    "SELECT payment_intent_id, payment_status, status, title FROM change_orders WHERE id = ? AND job_id = ?"
  ).get(orderId, id) as {
    payment_intent_id: string | null; payment_status: string; status: string; title: string;
  } | undefined;

  if (!order) return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  if (order.status !== "approved" || !order.payment_intent_id) {
    return NextResponse.json({ error: "Change order is not awaiting payment" }, { status: 409 });
  }
  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "Change order is already paid" }, { status: 409 });
  }

  const intent = await stripe.paymentIntents.retrieve(order.payment_intent_id);
  return NextResponse.json({
    clientSecret: intent.client_secret,
    amountCents: intent.amount,
    title: order.title,
  });
}
