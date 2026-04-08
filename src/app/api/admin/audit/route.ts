import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  old_value: string | null;
  new_value: string | null;
  reversible: number;
  reversed: number;
  created_at: string;
}

// GET — paginated audit log, newest first; optional entity_type filter
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;
  const entityType = searchParams.get("entity_type") ?? "";

  const db = getDb();
  await initializeDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (entityType) {
    conditions.push("entity_type = ?");
    params.push(entityType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await db.prepare(`
    SELECT * FROM admin_audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as AuditLogRow[];

  const total = (await db.prepare(`
    SELECT COUNT(*) as count FROM admin_audit_log ${where}
  `).get(...params) as { count: number }).count;

  const pages = Math.ceil(total / limit);

  const logs = rows.map((r) => ({
    ...r,
    old_value: r.old_value ? (() => { try { return JSON.parse(r.old_value!); } catch { return r.old_value; } })() : null,
    new_value: r.new_value ? (() => { try { return JSON.parse(r.new_value!); } catch { return r.new_value; } })() : null,
    reversible: r.reversible === 1,
    reversed: r.reversed === 1,
  }));

  return NextResponse.json({ logs, total, page, pages, limit });
}

// POST — undo a reversible action
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json() as { logId: string };

  if (!body.logId) {
    return NextResponse.json({ error: "logId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const logEntry = await db.prepare(
    "SELECT * FROM admin_audit_log WHERE id = ?"
  ).get(body.logId) as AuditLogRow | undefined;

  if (!logEntry) {
    return NextResponse.json({ error: "Audit log entry not found" }, { status: 404 });
  }
  if (logEntry.reversible !== 1) {
    return NextResponse.json({ error: "This action is not reversible" }, { status: 400 });
  }
  if (logEntry.reversed === 1) {
    return NextResponse.json({ error: "This action has already been reversed" }, { status: 400 });
  }

  let oldValue: Record<string, unknown> = {};
  try {
    if (logEntry.old_value) oldValue = JSON.parse(logEntry.old_value);
  } catch { /* keep empty */ }

  // Execute reverse action
  switch (logEntry.action) {
    case "suspend_user":
      await db.prepare("UPDATE contractor_profiles SET is_suspended = 0 WHERE user_id = ?").run(logEntry.entity_id);
      break;
    case "unsuspend_user":
      await db.prepare("UPDATE contractor_profiles SET is_suspended = 1 WHERE user_id = ?").run(logEntry.entity_id);
      break;
    case "make_admin":
      await db.prepare("UPDATE users SET is_admin = 0 WHERE id = ?").run(logEntry.entity_id);
      break;
    case "remove_admin":
      await db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(logEntry.entity_id);
      break;
    case "edit_user": {
      const userFields = ["name", "email", "phone", "location", "role"];
      const updates: string[] = [];
      const vals: (string | number | null)[] = [];
      for (const field of userFields) {
        if (oldValue[field] !== undefined) {
          updates.push(`${field} = ?`);
          vals.push(oldValue[field] as string | number | null);
        }
      }
      if (updates.length > 0) {
        vals.push(logEntry.entity_id);
        await db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...vals);
      }
      break;
    }
    case "edit_job": {
      const jobFields = ["title", "status", "urgency", "category", "location"];
      const updates: string[] = [];
      const vals: (string | number | null)[] = [];
      for (const field of jobFields) {
        if (oldValue[field] !== undefined) {
          updates.push(`${field} = ?`);
          vals.push(oldValue[field] as string | number | null);
        }
      }
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        vals.push(logEntry.entity_id);
        await db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).run(...vals);
      }
      break;
    }
    default:
      return NextResponse.json({ error: `No reverse handler for action: ${logEntry.action}` }, { status: 400 });
  }

  await db.prepare("UPDATE admin_audit_log SET reversed = 1 WHERE id = ?").run(body.logId);

  return NextResponse.json({ success: true });
}
