import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/notifications — fetch current user's notifications
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const notifications = await db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(payload.userId);

  const unreadCount = await db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
  ).get(payload.userId) as { count: number };

  return NextResponse.json({ notifications, unreadCount: unreadCount.count });
}

// PATCH /api/notifications — mark all as read
export async function PATCH(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json().catch(() => ({ ids: null }));
  const db = getDb();
  await initializeDatabase();

  if (ids && Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await db.prepare(`UPDATE notifications SET read = 1 WHERE id IN (${placeholders}) AND user_id = ?`)
      .run(...ids, payload.userId);
  } else {
    await db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(payload.userId);
  }

  return NextResponse.json({ success: true });
}
