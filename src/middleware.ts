import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret(envKey: string, fallback: string): Uint8Array {
  return new TextEncoder().encode(process.env[envKey] || fallback);
}

const JWT_SECRET = () => getSecret("JWT_SECRET", "dev-only-insecure-fallback-change-before-production");
const ADMIN_SECRET = () => getSecret(
  "ADMIN_SECRET",
  process.env.JWT_SECRET || "admin-dev-secret"
);

// Mutating methods that require CSRF origin checks
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Paths exempt from CSRF checks (webhooks / OAuth callbacks receive cross-origin POSTs legitimately)
const CSRF_EXEMPT_PREFIXES = [
  "/api/stripe/webhook",
  "/api/calls/twiml",
  "/api/calls/recording-webhook",
  "/api/calls/transcription-webhook",
  "/api/auth/oauth/",
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  // ── CORS + CSRF for API routes ──────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") ?? "";
    const referer = request.headers.get("referer") ?? "";

    const prodOrigins = [
      "https://trovaar.com",
      "https://www.trovaar.com",
      process.env.NEXT_PUBLIC_BASE_URL,
    ].filter(Boolean) as string[];

    const devOrigins = [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    const allowedOrigins = isProd ? prodOrigins : [...prodOrigins, ...devOrigins];

    // Allow LAN IPs in dev so phones on the same network can connect
    const isLocalNetwork =
      !isProd && /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);

    const isAllowedOrigin =
      !origin ||                             // same-origin (no Origin header)
      allowedOrigins.includes(origin) ||
      isLocalNetwork ||
      (!isProd && (origin.includes("exp.direct") || origin.includes("expo.dev")));

    // ── CSRF: reject mutating browser requests from unexpected origins ────────
    // Bearer-token requests (mobile / API clients) carry an Authorization header
    // and are NOT subject to CSRF because they can't be triggered by a third-party
    // page without the token.
    if (
      MUTATING_METHODS.has(request.method) &&
      !isCsrfExempt(pathname) &&
      origin &&                              // only browsers send Origin
      !request.headers.get("authorization") // bearer-token callers are exempt
    ) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ??
        (isProd ? "https://trovaar.com" : "http://localhost:3001");

      const refererAllowed =
        !referer ||
        referer.startsWith(baseUrl) ||
        allowedOrigins.some((o) => referer.startsWith(o)) ||
        (!isProd && (referer.includes("localhost") || isLocalNetwork));

      if (!isAllowedOrigin && !refererAllowed) {
        return NextResponse.json(
          { error: "Forbidden: CSRF origin mismatch" },
          { status: 403 }
        );
      }
    }

    // ── Preflight ─────────────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": isAllowedOrigin && origin ? origin : "",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = NextResponse.next();
    if (isAllowedOrigin && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return response;
  }

  // ── Admin auth protection ───────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminToken = request.cookies.get("admin_token")?.value;

    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      await jwtVerify(adminToken, ADMIN_SECRET());
    } catch {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_token");
      return response;
    }
  }

  // ── Role-based redirects for authenticated users ────────────────────────────
  if (pathname.startsWith("/client") || pathname.startsWith("/contractor")) {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET());
      const role = (payload as { role?: string }).role;
      if (pathname.startsWith("/contractor") && role === "consumer") {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
      if (pathname.startsWith("/client") && role === "contractor") {
        return NextResponse.redirect(new URL("/contractor/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/client/:path*", "/contractor/:path*"],
};
