import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/auth/phone/verify — verify the SMS code and save phone number
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, code } = await request.json();
  if (!phone || !code) {
    return NextResponse.json({ error: "phone and code are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const user = await db.prepare(
    "SELECT phone_verify_code, phone_verify_expires FROM users WHERE id = ?"
  ).get(payload.userId) as { phone_verify_code: string | null; phone_verify_expires: string | null } | undefined;

  if (!user?.phone_verify_code || !user.phone_verify_expires) {
    return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
  }

  if (new Date(user.phone_verify_expires) < new Date()) {
    return NextResponse.json({ error: "Verification code expired" }, { status: 400 });
  }

  // Stored value is a bcrypt hash (see /api/auth/phone/send). Legacy plaintext
  // codes from before this change look like a 6-digit string and won't match
  // bcrypt.compare — those users get a graceful "request new code" path.
  const stored = user.phone_verify_code;
  const looksHashed = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
  const ok = looksHashed
    ? await bcrypt.compare(String(code), stored)
    : false;

  if (!ok) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  await db.prepare(
    "UPDATE users SET phone = ?, phone_verified = 1, phone_verify_code = NULL, phone_verify_expires = NULL WHERE id = ?"
  ).run(phone, payload.userId);

  return NextResponse.json({ verified: true });
}
