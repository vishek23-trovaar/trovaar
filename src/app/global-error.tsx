"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center", background: "#010102", color: "#f7f8f8", minHeight: "100vh", margin: 0 }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#f7f8f8" }}>Something went wrong</h2>
        <p style={{ color: "#8a8f98", marginBottom: "1.5rem" }}>
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#3B82F6",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
