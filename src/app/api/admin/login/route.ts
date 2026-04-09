import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticator } from "otplib";
import { rateLimit } from "@/lib/rate-limit";
import { adminLogger as logger } from "@/lib/logger";

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error(
      "ADMIN_PASSWORD environment variable is not set. " +
      "Add ADMIN_PASSWORD=<strong-password> to your .env.local file."
    );
  }
  return pw;
}

function getAdminSecret(): Uint8Array {
  const secret = process.env.ADMIN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SECRET (or JWT_SECRET) environment variable is not set. " +
      "Add ADMIN_SECRET=<random-secret> to your .env.local file."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Returns the TOTP secret if ADMIN_TOTP_SECRET is configured, otherwise null.
 * When null, MFA is disabled (opt-in via env var).
 */
function getTotpSecret(): string | null {
  return process.env.ADMIN_TOTP_SECRET ?? null;
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    logger.warn({ ip }, "Admin login rate limited");
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: { password?: string; totp?: string };
  try {
    body = await request.json() as { password?: string; totp?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { password, totp } = body;

  // Validate password
  let adminPassword: string;
  let adminSecret: Uint8Array;
  try {
    adminPassword = getAdminPassword();
    adminSecret = getAdminSecret();
  } catch (err) {
    logger.error({ err }, "Admin login misconfiguration");
    return NextResponse.json(
      { error: "Server misconfiguration — contact administrator" },
      { status: 500 }
    );
  }

  if (!password || password !== adminPassword) {
    logger.warn({ ip }, "Admin login failed: bad password");
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Validate TOTP if configured
  const totpSecret = getTotpSecret();
  if (totpSecret) {
    if (!totp) {
      // Password OK but no OTP provided — tell the client it's required
      return NextResponse.json(
        { error: "TOTP code required", totpRequired: true },
        { status: 401 }
      );
    }

    const isValidTotp = authenticator.verify({ token: totp, secret: totpSecret });
    if (!isValidTotp) {
      logger.warn({ ip }, "Admin login failed: bad TOTP");
      return NextResponse.json({ error: "Invalid TOTP code" }, { status: 401 });
    }
  }

  const token = await new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(adminSecret);

  logger.info({ ip }, "Admin login successful");

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });

  return response;
}
