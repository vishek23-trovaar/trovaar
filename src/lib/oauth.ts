import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { PendingOAuthData } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

// ─── URL Builders ────────────────────────────────────────────────────────────

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${BASE_URL}/api/auth/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function buildAppleAuthUrl(state: string): string {
  // Encode state in redirect_uri query param so it survives Apple's form_post (SameSite cookie issue)
  const redirectUri = `${BASE_URL}/api/auth/oauth/apple/callback?csrf=${state}`;
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

export function buildFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || "",
    redirect_uri: `${BASE_URL}/api/auth/oauth/facebook/callback`,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

// ─── Code Exchange ────────────────────────────────────────────────────────────

export async function exchangeGoogleCode(
  code: string
): Promise<{ email: string; name: string; providerUserId: string }> {
  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${BASE_URL}/api/auth/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json();

  // Get user profile
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) throw new Error("Failed to fetch Google profile");

  const profile = await profileRes.json();
  return {
    email: profile.email,
    name: profile.name || profile.email,
    providerUserId: profile.id,
  };
}

export async function generateAppleClientSecret(): Promise<string> {
  const privateKey = (process.env.APPLE_PRIVATE_KEY || "").replace(/\n/g, "\n");

  const { importPKCS8 } = await import("jose");
  const key = await importPKCS8(privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
    .setIssuedAt()
    .setIssuer(process.env.APPLE_TEAM_ID || "")
    .setAudience("https://appleid.apple.com")
    .setSubject(process.env.APPLE_CLIENT_ID || "")
    .setExpirationTime("1h")
    .sign(key);
}

export async function exchangeAppleCode(
  code: string,
  clientSecret: string,
  firstLoginUserJson?: string
): Promise<{ email: string; name: string; providerUserId: string }> {
  const redirectUri = `${BASE_URL}/api/auth/oauth/apple/callback`;

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID || "",
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Apple token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json();

  // Decode id_token (JWT) to get sub (user ID) and email
  const idTokenPayload = JSON.parse(
    Buffer.from(tokens.id_token.split(".")[1], "base64").toString("utf-8")
  );

  // Apple only sends user name on first login via the form_post `user` field
  let name = idTokenPayload.email || "";
  if (firstLoginUserJson) {
    try {
      const userObj = JSON.parse(firstLoginUserJson);
      const firstName = userObj?.name?.firstName || "";
      const lastName = userObj?.name?.lastName || "";
      if (firstName || lastName) name = `${firstName} ${lastName}`.trim();
    } catch {
      // ignore parse errors
    }
  }

  return {
    email: idTokenPayload.email,
    name: name || idTokenPayload.email,
    providerUserId: idTokenPayload.sub,
  };
}

export async function exchangeFacebookCode(
  code: string
): Promise<{ email: string; name: string; providerUserId: string }> {
  const redirectUri = `${BASE_URL}/api/auth/oauth/facebook/callback`;

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        code,
        client_id: process.env.FACEBOOK_APP_ID || "",
        client_secret: process.env.FACEBOOK_APP_SECRET || "",
        redirect_uri: redirectUri,
      })
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Facebook token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json();

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokens.access_token}`
  );

  if (!profileRes.ok) throw new Error("Failed to fetch Facebook profile");

  const profile = await profileRes.json();

  if (!profile.email) {
    throw new Error("NO_EMAIL");
  }

  return {
    email: profile.email,
    name: profile.name || profile.email,
    providerUserId: profile.id,
  };
}

// ─── Pending OAuth JWT ────────────────────────────────────────────────────────

export async function signPendingJwt(data: PendingOAuthData): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function verifyPendingJwt(token: string): Promise<PendingOAuthData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as PendingOAuthData;
  } catch {
    return null;
  }
}

// ─── CSRF State Cookies ───────────────────────────────────────────────────────

export function setStateCookie(response: NextResponse, state: string): void {
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearStateCookie(response: NextResponse): void {
  response.cookies.delete("oauth_state");
}
