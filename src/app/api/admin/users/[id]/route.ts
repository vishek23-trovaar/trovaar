import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await params;
  const { action } = await request.json() as {
    action: "suspend" | "unsuspend" | "make_admin" | "remove_admin";
  };

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const user = await db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as {
    id: string;
    role: string;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "suspend") {
    await db.prepare("UPDATE contractor_profiles SET is_suspended = 1 WHERE user_id = ?").run(userId);
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at)
      VALUES (?, ?, 'admin', 'Account Suspended', 'Your account has been suspended by an administrator. Please contact support.', datetime('now'))
    `).run(crypto.randomUUID(), userId);
  } else if (action === "unsuspend") {
    await db.prepare("UPDATE contractor_profiles SET is_suspended = 0 WHERE user_id = ?").run(userId);
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at)
      VALUES (?, ?, 'admin', 'Account Reinstated', 'Your account has been reinstated. You can now receive and bid on jobs.', datetime('now'))
    `).run(crypto.randomUUID(), userId);
  } else if (action === "make_admin") {
    await db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(userId);
  } else if (action === "remove_admin") {
    await db.prepare("UPDATE users SET is_admin = 0 WHERE id = ?").run(userId);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
