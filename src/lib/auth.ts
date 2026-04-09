import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AuthPayload } from "@/types";
import { getDb } from "@/lib/db";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    // Development only — warn loudly
    console.warn("⚠️  JWT_SECRET not set. Using insecure fallback. Set JWT_SECRET in .env.local");
    return "dev-only-insecure-fallback-change-before-production";
  }
  return secret;
}

const TOKEN_EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function getTokenFromHeaders(headers: Headers): string | null {
  // Check Authorization header first (mobile apps)
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // Fall back to cookie (web)
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

export function getAuthPayload(headers: Headers): AuthPayload | null {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Verify auth payload AND check token_version against DB.
 * Use this for sensitive operations (password change, logout, payments).
 * Returns null if the token has been revoked (user logged out / password changed).
 */
export async function getAuthPayloadVerified(headers: Headers): Promise<AuthPayload | null> {
  const payload = getAuthPayload(headers);
  if (!payload) return null;

  try {
    const db = getDb();
    const row = await db.prepare(
      "SELECT token_version FROM users WHERE id = ?"
    ).get(payload.userId) as { token_version: number } | undefined;

    if (!row) return null;
    // If payload has no tokenVersion (old token), allow but log
    if (payload.tokenVersion === undefined) return payload;
    // Reject tokens issued before the current version
    if (payload.tokenVersion < row.token_version) return null;
    return payload;
  } catch {
    return payload; // DB failure → don't lock users out, fall back to basic check
  }
}

/**
 * Increment token_version to invalidate all existing tokens for a user.
 * Call on logout and password change.
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  const db = getDb();
  await db.prepare(
    "UPDATE users SET token_version = token_version + 1 WHERE id = ?"
  ).run(userId);
}
