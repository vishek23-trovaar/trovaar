import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Look up the token
    const resetToken = await db
      .prepare(
        "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?"
      )
      .get(token) as
      | { id: string; user_id: string; expires_at: string; used: number }
      | undefined;

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Hash the new password and update the user
    const passwordHash = await hashPassword(password);

    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, resetToken.user_id);

    // Mark the token as used
    await db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(resetToken.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
