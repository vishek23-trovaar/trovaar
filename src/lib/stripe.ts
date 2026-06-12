import Stripe from "stripe";

// Production guards — these warn at module load but throw at runtime
// (build phase sets NODE_ENV=production but shouldn't crash)
const _stripeKeyMissing = !process.env.STRIPE_SECRET_KEY;
const _webhookSecretMissing = !process.env.STRIPE_WEBHOOK_SECRET;

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  { apiVersion: "2026-02-25.clover" }
);

export const PLATFORM_FEE_PERCENT = 20; // 20% markup on top of the contractor's bid
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

/**
 * Trovaar's pricing model (see src/lib/constants.ts PLATFORM_MARKUP):
 *
 *   - bid.price is the CONTRACTOR'S NET ASK.
 *   - The consumer is shown and charged bid × (1 + 20%).
 *   - The contractor receives their full bid; the markup is the platform fee.
 *   - Neither side's UI reveals the markup to the other.
 *
 * chargeCents is the PaymentIntent amount; platformFeeCents goes to
 * application_fee_amount so the Connect transfer nets the contractor
 * exactly their bid.
 *
 * (Before 2026-04 this function deducted the fee FROM the bid — consumers
 * were undercharged 20% and contractors shorted 20% versus every UI surface.)
 */
export function calculateFees(bidPriceCents: number) {
  const chargeCents = Math.round(bidPriceCents * (1 + PLATFORM_FEE_PERCENT / 100));
  const platformFeeCents = chargeCents - bidPriceCents;
  const contractorPayoutCents = bidPriceCents;
  return { chargeCents, platformFeeCents, contractorPayoutCents };
}
