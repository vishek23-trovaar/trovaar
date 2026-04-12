import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { signPendingJwt } from "@/lib/oauth";
import { User, OAuthAccount } from "@/types";
import { authLogger as logger } from "@/lib/logger";
import { jwtVerify, createRemoteJWKSet } from "jose";

// Apple's public keys for verifying identity tokens
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

/**
 * Mobile Apple Sign-In endpoint.
 * Accepts the identityToken from expo-apple-authentication's native flow.
 * Verifies the token with Apple's public keys, then creates/logs in the user.
 */
export async function POST(request: NextRequest) {
  try {
    const { identityToken, fullName, email: providedEmail } = await request.json();

    if (!identityToken) {
      return NextResponse.json({ error: "identityToken is required" }, { status: 400 });
    }

    // Verify the identity token with Apple's public keys
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    });

    const appleUserId = payload.sub;
    const email = (payload.email as string) || providedEmail;

    if (!appleUserId || !email) {
      return NextResponse.json({ error: "Invalid identity token: missing sub or email" }, { status: 400 });
    }

    const name = fullName
      ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ") || "Apple User"
      : "Apple User";

    const db = getDb();
    await initializeDatabase();

    // Check if this Apple account is already linked
    const existingOAuth = await db.prepare(
      "SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?"
    ).get("apple", appleUserId) as OAuthAccount | undefined;

    if (existingOAuth) {
      const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(existingOAuth.user_id) as User;
      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        emailVerified: true,
        isAdmin: !!(user as unknown as Record<string, unknown>).is_admin,
      });
      return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    // Check if email is already registered with a different method
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered. Please log in with your original sign-in method." }, { status: 409 });
    }

    // New user — return a pending token for account completion (role selection)
    const pendingJwt = await signPendingJwt({
      email,
      name,
      provider: "apple",
      providerUserId: appleUserId,
      emailVerified: true,
    });

    return NextResponse.json({ pendingToken: pendingJwt, needsCompletion: true });
  } catch (err) {
    logger.error({ err }, "Mobile Apple Sign-In error");
    return NextResponse.json({ error: "Apple sign-in verification failed" }, { status: 401 });
  }
}
