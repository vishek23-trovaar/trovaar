import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { adminLogger as logger } from "@/lib/logger";

// GET /api/admin/licenses — List all pending license verifications
export async function GET(request: NextRequest) {
  const { error: adminError } = await requireAdmin(request);
  if (adminError) return adminError;

  const db = getDb();
  await initializeDatabase();

  const pending = db.prepare(`
    SELECT
      c.id AS cert_id,
      c.contractor_id AS user_id,
      c.name AS cert_name,
      c.issuer,
      c.document_url,
      c.verified,
      c.created_at,
      cp.license_number,
      cp.license_state,
      u.name,
      u.email
    FROM certifications c
    JOIN contractor_profiles cp ON cp.user_id = c.contractor_id
    JOIN users u ON u.id = c.contractor_id
    WHERE c.name LIKE 'Trade License:%' AND c.verified = 0
    ORDER BY c.created_at ASC
  `).all();

  return NextResponse.json({ licenses: pending });
}

// PATCH /api/admin/licenses — Approve or reject a license submission
export async function PATCH(request: NextRequest) {
  const { error: adminError } = await requireAdmin(request);
  if (adminError) return adminError;

  try {
    const { userId, status, notes } = await request.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and status are required" }, { status: 400 });
    }
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    // Update the Trade License certification(s) for this contractor
    const newVerified = status === "approved" ? 1 : 0;
    db.prepare(`
      UPDATE certifications
      SET verified = ?
      WHERE contractor_id = ? AND name LIKE 'Trade License:%' AND verified = 0
    `).run(newVerified, userId);

    // Send notification to the contractor
    const title = status === "approved"
      ? "Trade License Approved"
      : "Trade License Review Update";
    const message = status === "approved"
      ? "Your trade license has been verified and is now visible on your profile."
      : `Your trade license submission was not approved.${notes ? ` Note: ${notes}` : " Contact support for more information."}`;

    await createNotification(userId, `license_${status}`, title, message);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    logger.error({ err: error }, "Admin license review error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
