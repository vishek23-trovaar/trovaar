import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AuthPayload } from "@/types";

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
