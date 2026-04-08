import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; helpId: string }> }
) {
  const { id, helpId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const hr = await db.prepare(
    "SELECT * FROM job_help_requests WHERE id = ? AND job_id = ?"
  ).get(helpId, id) as {
    id: string; lead_contractor_id: string; status: string; spots: number; spots_filled: number;
  } | undefined;

  if (!hr) return NextResponse.json({ error: "Help request not found" }, { status: 404 });
  if (hr.lead_contractor_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { action } = await request.json() as { action: string };

  if (action === "cancel") {
    db.prepare("UPDATE job_help_requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(helpId);
    return NextResponse.json({ message: "Help request cancelled" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; helpId: string }> }
) {
  const { id, helpId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const hr = await db.prepare(
    "SELECT * FROM job_help_requests WHERE id = ? AND job_id = ?"
  ).get(helpId, id) as { lead_contractor_id: string; status: string } | undefined;

  if (!hr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (hr.lead_contractor_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (hr.status !== "open") {
    return NextResponse.json({ error: "Can only delete open requests" }, { status: 400 });
  }

  await db.prepare("DELETE FROM job_help_requests WHERE id = ?").run(helpId);
  return NextResponse.json({ message: "Deleted" });
}
