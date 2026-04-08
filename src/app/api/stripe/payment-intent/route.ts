import { NextRequest, NextResponse } from "next/server";
import { stripe, calculateFees } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";

// POST /api/stripe/payment-intent
// Called by consumer after accepting a bid to initiate payment
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(request, { maxRequests: 10, windowMs: 60 * 1000, keyPrefix: "stripe-payment-intent" });
  if (rl) return rl;

  const { jobId } = await request.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare(`
    SELECT j.*, b.price, b.contractor_id,
      cp.stripe_account_id, cp.stripe_onboarding_complete
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    LEFT JOIN contractor_profiles cp ON cp.user_id = b.contractor_id
    WHERE j.id = ? AND j.consumer_id = ?
  `).get(jobId, payload.userId) as {
    id: string; title: string; payment_status: string; payment_intent_id: string | null;
    price: number; contractor_id: string;
    stripe_account_id: string | null; stripe_onboarding_complete: number;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found or not authorized" }, { status: 404 });
  if (job.payment_status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 409 });
  if (job.payment_intent_id) {
    // Return existing intent client secret
    const existing = await stripe.paymentIntents.retrieve(job.payment_intent_id);
    return NextResponse.json({ clientSecret: existing.client_secret, platformFeeCents: calculateFees(job.price).platformFeeCents });
  }

  const { platformFeeCents, contractorPayoutCents } = calculateFees(job.price);

  const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
    amount: job.price,
    currency: "usd",
    capture_method: "manual",
    metadata: { jobId: job.id, contractorId: job.contractor_id },
    description: `Trovaar: ${job.title}`,
  };

  // If contractor has Stripe Connect, set up application fee + transfer
  if (job.stripe_account_id && job.stripe_onboarding_complete) {
    intentParams.application_fee_amount = platformFeeCents;
    intentParams.transfer_data = { destination: job.stripe_account_id };
  }

  const intent = await stripe.paymentIntents.create(intentParams);

  db.prepare("UPDATE jobs SET payment_intent_id = ?, platform_fee_cents = ? WHERE id = ?")
    .run(intent.id, platformFeeCents, jobId);

  return NextResponse.json({
    clientSecret: intent.client_secret,
    platformFeeCents,
    contractorPayoutCents,
  });
}
