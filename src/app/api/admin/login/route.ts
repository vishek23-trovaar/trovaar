import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { rateLimit } from "@/lib/rate-limit";

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD environment variable is required in production");
  }
  return pw || "Admin123!"; // dev-only fallback
}

function getAdminSecret(): Uint8Array {
  const secret = process.env.ADMIN_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SECRET environment variable is required in production");
  }
  return new TextEncoder().encode(secret || "admin-dev-secret");
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 }
    );
  }

  const { password } = await request.json() as { password: string };

  if (!password || password !== getAdminPassword()) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getAdminSecret());

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
