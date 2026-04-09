import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/background-checks
 * List all contractors with background check requests (pending first, then others).
 */
export async function GET(request: NextRequest) {
  const { error: adminError } = await requireAdmin(request);
  if (adminError) return adminError;

  try {
    const db = getDb();
    await initializeDatabase();

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status"); // optional: "pending", "approved", "rejected"

    let query = `
      SELECT
        cp.user_id,
        u.name,
        u.email,
        u.location,
        cp.background_check_status,
        cp.background_check_requested_at,
        cp.background_check_notes
      FROM contractor_profiles cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.background_check_status != 'none'
    `;
    const params: string[] = [];

    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
      query += ` AND cp.background_check_status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY
      CASE cp.background_check_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
      cp.background_check_requested_at DESC`;

    const contractors = await db.prepare(query).all(...params);

    return NextResponse.json({ contractors });
  } catch (error) {
    logger.error({ err: error }, "Admin background checks GET error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/background-checks
 * Admin approves or rejects a background check.
 * Body: { userId, status: "approved" | "rejected", notes?: string }
 */
export async function PATCH(request: NextRequest) {
  const { error: adminError } = await requireAdmin(request);
  if (adminError) return adminError;

  try {
    const { userId, status, notes } = await request.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and status are required" }, { status: 400 });
    }
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    // Verify the contractor exists
    const profile = await db.prepare(
      `SELECT background_check_status FROM contractor_profiles WHERE user_id = ?`
    ).get(userId) as { background_check_status: string } | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    // Update background check status
    await db.prepare(
      `UPDATE contractor_profiles
       SET background_check_status = ?,
           background_check_notes = ?
       WHERE user_id = ?`
    ).run(status, notes || null, userId);

    // Send notification to the contractor
    const { v4: uuidv4 } = await import("uuid");
    const title = status === "approved"
      ? "Background Check Passed"
      : "Background Check Not Passed";
    const message = status === "approved"
      ? "Congratulations! Your background check has been approved. A verified badge is now visible on your profile."
      : `Your background check was not approved at this time.${notes ? ` Notes: ${notes}` : ""} Contact support for more information.`;

    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`
    ).run(uuidv4(), userId, `background_check_${status}`, title, message);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    logger.error({ err: error }, "Admin background checks PATCH error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
