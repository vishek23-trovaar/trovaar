import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { service: "trovaar-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Redact sensitive fields from logs
    redact: {
      paths: [
        "*.password",
        "*.password_hash",
        "*.token",
        "*.secret",
        "*.api_key",
        "*.authorization",
        "*.cookie",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, ignore: "pid,hostname,service" },
      })
    : undefined
);

export default logger;

// Convenience sub-loggers per domain
export const authLogger = logger.child({ module: "auth" });
export const jobsLogger = logger.child({ module: "jobs" });
export const adminLogger = logger.child({ module: "admin" });
export const dbLogger = logger.child({ module: "db" });
export const emailLogger = logger.child({ module: "email" });
export const stripeLogger = logger.child({ module: "stripe" });
export const smsLogger = logger.child({ module: "sms" });
export const aiLogger = logger.child({ module: "ai" });
