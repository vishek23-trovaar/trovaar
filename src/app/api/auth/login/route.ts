import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { User } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { authLogger as logger } from "@/lib/logger";

interface UserWithAdmin extends User {
  is_admin: number;
}

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, { maxRequests: 10, windowMs: 15 * 60 * 1000, keyPrefix: "auth-login" });
  if (rl) return rl;

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (attempts) {
      if (now - attempts.firstAttempt < WINDOW_MS) {
        if (attempts.count >= MAX_ATTEMPTS) {
          return NextResponse.json(
            { error: "Too many login attempts. Try again in 15 minutes." },
            { status: 429 }
          );
        }
      } else {
        // Window expired — reset
        loginAttempts.delete(ip);
      }
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserWithAdmin | undefined;

    if (!user) {
      const rec = loginAttempts.get(ip);
      if (rec) { rec.count++; } else { loginAttempts.set(ip, { count: 1, firstAttempt: now }); }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // OAuth-only accounts don't have a password
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "This account uses social sign-in. Please use Google, Apple, or Facebook to log in." },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      const rec = loginAttempts.get(ip);
      if (rec) { rec.count++; } else { loginAttempts.set(ip, { count: 1, firstAttempt: now }); }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Reset failed attempts on successful login
    loginAttempts.delete(ip);

    try { trackEvent("user_login", { userId: user.id, properties: { role: user.role } }); } catch {}

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: !!user.email_verified,
      isAdmin: !!user.is_admin,
      tokenVersion: (user as Record<string, unknown>).token_version as number ?? 0,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, "Login error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
