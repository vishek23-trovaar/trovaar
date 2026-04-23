import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayloadVerified } from "@/lib/auth";
import { authLogger as logger } from "@/lib/logger";

/**
 * Records a contractor-onboarding skip so we don't re-nag them on every login.
 * Body: { step: "stripe" | "identity" }
 */
export async function POST(request: NextRequest) {
  const payload = await getAuthPayloadVerified(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Contractors only" }, { status: 403 });
  }

  let body: { step?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const step = body.step;
  if (step !== "stripe" && step !== "identity") {
    return NextResponse.json(
      { error: "step must be 'stripe' or 'identity'" },
      { status: 400 }
    );
  }

  const db = getDb();
  await initializeDatabase();

  const column =
    step === "stripe"
      ? "skip_stripe_onboarding_at"
      : "skip_identity_verification_at";

  try {
    // Column name is from a hardcoded whitelist above — safe to interpolate.
    await db
      .prepare(
        `UPDATE contractor_profiles SET ${column} = NOW() WHERE user_id = ?`
      )
      .run(payload.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId: payload.userId, step }, "Failed to record onboarding skip");
    return NextResponse.json({ error: "Failed to record skip" }, { status: 500 });
  }
}
