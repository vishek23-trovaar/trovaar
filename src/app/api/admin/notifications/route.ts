import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const db = getDb();
  await initializeDatabase();
  const notifications = await db.prepare("SELECT * FROM admin_notifications ORDER BY sent_at DESC LIMIT 50").all();
  return NextResponse.json({ notifications });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { title, message, target } = await request.json() as { title: string; message: string; target: string };
  if (!title || !message) return NextResponse.json({ error: "title and message required" }, { status: 400 });
  const db = getDb();
  await initializeDatabase();
  const validTargets = ["all", "consumers", "contractors"];
  const t = validTargets.includes(target) ? target : "all";
  const role = t === "consumers" ? "consumer" : "contractor";
  const recipientCount = (t === "all"
    ? await db.prepare("SELECT COUNT(*) as c FROM users").get()
    : await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = ?").get(role)
  ) as {c:number};
  const count = recipientCount.c;
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO admin_notifications (id, title, message, target, recipient_count) VALUES (?, ?, ?, ?, ?)")
    .run(id, title, message, t, count);
  return NextResponse.json({ success: true, id, recipientCount: count });
}
