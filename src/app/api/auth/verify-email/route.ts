import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload, signToken } from "@/lib/auth";
import { VerificationCode } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Get the latest unused, unexpired code for this user
    const record = await db.prepare(
      `SELECT * FROM verification_codes
       WHERE user_id = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    ).get(payload.userId) as VerificationCode | undefined;

    if (!record || record.code !== code.trim()) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Mark code as used and verify user
    await db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").run(record.id);
    await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(payload.userId);

    // Issue a new JWT with emailVerified: true
    const newToken = signToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      emailVerified: true,
      isAdmin: payload.isAdmin ?? false,
    });

    const response = NextResponse.json({ success: true, role: payload.role });
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
