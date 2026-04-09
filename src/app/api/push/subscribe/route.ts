import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription: endpoint, keys.p256dh, and keys.auth are required" },
        { status: 400 }
      );
    }

    const db = getDb();
  await initializeDatabase();

    // Upsert — if the endpoint already exists, update the keys
    const existing = await db
      .prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?")
      .get(endpoint) as { id: number } | undefined;

    if (existing) {
      await db.prepare(
        "UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE id = ?"
      ).run(payload.userId, keys.p256dh, keys.auth, existing.id);
    } else {
      await db.prepare(
        "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)"
      ).run(payload.userId, endpoint, keys.p256dh, keys.auth);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Push subscribe error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    await db.prepare(
      "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?"
    ).run(payload.userId, endpoint);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Push unsubscribe error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
