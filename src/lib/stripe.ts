import Stripe from "stripe";

// Production guards — these warn at module load but throw at runtime
// (build phase sets NODE_ENV=production but shouldn't crash)
const _stripeKeyMissing = !process.env.STRIPE_SECRET_KEY;
const _webhookSecretMissing = !process.env.STRIPE_WEBHOOK_SECRET;

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  { apiVersion: "2026-02-25.clover" }
);

export const PLATFORM_FEE_PERCENT = 20; // 20% platform fee
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

/** True when running with real Stripe keys (not placeholder) */
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder";

/** Call this in API routes that require Stripe to be fully configured */
export function requireStripeConfig() {
  if (_stripeKeyMissing) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  if (_webhookSecretMissing && process.env.NODE_ENV === "production") {
    throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
  }
}

/** Calculate platform fee and contractor payout given a bid price in cents */
export function calculateFees(bidPriceCents: number) {
  const platformFeeCents = Math.round(bidPriceCents * PLATFORM_FEE_PERCENT / 100);
  const contractorPayoutCents = bidPriceCents - platformFeeCents;
  return { platformFeeCents, contractorPayoutCents };
}
