import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { stripeLogger as logger } from "@/lib/logger";

// POST /api/stripe/identity — create a Stripe Identity VerificationSession
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  const profile = await db.prepare(
    "SELECT verification_status FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { verification_status: string } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
  }

  // Already verified — no need to re-verify
  if (profile.verification_status === "approved") {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  try {
    const origin = request.headers.get("origin") || "http://localhost:3001";

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { user_id: payload.userId },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: `${origin}/contractor/profile?verification=complete`,
    });

    // Mark as pending while Stripe processes
    await db.prepare(
      "UPDATE contractor_profiles SET verification_status = 'pending', id_document_status = 'pending' WHERE user_id = ?"
    ).run(payload.userId);

    logger.info({ userId: payload.userId, sessionId: session.id }, "Stripe Identity session created");

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    logger.error({ err, userId: payload.userId }, "Failed to create Stripe Identity session");
    return NextResponse.json({ error: "Failed to start identity verification" }, { status: 500 });
  }
}

// GET /api/stripe/identity — check current verification status
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  const profile = await db.prepare(
    "SELECT verification_status, id_document_status FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { verification_status: string; id_document_status: string } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    verification_status: profile.verification_status,
    id_document_status: profile.id_document_status,
  });
}
