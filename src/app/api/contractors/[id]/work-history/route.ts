import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import crypto from "crypto";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const workHistory = db
    .prepare("SELECT * FROM contractor_work_history WHERE contractor_id = ? ORDER BY start_year DESC")
    .all(id);

  return NextResponse.json({ workHistory });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const { company_name, role, start_year, end_year } = await request.json();

    if (!company_name || !company_name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const entryId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO contractor_work_history (id, contractor_id, company_name, role, start_year, end_year, verified)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(entryId, id, company_name.trim(), role || null, start_year || null, end_year || null);

    const entry = await db.prepare("SELECT * FROM contractor_work_history WHERE id = ?").get(entryId);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create work history error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("entryId");
  if (!entryId) {
    return NextResponse.json({ error: "entryId query param required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  await db.prepare("DELETE FROM contractor_work_history WHERE id = ? AND contractor_id = ?").run(entryId, id);

  return NextResponse.json({ success: true });
}
