import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_cents: number;
  billing_interval: string;
  included_services: string;
  visits_per_month: number;
  priority_booking: number;
  active: number;
  stripe_price_id: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

interface FixedPriceService {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price_cents: number;
  duration_minutes: number;
  icon: string;
  active: number;
  sort_order: number;
  created_at: string;
}

// GET /api/subscriptions/plans — public, no auth required
export async function GET() {
  try {
    const db = getDb();
  await initializeDatabase();

    const plans = await db
      .prepare(
        `SELECT * FROM subscription_plans WHERE active = 1 ORDER BY sort_order ASC`
      )
      .all() as SubscriptionPlan[];

    const services = await db
      .prepare(
        `SELECT * FROM fixed_price_services WHERE active = 1 ORDER BY sort_order ASC`
      )
      .all() as FixedPriceService[];

    return NextResponse.json({ plans, services });
  } catch (err) {
    console.error("GET /api/subscriptions/plans error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
