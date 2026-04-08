import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  await initializeDatabase();
  const templates = await db.prepare("SELECT * FROM job_templates WHERE consumer_id = ? ORDER BY created_at DESC").all(payload.userId);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, title, description, category, urgency, location, budget_range } = await request.json() as Record<string, string>;
  if (!name || !title || !category) return NextResponse.json({ error: "name, title, category required" }, { status: 400 });
  const db = getDb();
  await initializeDatabase();
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO job_templates (id, consumer_id, name, title, description, category, urgency, location, budget_range, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(id, payload.userId, name, title, description ?? null, category, urgency ?? "medium", location ?? null, budget_range ?? null);
  return NextResponse.json({ success: true, id });
}

export async function DELETE(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initializeDatabase();
  const t = await db.prepare("SELECT id FROM job_templates WHERE id = ? AND consumer_id = ?").get(id, payload.userId);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM job_templates WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
