import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
  // joined from subscription_plans
  plan_name: string;
  plan_tagline: string | null;
  plan_price_cents: number;
  plan_visits_per_month: number;
  plan_priority_booking: number;
  plan_color: string;
  plan_description: string | null;
}

// GET /api/subscriptions — returns current user's active subscription
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
  await initializeDatabase();

    const subscription = await db
      .prepare(
        `SELECT
          us.*,
          sp.name AS plan_name,
          sp.tagline AS plan_tagline,
          sp.price_cents AS plan_price_cents,
          sp.visits_per_month AS plan_visits_per_month,
          sp.priority_booking AS plan_priority_booking,
          sp.color AS plan_color,
          sp.description AS plan_description
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1`
      )
      .get(payload.userId) as UserSubscription | undefined;

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Get visit counts for the current period
    const periodStart = subscription.current_period_start ?? subscription.created_at;
    const visitCounts = await db
      .prepare(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN status IN ('pending','confirmed','completed') THEN 1 ELSE 0 END) as active_count
        FROM subscription_visits
        WHERE subscription_id = ? AND created_at >= ?`
      )
      .get(subscription.id, periodStart) as { total: number; active_count: number };

    return NextResponse.json({
      subscription: {
        ...subscription,
        visits_used_this_period: visitCounts.active_count ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /api/subscriptions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/subscriptions — subscribe to a plan
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planId } = body as { planId: string };

    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Check plan exists and is active
    const plan = await db
      .prepare(`SELECT id FROM subscription_plans WHERE id = ? AND active = 1`)
      .get(planId) as { id: string } | undefined;

    if (!plan) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Check if user already has an active subscription
    const existing = await db
      .prepare(`SELECT id FROM user_subscriptions WHERE user_id = ? AND status = 'active'`)
      .get(payload.userId) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active subscription. Cancel it before subscribing to a new plan." },
        { status: 409 }
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const subscriptionId = crypto.randomUUID();

    // TODO: integrate Stripe Subscriptions for billing
    await db.prepare(
      `INSERT INTO user_subscriptions
        (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES (?, ?, ?, 'active', ?, ?, 0)`
    ).run(subscriptionId, payload.userId, planId, now.toISOString(), periodEnd.toISOString());

    return NextResponse.json({ success: true, subscriptionId });
  } catch (err) {
    logger.error({ err }, "POST /api/subscriptions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/subscriptions — cancel at period end (not immediate)
export async function DELETE(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
  await initializeDatabase();

    const subscription = await db
      .prepare(`SELECT id FROM user_subscriptions WHERE user_id = ? AND status = 'active'`)
      .get(payload.userId) as { id: string } | undefined;

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    await db.prepare(
      `UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now') WHERE id = ?`
    ).run(subscription.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /api/subscriptions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
