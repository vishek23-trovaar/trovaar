import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// DEV ONLY - reset password for a user
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const { email, newPassword } = await request.json();
  if (!email || !newPassword) {
    return NextResponse.json({ error: "email and newPassword required" }, { status: 400 });
  }
  const db = getDb();
  await initializeDatabase();
  const user = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const hash = await hashPassword(newPassword);
  await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, email);
  return NextResponse.json({ success: true, message: `Password reset for ${email}` });
}
