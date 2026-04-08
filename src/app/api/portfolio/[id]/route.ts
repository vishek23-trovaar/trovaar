import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const item = await db
    .prepare("SELECT * FROM portfolio_items WHERE id = ?")
    .get(id) as { contractor_id: string } | undefined;

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (item.contractor_id !== payload.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.prepare("DELETE FROM portfolio_items WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
