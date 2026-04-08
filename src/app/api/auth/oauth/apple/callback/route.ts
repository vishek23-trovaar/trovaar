import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { generateAppleClientSecret, exchangeAppleCode, signPendingJwt, clearStateCookie } from "@/lib/oauth";
import { User, OAuthAccount } from "@/types";
import { dashboardPath } from "@/lib/portalRoutes";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// Apple uses form_post response_mode — callback is a POST
export async function POST(request: NextRequest): Promise<NextResponse> {
  const text = await request.text();
  const body = new URLSearchParams(text);

  const code = body.get("code");
  const firstLoginUser = body.get("user") || undefined;

  // Apple state CSRF: we embedded state in the redirect_uri as ?csrf=... so read from URL
  const urlState = request.nextUrl.searchParams.get("csrf");
  const cookieState = request.cookies.get("oauth_state")?.value;

  if (!code || !urlState || !cookieState || urlState !== cookieState) {
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_failed`);
  }

  try {
    const clientSecret = await generateAppleClientSecret();
    const profile = await exchangeAppleCode(code, clientSecret, firstLoginUser);

    if (!profile.email) {
      return NextResponse.redirect(`${BASE_URL}/signup?error=oauth_no_email`);
    }

    const db = getDb();
  await initializeDatabase();

    const existingOAuth = await db.prepare(
      "SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?"
    ).get("apple", profile.providerUserId) as OAuthAccount | undefined;

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
      return NextResponse.redirect(`${BASE_URL}/login?error=oauth_email_conflict&provider=apple`);
    }

    const pendingJwt = await signPendingJwt({ email: profile.email, name: profile.name, provider: "apple", providerUserId: profile.providerUserId, emailVerified: true });
    const response = NextResponse.redirect(`${BASE_URL}/auth/complete`);
    clearStateCookie(response);
    response.cookies.set("oauth_pending", pendingJwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900, path: "/" });
    return response;
  } catch (err) {
    console.error("Apple OAuth error:", err);
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_failed`);
  }
}
