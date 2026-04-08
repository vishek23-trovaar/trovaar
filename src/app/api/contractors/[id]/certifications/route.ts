import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const certifications = db
    .prepare("SELECT * FROM contractor_certifications WHERE contractor_id = ? ORDER BY year_obtained DESC")
    .all(id);

  return NextResponse.json({ certifications });
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
    const { name, issuer, year_obtained, document_url } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Certification name is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const certId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO contractor_certifications (id, contractor_id, name, issuer, year_obtained, verified, document_url)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(certId, id, name.trim(), issuer || null, year_obtained || null, document_url || null);

    const certification = await db.prepare("SELECT * FROM contractor_certifications WHERE id = ?").get(certId);
    return NextResponse.json({ certification }, { status: 201 });
  } catch (error) {
    console.error("Create certification error:", error);
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
  const certId = searchParams.get("certId");
  if (!certId) {
    return NextResponse.json({ error: "certId query param required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();
  await db.prepare("DELETE FROM contractor_certifications WHERE id = ? AND contractor_id = ?").run(certId, id);

  return NextResponse.json({ success: true });
}
