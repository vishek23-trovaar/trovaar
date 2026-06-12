import { NextRequest, NextResponse } from "next/server";
import { stripe, calculateFees } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { v4 as uuidv4 } from "uuid";

// POST /api/stripe/payment-intent
// Called by consumer after accepting a bid to initiate payment.
//
// Pricing model (see calculateFees): the consumer is charged the bid × 1.2;
// the contractor receives their full bid via Connect transfer; the 20% markup
// is the platform fee.
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
    price: number; contractor_id: string; credit_applied_cents: number | null;
    stripe_account_id: string | null; stripe_onboarding_complete: number;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found or not authorized" }, { status: 404 });
  if (job.payment_status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 409 });

  const { chargeCents, platformFeeCents, contractorPayoutCents } = calculateFees(job.price);

  if (job.payment_intent_id) {
    // Return existing intent client secret
    const existing = await stripe.paymentIntents.retrieve(job.payment_intent_id);
    return NextResponse.json({ clientSecret: existing.client_secret, platformFeeCents });
  }

  // Hard requirement: the contractor must have completed Stripe Connect
  // onboarding before money moves. Without transfer_data the charge would
  // land in the PLATFORM account with no payout path, no record in earnings,
  // and no error — the contractor would simply never get paid.
  if (!job.stripe_account_id || !job.stripe_onboarding_complete) {
    await db.prepare(
      "INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      uuidv4(), job.contractor_id, "stripe_onboarding_required",
      "Action needed: finish payment setup 💳",
      `A consumer tried to pay for "${job.title}" but your payout account isn't set up yet. Complete Stripe onboarding in your profile so you can get paid.`,
      job.id
    );
    return NextResponse.json(
      { error: "The contractor hasn't finished setting up payouts yet. They've been notified — please try again soon." },
      { status: 409 }
    );
  }

  // Apply referral credits, capped at the platform's margin so the
  // contractor's payout is never reduced (the platform absorbs the credit).
  // The balance is NOT decremented here — that happens in the Stripe webhook
  // on payment_intent.succeeded, so failed/abandoned payments don't burn
  // credits. credit_applied_cents on the job records the planned deduction.
  const user = await db.prepare("SELECT credit_balance_cents FROM users WHERE id = ?")
    .get(payload.userId) as { credit_balance_cents: number } | undefined;
  const creditApplied = Math.min(
    Math.max(0, Number(user?.credit_balance_cents ?? 0)),
    platformFeeCents
  );

  const amountCents = chargeCents - creditApplied;
  const feeAfterCredit = platformFeeCents - creditApplied;

  // Recover forfeited completion bonds from this contractor's payout.
  // Bonds are never charged to a card (no saved payment method), so the only
  // enforcement point is docking the next payout: each whole bond that fits
  // within the contractor's payout is added to the application fee. Bonds are
  // marked recovered in the webhook once the payment actually succeeds.
  let bondDockCents = 0;
  const bondIds: string[] = [];
  try {
    const forfeited = await db.prepare(
      "SELECT id, amount_cents FROM completion_bonds WHERE contractor_id = ? AND status = 'forfeited' AND recovered_at IS NULL ORDER BY created_at ASC"
    ).all(job.contractor_id) as Array<{ id: string; amount_cents: number }>;
    for (const bond of forfeited) {
      if (bondDockCents + bond.amount_cents > contractorPayoutCents) break;
      bondDockCents += bond.amount_cents;
      bondIds.push(bond.id);
    }
  } catch { /* recovered_at column may not exist yet on older DBs — skip docking */ }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    capture_method: "manual",
    metadata: {
      jobId: job.id,
      contractorId: job.contractor_id,
      creditAppliedCents: String(creditApplied),
      bondIds: bondIds.join(","),
    },
    description: `Trovaar: ${job.title}`,
    application_fee_amount: feeAfterCredit + bondDockCents,
    transfer_data: { destination: job.stripe_account_id },
  });

  await db.prepare(
    "UPDATE jobs SET payment_intent_id = ?, platform_fee_cents = ?, credit_applied_cents = ? WHERE id = ?"
  ).run(intent.id, platformFeeCents, creditApplied, jobId);

  return NextResponse.json({
    clientSecret: intent.client_secret,
    chargeCents: amountCents,
    platformFeeCents,
    creditAppliedCents: creditApplied,
    contractorPayoutCents,
  });
}
