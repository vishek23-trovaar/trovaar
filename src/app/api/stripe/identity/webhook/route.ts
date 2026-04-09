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
      logger.error("STRIPE_WEBHOOK_SECRET not set in production — rejecting identity webhook");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    logger.warn("STRIPE_WEBHOOK_SECRET not set — skipping webhook signature verification in development");
    return NextResponse.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Identity webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  switch (event.type) {
    case "identity.verification_session.verified": {
      const session = event.data.object as { id: string; metadata: { user_id?: string } };
      const userId = session.metadata?.user_id;
      if (userId) {
        await db.prepare(
          "UPDATE contractor_profiles SET verification_status = 'approved', id_document_status = 'verified' WHERE user_id = ?"
        ).run(userId);

        // Notify the contractor
        db.prepare(
          "INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)"
        ).run(
          uuidv4(),
          userId,
          "verification_approved",
          "Identity Verified",
          "Your identity has been verified. You now have a verified badge on your profile."
        );

        logger.info({ userId, sessionId: session.id }, "Identity verification approved");
      }
      break;
    }

    case "identity.verification_session.requires_input": {
      const session = event.data.object as { id: string; metadata: { user_id?: string }; last_error?: { code?: string } };
      const userId = session.metadata?.user_id;
      if (userId) {
        await db.prepare(
          "UPDATE contractor_profiles SET verification_status = 'rejected', id_document_status = 'failed' WHERE user_id = ?"
        ).run(userId);

        const errorCode = session.last_error?.code || "unknown";
        db.prepare(
          "INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)"
        ).run(
          uuidv4(),
          userId,
          "verification_rejected",
          "Identity Verification Failed",
          `Your identity verification could not be completed (${errorCode}). Please try again.`
        );

        logger.info({ userId, sessionId: session.id, errorCode }, "Identity verification failed / requires input");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
