import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const eventName = searchParams.get("event_name");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const groupBy = searchParams.get("group_by"); // day | week | month

  const db = getDb();
  await initializeDatabase();

  // --- Aggregate counts grouped by time period ---
  if (groupBy) {
    let dateFormat: string;
    switch (groupBy) {
      case "week":
        dateFormat = "%Y-W%W";
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    let query = `
      SELECT
        strftime('${dateFormat}', created_at) AS period,
        event_name,
        COUNT(*) AS event_count,
        COUNT(DISTINCT user_id) AS unique_users
      FROM analytics_events
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (eventName) {
      query += " AND event_name = ?";
      params.push(eventName);
    }
    if (startDate) {
      query += " AND created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND created_at <= ?";
      params.push(endDate + " 23:59:59");
    }

    query += ` GROUP BY period, event_name ORDER BY period DESC, event_count DESC LIMIT 500`;

    const rows = await db.prepare(query).all(...params);
    return NextResponse.json({ grouped: rows });
  }

  // --- Summary: event counts + unique users ---
  let summaryQuery = `
    SELECT
      event_name,
      COUNT(*) AS event_count,
      COUNT(DISTINCT user_id) AS unique_users
    FROM analytics_events
    WHERE 1=1
  `;
  const summaryParams: unknown[] = [];

  if (eventName) {
    summaryQuery += " AND event_name = ?";
    summaryParams.push(eventName);
  }
  if (startDate) {
    summaryQuery += " AND created_at >= ?";
    summaryParams.push(startDate);
  }
  if (endDate) {
    summaryQuery += " AND created_at <= ?";
    summaryParams.push(endDate + " 23:59:59");
  }

  summaryQuery += " GROUP BY event_name ORDER BY event_count DESC";

  const summary = await db.prepare(summaryQuery).all(...summaryParams);

  // --- Daily event counts for last 30 days ---
  const dailyQuery = `
    SELECT
      strftime('%Y-%m-%d', created_at) AS day,
      COUNT(*) AS event_count,
      COUNT(DISTINCT user_id) AS unique_users
    FROM analytics_events
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY day
    ORDER BY day ASC
  `;
  const daily = await db.prepare(dailyQuery).all();

  // --- Top active users ---
  const topUsersQuery = `
    SELECT
      user_id,
      COUNT(*) AS event_count,
      COUNT(DISTINCT event_name) AS distinct_events
    FROM analytics_events
    WHERE user_id IS NOT NULL
      AND created_at >= datetime('now', '-30 days')
    GROUP BY user_id
    ORDER BY event_count DESC
    LIMIT 10
  `;
  const topUsers = await db.prepare(topUsersQuery).all();

  // --- Funnel data ---
  const funnelQuery = `
    SELECT
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'user_signup') AS signups,
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'job_posted') AS jobs_posted,
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'bid_placed') AS bids_placed,
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'bid_accepted') AS bids_accepted,
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'job_completed') AS jobs_completed,
      (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'review_submitted') AS reviews_submitted
  `;
  const funnel = await db.prepare(funnelQuery).get();

  return NextResponse.json({ summary, daily, topUsers, funnel });
}
