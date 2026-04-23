import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { stripeLogger as logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  if (!STRIPE_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "production") {
      logger.error("STRIPE_WEBHOOK_SECRET not set in production — rejecting webhook");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    logger.warn("STRIPE_WEBHOOK_SECRET not set — skipping webhook signature verification in development");
    return NextResponse.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Wrap all DB operations in a single try/catch so a partial failure
  // returns 500 and Stripe will retry the event (idempotent via payment_intent_id / account_id lookups).
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as { id: string; metadata: { jobId?: string; contractorId?: string } };
        const { jobId, contractorId } = intent.metadata;
        if (jobId) {
          await db.prepare("UPDATE jobs SET payment_status = 'paid' WHERE payment_intent_id = ?").run(intent.id);
          // Notify consumer
          const job = await db.prepare("SELECT consumer_id, title FROM jobs WHERE id = ?").get(jobId) as { consumer_id: string; title: string } | undefined;
          if (job) {
            await db.prepare("INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)")
              .run(uuidv4(), job.consumer_id, "payment_confirmed", "Payment confirmed ✅",
                `Your payment for "${job.title}" has been received and is held securely.`, jobId);
          }
          if (contractorId) {
            await db.prepare("INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)")
              .run(uuidv4(), contractorId, "payment_confirmed", "Payment received 💰",
                `The consumer has paid for "${job?.title}". Complete the job to receive your payout.`, jobId);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as { id: string; metadata: { jobId?: string } };
        const { jobId } = intent.metadata;
        if (jobId) {
          await db.prepare("UPDATE jobs SET payment_status = 'failed' WHERE payment_intent_id = ?").run(intent.id);
          const job = await db.prepare("SELECT consumer_id, title FROM jobs WHERE id = ?").get(jobId) as { consumer_id: string; title: string } | undefined;
          if (job) {
            await db.prepare("INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)")
              .run(uuidv4(), job.consumer_id, "payment_failed", "Payment failed ⚠️",
                `Payment for "${job.title}" failed. Please try again.`, jobId);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as { id: string; details_submitted: boolean; charges_enabled: boolean };
        if (account.details_submitted && account.charges_enabled) {
          await db.prepare("UPDATE contractor_profiles SET stripe_onboarding_complete = 1 WHERE stripe_account_id = ?")
            .run(account.id);
        }
        break;
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type, eventId: event.id }, "Webhook handler failed — returning 500 so Stripe retries");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
