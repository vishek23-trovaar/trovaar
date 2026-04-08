import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/stripe/connect — start Stripe Connect onboarding for contractor
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const profile = await db.prepare(
    "SELECT stripe_account_id, stripe_onboarding_complete FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { stripe_account_id: string | null; stripe_onboarding_complete: number } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
  }

  let accountId = profile.stripe_account_id;

  // Create a new Connect account if not already created
  if (!accountId) {
    const user = await db.prepare("SELECT email, name FROM users WHERE id = ?").get(payload.userId) as { email: string; name: string };
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: user.name },
    });
    accountId = account.id;
    await db.prepare("UPDATE contractor_profiles SET stripe_account_id = ? WHERE user_id = ?").run(accountId, payload.userId);
  }

  const origin = request.headers.get("origin") || "http://localhost:3001";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/contractor/dashboard?stripe=refresh`,
    return_url: `${origin}/contractor/dashboard?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

// GET /api/stripe/connect — check onboarding status
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const profile = await db.prepare(
    "SELECT stripe_account_id, stripe_onboarding_complete FROM contractor_profiles WHERE user_id = ?"
  ).get(payload.userId) as { stripe_account_id: string | null; stripe_onboarding_complete: number } | undefined;

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ connected: false, onboardingComplete: false });
  }

  try {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const onboardingComplete = !!(account.details_submitted && account.charges_enabled);

    if (onboardingComplete && !profile.stripe_onboarding_complete) {
      await db.prepare("UPDATE contractor_profiles SET stripe_onboarding_complete = 1 WHERE user_id = ?").run(payload.userId);
    }

    return NextResponse.json({ connected: true, onboardingComplete, accountId: profile.stripe_account_id });
  } catch {
    return NextResponse.json({ connected: false, onboardingComplete: false });
  }
}
