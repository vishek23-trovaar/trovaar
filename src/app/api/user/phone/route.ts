import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

// GET /api/user/phone — returns current phone_number and sms_alerts_enabled
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const user = await db.prepare(
    "SELECT phone_number, sms_alerts_enabled FROM users WHERE id = ?"
  ).get(payload.userId) as {
    phone_number: string | null;
    sms_alerts_enabled: number;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    phone_number: user.phone_number,
    sms_alerts_enabled: !!user.sms_alerts_enabled,
  });
}

// POST /api/user/phone — saves phone_number and sms_alerts_enabled
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { phone_number, sms_alerts_enabled } = await request.json();

    const db = getDb();
  await initializeDatabase();

    if (phone_number !== undefined) {
      await db.prepare("UPDATE users SET phone_number = ? WHERE id = ?").run(
        phone_number || null,
        payload.userId
      );
    }

    if (sms_alerts_enabled !== undefined) {
      await db.prepare("UPDATE users SET sms_alerts_enabled = ? WHERE id = ?").run(
        sms_alerts_enabled ? 1 : 0,
        payload.userId
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Phone settings POST error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
