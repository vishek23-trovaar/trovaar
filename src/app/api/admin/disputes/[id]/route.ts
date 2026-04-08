import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { issueStrike } from "@/lib/strikes";
import { stripe } from "@/lib/stripe";

// POST /api/admin/disputes/[id] — admin proposes a resolution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json() as {
    resolution_type: string;
    client_refund_cents: number;
    contractor_payout_cents: number;
    admin_notes?: string;
    strike_consumer?: boolean;
    strike_contractor?: boolean;
  };

  if (!body.resolution_type) {
    return NextResponse.json({ error: "resolution_type is required" }, { status: 400 });
  }

  const VALID_RESOLUTION_TYPES = ["pending", "full_refund", "partial_refund", "no_refund", "split"];
  if (!VALID_RESOLUTION_TYPES.includes(body.resolution_type)) {
    return NextResponse.json({
      error: `resolution_type must be one of: ${VALID_RESOLUTION_TYPES.join(", ")}`,
    }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const dispute = await db.prepare(`
    SELECT d.*, j.consumer_id, j.title AS job_title,
           b.contractor_id
    FROM disputes d
    JOIN jobs j ON j.id = d.job_id
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE d.id = ?
  `).get(disputeId) as {
    id: string;
    job_id: string;
    consumer_id: string;
    contractor_id: string | null;
    job_title: string;
  } | undefined;

  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  // Upsert dispute_resolutions
  const existing = await db.prepare("SELECT id FROM dispute_resolutions WHERE dispute_id = ?").get(disputeId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE dispute_resolutions
      SET resolution_type = ?, client_refund_cents = ?, contractor_payout_cents = ?,
          admin_notes = ?, client_accepted = 0, contractor_accepted = 0,
          final_resolution = 0, updated_at = datetime('now')
      WHERE dispute_id = ?
    `).run(
      body.resolution_type,
      body.client_refund_cents ?? 0,
      body.contractor_payout_cents ?? 0,
      body.admin_notes ?? null,
      disputeId
    );
  } else {
    db.prepare(`
      INSERT INTO dispute_resolutions
        (id, dispute_id, resolution_type, client_refund_cents, contractor_payout_cents, admin_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      disputeId,
      body.resolution_type,
      body.client_refund_cents ?? 0,
      body.contractor_payout_cents ?? 0,
      body.admin_notes ?? null
    );
  }

  // Update dispute resolution_status
  db.prepare("UPDATE disputes SET resolution_status = 'proposed', updated_at = datetime('now') WHERE id = ?").run(disputeId);

  // Notify both parties
  const notifyUsers = [dispute.consumer_id, dispute.contractor_id].filter(Boolean) as string[];
  for (const userId of notifyUsers) {
    try {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
        VALUES (?, ?, 'dispute_resolution_proposed', 'Resolution Proposed', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        userId,
        `A resolution has been proposed for your dispute regarding "${dispute.job_title}". Please review and respond.`,
        dispute.job_id
      );
    } catch { /* non-blocking */ }
  }

  // Issue strikes if requested
  if (body.strike_contractor && dispute.contractor_id) {
    try {
      issueStrike(dispute.contractor_id, "misconduct", dispute.job_id, `Dispute resolution strike: ${body.admin_notes || "Admin action"}`);
      // Notify contractor about the strike
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
        VALUES (?, ?, 'strike_issued', 'Warning Issued', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        dispute.contractor_id,
        `A warning/strike has been issued on your account related to a dispute for "${dispute.job_title}".`,
        dispute.job_id
      );
    } catch { /* non-blocking */ }
  }

  if (body.strike_consumer) {
    try {
      // For consumers we just send a warning notification (strikes system is contractor-focused)
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
        VALUES (?, ?, 'warning_issued', 'Warning Issued', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        dispute.consumer_id,
        `A warning has been issued on your account related to a dispute for "${dispute.job_title}".`,
        dispute.job_id
      );
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/disputes/[id] — update dispute status (e.g. mark investigating)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json() as { status?: string };

  const VALID_STATUSES = ["open", "investigating", "resolved", "rejected"];
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const dispute = await db.prepare("SELECT id FROM disputes WHERE id = ?").get(disputeId) as { id: string } | undefined;
  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  db.prepare("UPDATE disputes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(body.status, disputeId);

  return NextResponse.json({ success: true });
}
