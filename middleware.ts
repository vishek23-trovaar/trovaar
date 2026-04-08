import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/middleware-auth";
import { jwtVerify } from "jose";

const PROTECTED_ROUTES = ["/dashboard", "/jobs/new", "/profile"];
const AUTH_ROUTES = ["/login", "/signup"];
const VERIFY_EMAIL_ROUTE = "/auth/verify-email";

// ── CORS helper ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ["http://localhost:8081", "http://localhost:3001", "http://127.0.0.1:8081"];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".exp.direct");
}

function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

// ── Admin token verification ────────────────────────────────────────────────
async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(
      process.env.ADMIN_SECRET ?? process.env.JWT_SECRET ?? "admin-dev-secret"
    );
    const { payload } = await jwtVerify(token, secret);
    return !!(payload as { isAdmin?: boolean }).isAdmin;
  } catch {
    return false;
  }
}

// ── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const { pathname } = request.nextUrl;

  // Handle CORS preflight for ALL routes
  if (request.method === "OPTIONS") {
    return addCorsHeaders(
      new NextResponse(null, { status: 204 }),
      origin
    );
  }

  // For API routes, just add CORS and continue (no redirects)
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  const token = request.cookies.get("token")?.value;

  // ── Admin routes ────────────────────────────────────────────
  if (pathname === "/admin/login") {
    const adminToken = request.cookies.get("admin_token")?.value;
    if (adminToken && await verifyAdminToken(adminToken)) {
      return addCorsHeaders(NextResponse.redirect(new URL("/admin", request.url)), origin);
    }
    return addCorsHeaders(NextResponse.next(), origin);
  }

  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
      return addCorsHeaders(NextResponse.redirect(new URL("/admin/login", request.url)), origin);
    }
    const valid = await verifyAdminToken(adminToken);
    if (!valid) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_token");
      return addCorsHeaders(response, origin);
    }
    return addCorsHeaders(NextResponse.next(), origin);
  }

  // ── Regular protected routes ────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isVerifyEmail = pathname === VERIFY_EMAIL_ROUTE;

  if (isProtected) {
    if (!token) {
      return addCorsHeaders(NextResponse.redirect(new URL("/login", request.url)), origin);
    }
    const payload = await verifyTokenEdge(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return addCorsHeaders(response, origin);
    }

    if (payload.emailVerified === false) {
      return addCorsHeaders(NextResponse.redirect(new URL(VERIFY_EMAIL_ROUTE, request.url)), origin);
    }

    if (pathname.startsWith("/jobs/new") && payload.role !== "consumer") {
      return addCorsHeaders(NextResponse.redirect(new URL("/dashboard/contractor", request.url)), origin);
    }
  }

  if (isAuthRoute && token) {
    const payload = await verifyTokenEdge(token);
    if (payload) {
      const dashboardPath = payload.role === "consumer" ? "/dashboard/consumer" : "/dashboard/contractor";
      return addCorsHeaders(NextResponse.redirect(new URL(dashboardPath, request.url)), origin);
    }
  }

  if (isVerifyEmail && token) {
    const payload = await verifyTokenEdge(token);
    if (payload && payload.emailVerified !== false) {
      const dashboardPath = payload.role === "consumer" ? "/dashboard/consumer" : "/dashboard/contractor";
      return addCorsHeaders(NextResponse.redirect(new URL(dashboardPath, request.url)), origin);
    }
  }

  return addCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/jobs/new",
    "/profile/:path*",
    "/admin/:path*",
    "/admin/login",
    "/login",
    "/signup",
    "/auth/verify-email",
    "/auth/complete",
  ],
};
