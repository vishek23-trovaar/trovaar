import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface DbRow {
  job_id: string;
  job_title: string;
  job_category: string;
  job_status: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

// GET /api/messages — list all conversations for the current user
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();

  // Fetch all jobs the user is part of (as consumer or accepted contractor)
  let rows: DbRow[];

  if (payload.role === "consumer") {
    rows = await db.prepare(`
      SELECT
        j.id          AS job_id,
        j.title       AS job_title,
        j.category    AS job_category,
        j.status      AS job_status,
        u.id          AS other_user_id,
        u.name        AS other_user_name,
        (SELECT content FROM messages WHERE job_id = j.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE job_id = j.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        (SELECT COUNT(*) FROM messages WHERE job_id = j.id AND receiver_id = ? AND read = 0) AS unread_count
      FROM jobs j
      JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      JOIN users u ON u.id = b.contractor_id
      WHERE j.consumer_id = ?
      ORDER BY last_message_at DESC NULLS LAST
    `).all(payload.userId, payload.userId) as DbRow[];
  } else {
    rows = await db.prepare(`
      SELECT
        j.id          AS job_id,
        j.title       AS job_title,
        j.category    AS job_category,
        j.status      AS job_status,
        u.id          AS other_user_id,
        u.name        AS other_user_name,
        (SELECT content FROM messages WHERE job_id = j.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE job_id = j.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        (SELECT COUNT(*) FROM messages WHERE job_id = j.id AND receiver_id = ? AND read = 0) AS unread_count
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      JOIN users u ON u.id = j.consumer_id
      WHERE b.contractor_id = ? AND b.status = 'accepted'
      ORDER BY last_message_at DESC NULLS LAST
    `).all(payload.userId, payload.userId) as DbRow[];
  }

  return NextResponse.json({ conversations: rows });
}
