import { getDb, initializeDatabase } from "@/lib/db";

/**
 * Event names used throughout the application.
 */
export type AnalyticsEventName =
  | "user_signup"
  | "user_login"
  | "job_posted"
  | "job_viewed"
  | "bid_placed"
  | "bid_accepted"
  | "job_completed"
  | "payment_released"
  | "review_submitted"
  | "search_performed"
  | "message_sent"
  | "dispute_filed"
  | "video_uploaded"
  | "ai_analysis_used";

/**
 * Insert an analytics event into the analytics_events table.
 * This is designed to be non-blocking: callers should wrap in try/catch
 * so tracking failures never break the main application flow.
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  opts?: {
    userId?: string;
    jobId?: string;
    properties?: Record<string, unknown>;
    sessionId?: string;
  }
): Promise<void> {
  try {
    const db = getDb();
  await initializeDatabase();
    await db.prepare(
      `INSERT INTO analytics_events (event_name, user_id, job_id, properties, session_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      eventName,
      opts?.userId ?? null,
      opts?.jobId ?? null,
      opts?.properties ? JSON.stringify(opts.properties) : null,
      opts?.sessionId ?? null
    );
  } catch (err) {
    // Never let analytics tracking break application flow
    console.error("[analytics] Failed to track event:", eventName, err);
  }
}
