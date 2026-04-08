import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface JobAlertPrefs {
  user_id: string;
  categories: string;
  email_alerts: number;
  radius_miles: number;
  updated_at: string;
}

const DEFAULT_PREFS = {
  categories: [] as string[],
  email_alerts: true,
  radius_miles: 50,
};

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can access job alert preferences" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();
  const row = await db.prepare("SELECT * FROM job_alert_preferences WHERE user_id = ?").get(payload.userId) as JobAlertPrefs | undefined;

  if (!row) {
    return NextResponse.json({ preferences: DEFAULT_PREFS });
  }

  return NextResponse.json({
    preferences: {
      categories: (() => { try { return JSON.parse(row.categories); } catch { return []; } })(),
      email_alerts: row.email_alerts === 1,
      radius_miles: row.radius_miles,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can update job alert preferences" }, { status: 403 });
  }

  const body = await request.json() as {
    categories?: string[];
    email_alerts?: boolean;
    radius_miles?: number;
  };

  const db = getDb();
  await initializeDatabase();

  // Validate
  if (body.categories !== undefined && !Array.isArray(body.categories)) {
    return NextResponse.json({ error: "categories must be an array" }, { status: 400 });
  }
  if (body.email_alerts !== undefined && typeof body.email_alerts !== "boolean") {
    return NextResponse.json({ error: "email_alerts must be a boolean" }, { status: 400 });
  }
  if (body.radius_miles !== undefined) {
    const validRadii = [10, 25, 50, 100];
    if (!validRadii.includes(body.radius_miles)) {
      return NextResponse.json({ error: "radius_miles must be one of 10, 25, 50, 100" }, { status: 400 });
    }
  }

  const existing = await db.prepare("SELECT * FROM job_alert_preferences WHERE user_id = ?").get(payload.userId) as JobAlertPrefs | undefined;

  if (!existing) {
    // Insert with defaults + provided values
    const categories = body.categories !== undefined ? body.categories : DEFAULT_PREFS.categories;
    const emailAlerts = body.email_alerts !== undefined ? (body.email_alerts ? 1 : 0) : 1;
    const radiusMiles = body.radius_miles !== undefined ? body.radius_miles : DEFAULT_PREFS.radius_miles;

    db.prepare(`
      INSERT INTO job_alert_preferences (user_id, categories, email_alerts, radius_miles, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(payload.userId, JSON.stringify(categories), emailAlerts, radiusMiles);
  } else {
    const updates: string[] = ["updated_at = datetime('now')"];
    const vals: (string | number)[] = [];

    if (body.categories !== undefined) {
      updates.push("categories = ?");
      vals.push(JSON.stringify(body.categories));
    }
    if (body.email_alerts !== undefined) {
      updates.push("email_alerts = ?");
      vals.push(body.email_alerts ? 1 : 0);
    }
    if (body.radius_miles !== undefined) {
      updates.push("radius_miles = ?");
      vals.push(body.radius_miles);
    }

    vals.push(payload.userId);
    db.prepare(`UPDATE job_alert_preferences SET ${updates.join(", ")} WHERE user_id = ?`).run(...vals);
  }

  return NextResponse.json({ success: true });
}
