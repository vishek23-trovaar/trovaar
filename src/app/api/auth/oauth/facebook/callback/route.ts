import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { exchangeFacebookCode, signPendingJwt, clearStateCookie } from "@/lib/oauth";
import { User, OAuthAccount } from "@/types";
import { dashboardPath } from "@/lib/portalRoutes";
import { authLogger as logger } from "@/lib/logger";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("oauth_state")?.value;

  // CSRF check
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_failed`);
  }

  try {
    const profile = await exchangeFacebookCode(code);

    const db = getDb();
  await initializeDatabase();

    const existingOAuth = await db.prepare(
      "SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?"
    ).get("facebook", profile.providerUserId) as OAuthAccount | undefined;

    if (existingOAuth) {
      const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(existingOAuth.user_id) as User;
      const token = signToken({ userId: user.id, email: user.email, role: user.role, emailVerified: true, isAdmin: !!(user as unknown as Record<string, unknown>).is_admin });
      const response = NextResponse.redirect(`${BASE_URL}${dashboardPath(user.role)}`);
      clearStateCookie(response);
      response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      return response;
    }

    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").get(profile.email);
    if (existingUser) {
      return NextResponse.redirect(`${BASE_URL}/login?error=oauth_email_conflict&provider=facebook`);
    }

    const pendingJwt = await signPendingJwt({ email: profile.email, name: profile.name, provider: "facebook", providerUserId: profile.providerUserId, emailVerified: true });
    const response = NextResponse.redirect(`${BASE_URL}/auth/complete`);
    clearStateCookie(response);
    response.cookies.set("oauth_pending", pendingJwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900, path: "/" });
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "NO_EMAIL") {
      return NextResponse.redirect(`${BASE_URL}/signup?error=oauth_no_email`);
    }
    logger.error({ err }, "Facebook OAuth error");
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_failed`);
  }
}
