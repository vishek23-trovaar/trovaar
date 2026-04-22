import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/contractor/clients/[id]/notes — Save a note about a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { note } = await request.json();
  if (!note || typeof note !== "string") {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Ensure the client_notes table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_notes (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT (datetime('now')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO client_notes (id, contractor_id, client_id, note)
    VALUES (?, ?, ?, ?)
  `).run(id, payload.userId, clientId, note.slice(0, 2000));

  return NextResponse.json({ success: true, id });
}

// GET /api/contractor/clients/[id]/notes — Get notes about a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  // Table may not exist yet
  try {
    const notes = await db.prepare(`
      SELECT * FROM client_notes
      WHERE contractor_id = ? AND client_id = ?
      ORDER BY created_at DESC
    `).all(payload.userId, clientId) as Array<Record<string, unknown>>;
    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json({ notes: [] });
  }
}
