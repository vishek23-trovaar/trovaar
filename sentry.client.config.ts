import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // Performance: 10% of transactions in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session Replay: only record on errors in production
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,

    integrations: [
      Sentry.replayIntegration({
        // Never capture sensitive inputs in replays
        maskAllInputs: true,
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // ── PII scrubbing ──────────────────────────────────────────────────────────
    beforeSend(event) {
      // Scrub sensitive fields from request bodies / extra data
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ["password", "password_hash", "token", "secret", "authorization", "cookie", "totp", "code"]) {
          if (key in data) data[key] = "[Filtered]";
        }
      }
      return event;
    },

    // ── Noise filtering ────────────────────────────────────────────────────────
    ignoreErrors: [
      // Network errors that are out of our control
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "NetworkError",
      // Browser extension interference
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Benign navigation aborts
      "AbortError",
      "ResizeObserver loop limit exceeded",
      // Non-actionable React hydration mismatches in dev
      /Hydration failed/,
    ],

    // Don't report errors from browser extensions or external scripts
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
  });
}
