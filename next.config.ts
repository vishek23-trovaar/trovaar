import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy
 *
 * 'unsafe-eval' is required by Next.js hot-module replacement in development.
 * It is intentionally EXCLUDED in production to prevent XSS via eval().
 *
 * 'unsafe-inline' is kept for scripts/styles because Next.js injects inline
 * scripts during SSR hydration.  A nonce-based CSP (which could remove this)
 * requires middleware-level nonce generation and is deferred for a future
 * hardening pass.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isProd ? [] : ["'unsafe-eval'"]),   // dev only — HMR needs eval
    "https://js.stripe.com",
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://api.stripe.com",
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
      "https://accounts.google.com",
      "wss:",
      "ws:",
      ...(isProd ? [] : ["http://localhost:*"]), // Expo / dev tools in dev
    ].join(" "),
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  headers: async () => [
    {
      // HTML pages: always revalidate so deploys are picked up immediately
      source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self)",
        },
        {
          key: "Strict-Transport-Security",
          // Only meaningful in production (browsers ignore HSTS on HTTP)
          value: isProd
            ? "max-age=63072000; includeSubDomains; preload"
            : "max-age=0",
        },
        {
          key: "Content-Security-Policy",
          value: buildCsp(),
        },
      ],
    },
  ],
};

export default nextConfig;
