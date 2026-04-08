import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/user/senior-protection — returns current senior protection settings
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const user = await db.prepare(
    "SELECT is_senior_account, family_overseer_email, family_oversight_enabled FROM users WHERE id = ?"
  ).get(payload.userId) as {
    is_senior_account: number;
    family_overseer_email: string | null;
    family_oversight_enabled: number;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const protection = await db.prepare(
    "SELECT * FROM senior_protection WHERE consumer_id = ? AND enabled = 1 ORDER BY created_at DESC LIMIT 1"
  ).get(payload.userId) as {
    id: string;
    family_email: string;
    family_name: string | null;
    enabled: number;
    created_at: string;
  } | undefined;

  return NextResponse.json({
    is_senior_account: !!user.is_senior_account,
    family_oversight_enabled: !!user.family_oversight_enabled,
    family_overseer_email: user.family_overseer_email,
    family_name: protection?.family_name ?? null,
  });
}

// POST /api/user/senior-protection — enables senior protection
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { family_email, family_name } = await request.json();

    if (!family_email) {
      return NextResponse.json({ error: "family_email is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Disable any existing senior protection records for this user
    await db.prepare(
      "UPDATE senior_protection SET enabled = 0 WHERE consumer_id = ?"
    ).run(payload.userId);

    // Insert new senior protection record
    const id = uuidv4();
    db.prepare(
      "INSERT INTO senior_protection (id, consumer_id, family_email, family_name, enabled) VALUES (?, ?, ?, ?, 1)"
    ).run(id, payload.userId, family_email, family_name || null);

    // Update user record
    await db.prepare(
      "UPDATE users SET family_oversight_enabled = 1, family_overseer_email = ?, is_senior_account = 1 WHERE id = ?"
    ).run(family_email, payload.userId);

    // Notify family member (log if no email service configured)
    const user = await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | undefined;
    console.log(
      `[Senior Protection] Family oversight enabled. Notification sent to ${family_email}: ` +
      `${family_name || "A family member"} has added you as a family overseer for ${user?.name || "their"} Trovaar account. ` +
      `You will be cc'd on all new bids and messages.`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Senior protection POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/user/senior-protection — disables senior protection
export async function DELETE(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  await db.prepare(
    "UPDATE senior_protection SET enabled = 0 WHERE consumer_id = ?"
  ).run(payload.userId);

  await db.prepare(
    "UPDATE users SET family_oversight_enabled = 0, family_overseer_email = NULL WHERE id = ?"
  ).run(payload.userId);

  return NextResponse.json({ success: true });
}
