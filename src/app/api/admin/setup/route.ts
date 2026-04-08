import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, secret } = await request.json();

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: "Invalid admin secret" }, { status: 403 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const result = await db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?").run(email);

  if (result.changes === 0) {
    return NextResponse.json({ error: "No account found with that email. Sign up first." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: `${email} is now an admin` });
}
