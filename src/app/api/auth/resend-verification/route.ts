import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { User } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
  await initializeDatabase();

    // Check user isn't already verified
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) as User | undefined;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.email_verified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Rate limit: max 5 codes per hour
    const recentCount = (
      await db.prepare(
        `SELECT COUNT(*) as count FROM verification_codes
         WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`
      ).get(payload.userId) as { count: number }
    ).count;

    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before requesting another code." },
        { status: 429 }
      );
    }

    // Invalidate all old codes
    await db.prepare("UPDATE verification_codes SET used = 1 WHERE user_id = ? AND used = 0").run(payload.userId);

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = uuidv4();
    await db.prepare(
      "INSERT INTO verification_codes (id, user_id, code, expires_at) VALUES (?, ?, ?, datetime('now', '+15 minutes'))"
    ).run(codeId, payload.userId, code);

    await sendVerificationEmail(user.email, user.name, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
