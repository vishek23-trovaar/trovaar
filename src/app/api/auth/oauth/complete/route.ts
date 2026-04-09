import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { verifyPendingJwt } from "@/lib/oauth";
import { UserRole } from "@/types";
import { authLogger as logger } from "@/lib/logger";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const pendingToken = request.cookies.get("oauth_pending")?.value;
    if (!pendingToken) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const pending = await verifyPendingJwt(pendingToken);
    if (!pending) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const { role, location } = await request.json();
    if (!role || !["consumer", "contractor"].includes(role)) {
      return NextResponse.json({ error: "Please select a role." }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Double-check email not already taken (race condition guard)
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(pending.email);
    if (existing) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }

    const userId = uuidv4();

    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, role, location, email_verified, oauth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, pending.email, null, pending.name, role, location || null, 1, pending.provider);

    db.prepare(
      "INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)"
    ).run(uuidv4(), userId, pending.provider, pending.providerUserId);

    if (role === "contractor") {
      db.prepare("INSERT INTO contractor_profiles (user_id, categories) VALUES (?, ?)").run(userId, "[]");
    }

    const token = signToken({
      userId,
      email: pending.email,
      role: role as UserRole,
      emailVerified: true,
      isAdmin: false,
    });

    const response = NextResponse.json({
      user: { id: userId, email: pending.email, name: pending.name, role },
    }, { status: 201 });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.delete("oauth_pending");

    return response;
  } catch (error) {
    logger.error({ err: error }, "OAuth complete error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
