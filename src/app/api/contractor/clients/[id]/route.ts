import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: consumerId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  // Get client info
  const client = await db.prepare(`
    SELECT u.id, u.name, u.email, u.location, u.phone
    FROM users u WHERE u.id = ?
  `).get(consumerId) as Record<string, unknown> | undefined;

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Get past jobs with this client
  const jobs = await db.prepare(`
    SELECT j.id, j.title, j.category, j.status, j.completed_at, j.created_at,
           b.price, b.labor_cents, b.materials_json
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.contractor_id = ? AND j.consumer_id = ? AND b.status = 'accepted'
    ORDER BY j.completed_at DESC, j.created_at DESC
  `).all(payload.userId, consumerId) as Array<Record<string, unknown>>;

  // Get notes/favorite from contractor_clients table
  const clientRecord = await db.prepare(
    "SELECT notes, is_favorite FROM contractor_clients WHERE contractor_id = ? AND consumer_id = ?"
  ).get(payload.userId, consumerId) as { notes: string | null; is_favorite: number } | undefined;

  return NextResponse.json({
    client: {
      ...client,
      notes: clientRecord?.notes ?? null,
      is_favorite: clientRecord?.is_favorite ?? 0,
    },
    jobs,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: consumerId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { notes, is_favorite } = body;

  const db = getDb();
  await initializeDatabase();

  // Upsert the contractor_clients record
  db.prepare(`
    INSERT INTO contractor_clients (contractor_id, consumer_id, notes, is_favorite)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(contractor_id, consumer_id) DO UPDATE SET
      notes = COALESCE(excluded.notes, contractor_clients.notes),
      is_favorite = COALESCE(excluded.is_favorite, contractor_clients.is_favorite)
  `).run(
    payload.userId,
    consumerId,
    notes ?? null,
    is_favorite !== undefined ? (is_favorite ? 1 : 0) : null
  );

  return NextResponse.json({ success: true });
}
