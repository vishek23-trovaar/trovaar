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

  const certifications = await db
    .prepare("SELECT * FROM certifications WHERE contractor_id = ? ORDER BY created_at DESC")
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
    const { name, issuer, issue_date, expiry_date, document_url, cert_number } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Certification name is required" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();
    const certId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO certifications (id, contractor_id, name, issuer, issue_date, expiry_date, document_url, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(certId, id, name.trim(), issuer || null, issue_date || null, expiry_date || null, document_url || null);

    const certification = await db.prepare("SELECT * FROM certifications WHERE id = ?").get(certId);
    return NextResponse.json({ certification }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create certification error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { certId, name, issuer, issue_date, expiry_date, document_url } = await request.json();
    if (!certId) {
      return NextResponse.json({ error: "certId is required" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    await db.prepare(`
      UPDATE certifications
      SET name = COALESCE(?, name),
          issuer = COALESCE(?, issuer),
          issue_date = COALESCE(?, issue_date),
          expiry_date = COALESCE(?, expiry_date),
          document_url = COALESCE(?, document_url)
      WHERE id = ? AND contractor_id = ?
    `).run(name || null, issuer || null, issue_date || null, expiry_date || null, document_url || null, certId, id);

    const certification = await db.prepare("SELECT * FROM certifications WHERE id = ?").get(certId);
    return NextResponse.json({ certification });
  } catch (error) {
    logger.error({ err: error }, "Update certification error");
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
  await db.prepare("DELETE FROM certifications WHERE id = ? AND contractor_id = ?").run(certId, id);

  return NextResponse.json({ success: true });
}
