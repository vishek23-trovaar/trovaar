import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface PlanRow {
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
  subscriber_count: number;
}

interface SubscriberRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  cancel_at_period_end: number;
  current_period_end: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_price_cents: number;
}

// GET /api/admin/subscriptions
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const db = getDb();
  await initializeDatabase();

    // Plans with subscriber counts
    const plans = await db
      .prepare(
        `SELECT
          sp.*,
          COUNT(us.id) as subscriber_count
        FROM subscription_plans sp
        LEFT JOIN user_subscriptions us ON us.plan_id = sp.id AND us.status = 'active'
        GROUP BY sp.id
        ORDER BY sp.sort_order ASC`
      )
      .all() as PlanRow[];

    // All subscriptions with user + plan details
    const subscribers = await db
      .prepare(
        `SELECT
          us.*,
          u.name AS user_name,
          u.email AS user_email,
          sp.name AS plan_name,
          sp.price_cents AS plan_price_cents
        FROM user_subscriptions us
        JOIN users u ON u.id = us.user_id
        JOIN subscription_plans sp ON sp.id = us.plan_id
        ORDER BY us.created_at DESC`
      )
      .all() as SubscriberRow[];

    // Aggregate KPIs
    const totalActiveSubscribers = subscribers.filter((s) => s.status === "active").length;
    const monthlyRecurringRevenue = subscribers
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.plan_price_cents, 0);

    return NextResponse.json({
      plans,
      subscribers,
      kpis: {
        totalActiveSubscribers,
        monthlyRecurringRevenue,
        activePlans: plans.filter((p) => p.active).length,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/subscriptions — update a plan
export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { planId, fields } = body as {
      planId: string;
      fields: {
        name?: string;
        price_cents?: number;
        visits_per_month?: number;
        active?: number;
        tagline?: string;
      };
    };

    if (!planId || !fields || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "planId and fields are required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Build dynamic SET clause (only allowed fields)
    const allowed = ["name", "price_cents", "visits_per_month", "active", "tagline"] as const;
    type AllowedField = typeof allowed[number];
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    for (const key of allowed) {
      if (key in fields && fields[key as AllowedField] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(fields[key as AllowedField] as string | number);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    values.push(planId);
    await db.prepare(`UPDATE subscription_plans SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
