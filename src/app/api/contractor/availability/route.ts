import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();
  const slots = await db.prepare(`
    SELECT * FROM contractor_availability
    WHERE contractor_id = ?
    ORDER BY day_of_week ASC, specific_date ASC, start_time ASC
  `).all(payload.userId);

  return NextResponse.json({ slots });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { day_of_week, specific_date, start_time, end_time, is_blocked, note } = body;

  if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
  }

  if (day_of_week === undefined && !specific_date) {
    return NextResponse.json({ error: "Either day_of_week or specific_date is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  const result = await db.prepare(`
    INSERT INTO contractor_availability (contractor_id, day_of_week, specific_date, start_time, end_time, is_blocked, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.userId,
    day_of_week ?? null,
    specific_date ?? null,
    start_time,
    end_time,
    is_blocked ? 1 : 0,
    note ?? null
  );

  return NextResponse.json({
    slot: { id: result.lastInsertRowid, contractor_id: payload.userId, day_of_week, specific_date, start_time, end_time, is_blocked: is_blocked ? 1 : 0, note }
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("id");
  if (!slotId) return NextResponse.json({ error: "Slot id is required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();
  const deleted = await db.prepare(
    "DELETE FROM contractor_availability WHERE id = ? AND contractor_id = ?"
  ).run(slotId, payload.userId);

  if (deleted.changes === 0) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
