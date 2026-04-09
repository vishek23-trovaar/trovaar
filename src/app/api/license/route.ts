import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import crypto from "crypto";
import logger from "@/lib/logger";

// POST /api/license — Submit trade license for verification
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { license_number, license_state, license_type, document_url } = await request.json();

    if (!license_number || !license_number.trim()) {
      return NextResponse.json({ error: "license_number is required" }, { status: 400 });
    }
    if (!license_state || !license_state.trim()) {
      return NextResponse.json({ error: "license_state is required" }, { status: 400 });
    }
    if (!license_type || !license_type.trim()) {
      return NextResponse.json({ error: "license_type is required" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    // Update contractor_profiles with license info
    db.prepare(`
      UPDATE contractor_profiles
      SET license_number = ?, license_state = ?
      WHERE user_id = ?
    `).run(license_number.trim(), license_state.trim(), payload.userId);

    // Insert a certification entry for tracking / admin review
    const certId = crypto.randomUUID();
    const certName = `Trade License: ${license_type.trim()}`;
    const issuer = `${license_state.trim()} State Board`;

    db.prepare(`
      INSERT INTO certifications (id, contractor_id, name, issuer, issue_date, expiry_date, document_url, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(certId, payload.userId, certName, issuer, null, null, document_url || null);

    return NextResponse.json({
      success: true,
      message: "Trade license submitted for verification",
      certification: {
        id: certId,
        contractor_id: payload.userId,
        name: certName,
        issuer,
        document_url: document_url || null,
        verified: 0,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "License submission error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/license — Return current license info for the authenticated contractor
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    await initializeDatabase();

    const profile = await db.prepare(`
      SELECT license_number, license_state
      FROM contractor_profiles
      WHERE user_id = ?
    `).get(payload.userId) as { license_number: string | null; license_state: string | null } | undefined;

    // Find any Trade License certifications for this contractor
    const licenseCerts = await db.prepare(`
      SELECT id, name, issuer, document_url, verified, created_at
      FROM certifications
      WHERE contractor_id = ? AND name LIKE 'Trade License:%'
      ORDER BY created_at DESC
    `).all(payload.userId);

    return NextResponse.json({
      license_number: profile?.license_number || null,
      license_state: profile?.license_state || null,
      submissions: licenseCerts,
    });
  } catch (error) {
    logger.error({ err: error }, "License fetch error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
