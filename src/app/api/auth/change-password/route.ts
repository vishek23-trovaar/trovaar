import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload, verifyPassword, hashPassword, revokeUserTokens, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const user = await db
    .prepare("SELECT id, password_hash FROM users WHERE id = ?")
    .get(payload.userId) as { id: string; password_hash: string | null } | undefined;

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.password_hash) {
    return NextResponse.json(
      { error: "This account uses social sign-in and does not have a password." },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await db.prepare(
    "UPDATE users SET password_hash = ?, last_password_change = NOW() WHERE id = ?"
  ).run(newHash, payload.userId);

  // Revoke all existing tokens so any stolen session is immediately invalidated
  await revokeUserTokens(payload.userId);

  // Issue a fresh token for the current session (so user isn't logged out)
  const row = await db.prepare(
    "SELECT token_version, role, email, email_verified, is_admin FROM users WHERE id = ?"
  ).get(payload.userId) as { token_version: number; role: string; email: string; email_verified: number; is_admin: number } | undefined;

  if (!row) return NextResponse.json({ success: true });

  const newToken = signToken({
    userId: payload.userId,
    email: row.email,
    role: row.role as import("@/types").UserRole,
    emailVerified: !!row.email_verified,
    isAdmin: !!row.is_admin,
    tokenVersion: row.token_version,
  });

  const response = NextResponse.json({ success: true, token: newToken });
  response.cookies.set("token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
