import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const contractorId = request.nextUrl.searchParams.get("contractorId");
  if (!contractorId) {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const items = db
    .prepare("SELECT * FROM portfolio_items WHERE contractor_id = ? ORDER BY created_at DESC")
    .all(contractorId);

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, title, description, before_photos, after_photos } = await request.json();

  if (!category || !title?.trim()) {
    return NextResponse.json({ error: "Category and title are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO portfolio_items (id, contractor_id, category, title, description, before_photos, after_photos)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    payload.userId,
    category,
    title.trim(),
    description?.trim() || null,
    JSON.stringify(before_photos || []),
    JSON.stringify(after_photos || [])
  );

  const item = await db.prepare("SELECT * FROM portfolio_items WHERE id = ?").get(id);
  return NextResponse.json({ item }, { status: 201 });
}
