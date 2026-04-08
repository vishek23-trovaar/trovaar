import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface SubscriptionVisit {
  id: string;
  subscription_id: string;
  service_id: string;
  job_id: string | null;
  scheduled_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  // joined
  service_name: string;
  service_icon: string;
  service_base_price_cents: number;
  service_duration_minutes: number;
}

// GET /api/subscriptions/visits — returns all visits for the user's active subscription
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
  await initializeDatabase();

    const subscription = await db
      .prepare(`SELECT id FROM user_subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`)
      .get(payload.userId) as { id: string } | undefined;

    if (!subscription) {
      return NextResponse.json({ visits: [] });
    }

    const visits = await db
      .prepare(
        `SELECT
          sv.*,
          fps.name AS service_name,
          fps.icon AS service_icon,
          fps.base_price_cents AS service_base_price_cents,
          fps.duration_minutes AS service_duration_minutes
        FROM subscription_visits sv
        JOIN fixed_price_services fps ON fps.id = sv.service_id
        WHERE sv.subscription_id = ?
        ORDER BY sv.scheduled_date ASC, sv.created_at ASC`
      )
      .all(subscription.id) as SubscriptionVisit[];

    return NextResponse.json({ visits });
  } catch (err) {
    console.error("GET /api/subscriptions/visits error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/subscriptions/visits — schedule a new visit
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serviceId, scheduledDate, notes } = body as {
      serviceId: string;
      scheduledDate: string;
      notes?: string;
    };

    if (!serviceId || !scheduledDate) {
      return NextResponse.json({ error: "serviceId and scheduledDate are required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Get user's active subscription
    const subscription = await db
      .prepare(
        `SELECT us.id, us.plan_id, us.current_period_start,
          sp.visits_per_month
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1`
      )
      .get(payload.userId) as {
        id: string;
        plan_id: string;
        current_period_start: string | null;
        visits_per_month: number;
      } | undefined;

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 403 });
    }

    // Verify service exists and is active
    const service = await db
      .prepare(`SELECT id FROM fixed_price_services WHERE id = ? AND active = 1`)
      .get(serviceId) as { id: string } | undefined;

    if (!service) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // Check visit limit for current period
    const periodStart = subscription.current_period_start ?? new Date().toISOString().slice(0, 10);
    const usedVisits = (
      await db
        .prepare(
          `SELECT COUNT(*) as cnt FROM subscription_visits
           WHERE subscription_id = ? AND status != 'cancelled' AND created_at >= ?`
        )
        .get(subscription.id, periodStart) as { cnt: number }
    ).cnt;

    if (usedVisits >= subscription.visits_per_month) {
      return NextResponse.json(
        {
          error: `You have used all ${subscription.visits_per_month} visits for this billing period.`,
        },
        { status: 422 }
      );
    }

    const visitId = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO subscription_visits (id, subscription_id, service_id, scheduled_date, status, notes)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(visitId, subscription.id, serviceId, scheduledDate, notes ?? null);

    return NextResponse.json({ success: true, visitId });
  } catch (err) {
    console.error("POST /api/subscriptions/visits error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
