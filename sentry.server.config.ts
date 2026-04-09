import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // Performance: 5% of server transactions in production (DB queries, API calls)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // ── PII scrubbing ──────────────────────────────────────────────────────────
    beforeSend(event) {
      // Strip auth headers from captured requests
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        for (const key of ["authorization", "cookie", "x-api-key"]) {
          if (headers[key]) headers[key] = "[Filtered]";
        }
      }
      // Scrub sensitive body fields
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ["password", "password_hash", "token", "secret", "totp", "code", "api_key"]) {
          if (key in data) data[key] = "[Filtered]";
        }
      }
      return event;
    },

    // ── Noise filtering ────────────────────────────────────────────────────────
    ignoreErrors: [
      // Expected operational errors — not bugs
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      // 4xx errors are handled in routes — only 5xx should alert
      /^404/,
      /^401/,
      /^403/,
    ],
  });
}
