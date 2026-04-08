import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { stripe } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";

// POST /api/stripe/tip — create a tip payment intent
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "consumer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(request, { maxRequests: 10, windowMs: 60 * 1000, keyPrefix: "stripe-tip" });
  if (rl) return rl;

  const { jobId, amountCents } = await request.json();
  if (!jobId || !amountCents || amountCents < 100) {
    return NextResponse.json({ error: "jobId and amountCents (min $1) are required" }, { status: 400 });
  }
  if (amountCents > 50000) {
    return NextResponse.json({ error: "Tip cannot exceed $500" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare(`
    SELECT j.*, b.contractor_id, cp.stripe_account_id, cp.stripe_onboarding_complete
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    LEFT JOIN contractor_profiles cp ON cp.user_id = b.contractor_id
    WHERE j.id = ? AND j.consumer_id = ? AND j.status = 'completed'
  `).get(jobId, payload.userId) as {
    id: string; title: string; contractor_id: string;
    stripe_account_id: string | null; stripe_onboarding_complete: number;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found or not completed" }, { status: 404 });

  const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
    amount: amountCents,
    currency: "usd",
    metadata: { jobId: job.id, contractorId: job.contractor_id, type: "tip" },
    description: `Tip for: ${job.title}`,
  };

  if (job.stripe_account_id && job.stripe_onboarding_complete) {
    intentParams.transfer_data = { destination: job.stripe_account_id };
  }

  const intent = await stripe.paymentIntents.create(intentParams);

  // Record tip (payment confirmation happens in webhook)
  const tipId = uuidv4();
  db.prepare(
    "INSERT INTO tips (id, job_id, consumer_id, contractor_id, amount_cents, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(tipId, jobId, payload.userId, job.contractor_id, amountCents, intent.id);

  return NextResponse.json({ clientSecret: intent.client_secret, tipId });
}
