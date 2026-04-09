import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { CATEGORY_GROUPS } from "@/lib/constants";

// Seed the admin_categories table from constants if empty
async function ensureSeeded(db: ReturnType<typeof getDb>) {
  const count = (await db.prepare("SELECT COUNT(*) as c FROM admin_categories").get() as { c: number }).c;
  if (count > 0) return;
  let order = 0;
  for (const group of CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      await db.prepare(
        "INSERT OR IGNORE INTO admin_categories (value, label, group_label, icon, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)"
      ).run(cat.value, cat.label, group.label, group.icon, order++);
    }
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const db = getDb();
  await initializeDatabase();
  await ensureSeeded(db);

  const cats = await db.prepare(`
    SELECT ac.value, ac.label, ac.group_label, ac.icon, ac.active, ac.sort_order,
           COUNT(j.id) as job_count
    FROM admin_categories ac
    LEFT JOIN jobs j ON j.category = ac.value
    GROUP BY ac.value, ac.label, ac.group_label, ac.icon, ac.active, ac.sort_order
    ORDER BY ac.sort_order ASC, ac.label ASC
  `).all() as Array<{
    value: string; label: string; group_label: string; icon: string;
    active: number; sort_order: number; job_count: number;
  }>;

  return NextResponse.json({ categories: cats });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const { value, label, group_label, icon } = body;

  if (!value || !label || !group_label) {
    return NextResponse.json({ error: "value, label, group_label are required" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    return NextResponse.json({ error: "value must be lowercase letters, digits, underscores only" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  await ensureSeeded(db);

  try {
    await db.prepare(
      "INSERT INTO admin_categories (value, label, group_label, icon, active, sort_order) VALUES (?, ?, ?, ?, 1, (SELECT COALESCE(MAX(sort_order),0)+1 FROM admin_categories))"
    ).run(value, label, group_label, icon ?? "🔧");
  } catch {
    return NextResponse.json({ error: "Category value already exists" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json();
  const { value, active, label, icon } = body;

  if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();
  await ensureSeeded(db);

  const fields: string[] = [];
  const vals: unknown[] = [];

  if (active !== undefined) { fields.push("active = ?"); vals.push(active ? 1 : 0); }
  if (label !== undefined) { fields.push("label = ?"); vals.push(label); }
  if (icon !== undefined) { fields.push("icon = ?"); vals.push(icon); }

  if (fields.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(value);
  await db.prepare(`UPDATE admin_categories SET ${fields.join(", ")} WHERE value = ?`).run(...vals);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { value } = await request.json();
  if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();
  const jobCount = (await db.prepare("SELECT COUNT(*) as c FROM jobs WHERE category = ?").get(value) as { c: number }).c;
  if (jobCount > 0) {
    return NextResponse.json({ error: `Cannot delete — ${jobCount} jobs use this category. Deactivate it instead.` }, { status: 409 });
  }

  await db.prepare("DELETE FROM admin_categories WHERE value = ?").run(value);
  return NextResponse.json({ success: true });
}
