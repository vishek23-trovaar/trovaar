import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // Edge runtime: keep sample rate low — middleware runs on every request
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.02 : 0.5,

    // ── PII scrubbing ──────────────────────────────────────────────────────────
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        for (const key of ["authorization", "cookie"]) {
          if (headers[key]) headers[key] = "[Filtered]";
        }
      }
      return event;
    },
  });
}
