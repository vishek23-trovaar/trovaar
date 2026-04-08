import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const db = getDb();
  await initializeDatabase();
  const status = new URL(request.url).searchParams.get("status");
  const tickets = await db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM support_tickets t
    JOIN users u ON u.id = t.user_id
    ${status ? "WHERE t.status = ?" : ""}
    ORDER BY
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      t.created_at DESC
    LIMIT 100
  `).all(...(status ? [status] : []));

  const counts = {
    open: (await db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'").get() as {c:number}).c,
    in_progress: (await db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'in_progress'").get() as {c:number}).c,
    resolved: (await db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'resolved'").get() as {c:number}).c,
  };
  return NextResponse.json({ tickets, counts });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id, status, priority, admin_notes } = await request.json() as Record<string, string>;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initializeDatabase();
  const updates: string[] = [];
  const params: unknown[] = [];
  if (status) { updates.push("status = ?"); params.push(status); }
  if (priority) { updates.push("priority = ?"); params.push(priority); }
  if (admin_notes !== undefined) { updates.push("admin_notes = ?"); params.push(admin_notes); }
  if (status === "resolved") { updates.push("resolved_at = datetime('now')"); }
  updates.push("updated_at = datetime('now')");
  params.push(id);
  await db.prepare(`UPDATE support_tickets SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  return NextResponse.json({ success: true });
}
