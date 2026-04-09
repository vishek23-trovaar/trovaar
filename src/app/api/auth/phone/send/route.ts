import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { getTwilioClient, TWILIO_PHONE, generateVerifyCode } from "@/lib/twilio";
import { authLogger as logger } from "@/lib/logger";

// POST /api/auth/phone/send — send SMS verification code
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await request.json();
  if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s\-().]/g, ""))) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const code = generateVerifyCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const db = getDb();
  await initializeDatabase();
  await db.prepare(
    "UPDATE users SET phone_verify_code = ?, phone_verify_expires = ? WHERE id = ?"
  ).run(code, expires, payload.userId);

  const client = getTwilioClient();
  if (client) {
    try {
      await client.messages.create({
        body: `Your Trovaar verification code is: ${code}. Expires in 10 minutes.`,
        from: TWILIO_PHONE,
        to: phone,
      });
    } catch (err) {
      logger.error({ err }, "Twilio send error");
      return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
    }
  } else {
    // Dev mode — log code
    logger.debug({ phone, code }, "DEV MODE — Phone verification code");
  }

  return NextResponse.json({ sent: true });
}
