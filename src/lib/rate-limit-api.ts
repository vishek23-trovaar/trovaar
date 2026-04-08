import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Check rate limit for an API request.
 * Returns a 429 Response if limit exceeded, or null if OK.
 */
export function checkRateLimit(
  req: NextRequest,
  opts: RateLimitOptions
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const prefix = opts.keyPrefix || "api";
  const key = `${prefix}:${ip}`;

  const result = rateLimit(key, opts.maxRequests, opts.windowMs);

  if (!result.success) {
    const retryAfter = Math.ceil(result.resetIn / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(opts.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(retryAfter),
        },
      }
    );
  }

  return null;
}
