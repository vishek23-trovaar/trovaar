import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { ids, action, type } = await request.json() as { ids: string[]; action: string; type?: string };
  if (!ids?.length || !action) {
    return NextResponse.json({ error: "ids and action required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const placeholders = ids.map(() => "?").join(",");

  if (type === "jobs") {
    // Jobs bulk actions
    if (action === "delete") {
      db.prepare(`DELETE FROM bids WHERE job_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM jobs WHERE id IN (${placeholders})`).run(...ids);
    } else {
      return NextResponse.json({ error: "Invalid action for jobs" }, { status: 400 });
    }
  } else {
    // Users bulk actions (default)
    if (action === "suspend") {
      db.prepare(`UPDATE contractor_profiles SET is_suspended = 1 WHERE user_id IN (${placeholders})`).run(...ids);
    } else if (action === "unsuspend") {
      db.prepare(`UPDATE contractor_profiles SET is_suspended = 0 WHERE user_id IN (${placeholders})`).run(...ids);
    } else if (action === "delete") {
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true, affected: ids.length });
}
