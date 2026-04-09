import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

/**
 * GET /api/background-check
 * Returns the current background check status for the authenticated contractor.
 */
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can access background check status" }, { status: 403 });
  }

  try {
    const db = getDb();
    await initializeDatabase();

    const profile = await db.prepare(
      `SELECT background_check_status, background_check_requested_at, background_check_notes
       FROM contractor_profiles WHERE user_id = ?`
    ).get(payload.userId) as {
      background_check_status: string;
      background_check_requested_at: string | null;
      background_check_notes: string | null;
    } | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: profile.background_check_status,
      requested_at: profile.background_check_requested_at,
      notes: profile.background_check_notes,
    });
  } catch (error) {
    logger.error({ err: error }, "Background check GET error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/background-check
 * Contractor requests a background check. Sets status to 'pending'.
 */
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can request a background check" }, { status: 403 });
  }

  try {
    const db = getDb();
    await initializeDatabase();

    // Check current status
    const profile = await db.prepare(
      `SELECT background_check_status FROM contractor_profiles WHERE user_id = ?`
    ).get(payload.userId) as { background_check_status: string } | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }
    if (profile.background_check_status === "approved") {
      return NextResponse.json({ error: "Background check already approved" }, { status: 400 });
    }
    if (profile.background_check_status === "pending") {
      return NextResponse.json({ error: "Background check request already pending review" }, { status: 400 });
    }

    // Set status to pending and record timestamp
    await db.prepare(
      `UPDATE contractor_profiles
       SET background_check_status = 'pending',
           background_check_requested_at = NOW(),
           background_check_notes = NULL
       WHERE user_id = ?`
    ).run(payload.userId);

    // Create notification for admins (stored as a notification for admin users)
    const { v4: uuidv4 } = await import("uuid");

    // Get contractor name for the notification
    const user = await db.prepare(
      `SELECT name FROM users WHERE id = ?`
    ).get(payload.userId) as { name: string } | undefined;

    // Get all admin users to notify them
    const admins = await db.prepare(
      `SELECT id FROM users WHERE role = 'admin'`
    ).all() as { id: string }[];

    for (const admin of admins) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`
      ).run(
        uuidv4(),
        admin.id,
        "background_check_request",
        "New Background Check Request",
        `${user?.name ?? "A contractor"} has requested a background check. Review it in the admin panel.`
      );
    }

    return NextResponse.json({
      success: true,
      status: "pending",
    });
  } catch (error) {
    logger.error({ err: error }, "Background check POST error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
