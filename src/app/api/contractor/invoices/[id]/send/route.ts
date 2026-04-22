import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/contractor/invoices/[id]/send — Mark invoice as sent / email to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  const invoice = await db.prepare(`
    SELECT * FROM invoices WHERE id = ? AND contractor_id = ?
  `).get(id, payload.userId) as Record<string, unknown> | undefined;

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Mark as sent
  db.prepare(`
    UPDATE invoices SET status = 'sent', sent_at = datetime('now') WHERE id = ?
  `).run(id);

  return NextResponse.json({ success: true, message: "Invoice sent" });
}
