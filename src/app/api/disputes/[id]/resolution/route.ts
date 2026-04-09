import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import logger from "@/lib/logger";

interface DisputeResolutionRow {
  id: string;
  dispute_id: string;
  resolution_type: string;
  client_refund_cents: number;
  contractor_payout_cents: number;
  admin_notes: string | null;
  client_accepted: number;
  contractor_accepted: number;
  final_resolution: number;
}

interface DisputeRow {
  id: string;
  job_id: string;
  reporter_id: string;
  resolution_status: string;
}

interface JobRow {
  id: string;
  consumer_id: string;
  title: string;
}

interface BidRow {
  contractor_id: string;
}

// PATCH /api/disputes/[id]/resolution — party accepts or rejects a proposed resolution
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { action: "accept" | "reject" };

  if (!body.action || (body.action !== "accept" && body.action !== "reject")) {
    return NextResponse.json({ error: "action must be accept or reject" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const dispute = await db.prepare("SELECT * FROM disputes WHERE id = ?").get(disputeId) as DisputeRow | undefined;
  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  const job = await db.prepare("SELECT id, consumer_id, title FROM jobs WHERE id = ?").get(dispute.job_id) as JobRow | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const bid = await db.prepare(
    "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
  ).get(dispute.job_id) as BidRow | undefined;

  const resolution = await db.prepare(
    "SELECT * FROM dispute_resolutions WHERE dispute_id = ?"
  ).get(disputeId) as DisputeResolutionRow | undefined;

  if (!resolution) {
    return NextResponse.json({ error: "No resolution has been proposed yet" }, { status: 404 });
  }

  const isConsumer = payload.userId === job.consumer_id;
  const isContractor = bid && payload.userId === bid.contractor_id;

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "You are not a party in this dispute" }, { status: 403 });
  }

  if (body.action === "reject") {
    // On rejection, reset accepted flags and mark status as rejected
    db.prepare(`
      UPDATE dispute_resolutions
      SET client_accepted = 0, contractor_accepted = 0, final_resolution = 0,
          updated_at = datetime('now')
      WHERE dispute_id = ?
    `).run(disputeId);

    db.prepare(
      "UPDATE disputes SET resolution_status = 'rejected', updated_at = datetime('now') WHERE id = ?"
    ).run(disputeId);

    // Notify the other party about the rejection
    try {
      const otherPartyId = isConsumer ? bid?.contractor_id : job.consumer_id;
      if (otherPartyId) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
          VALUES (?, ?, 'dispute_resolution_rejected', 'Resolution Rejected', ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          otherPartyId,
          `The proposed resolution for the dispute on "${job.title}" has been rejected. Our team will follow up.`,
          dispute.job_id
        );
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  // Accept: update the appropriate flag
  if (isConsumer) {
    db.prepare(
      "UPDATE dispute_resolutions SET client_accepted = 1, updated_at = datetime('now') WHERE dispute_id = ?"
    ).run(disputeId);
  } else {
    db.prepare(
      "UPDATE dispute_resolutions SET contractor_accepted = 1, updated_at = datetime('now') WHERE dispute_id = ?"
    ).run(disputeId);
  }

  // Re-fetch to check if both have accepted
  const updated = await db.prepare(
    "SELECT * FROM dispute_resolutions WHERE dispute_id = ?"
  ).get(disputeId) as DisputeResolutionRow;

  if (updated.client_accepted === 1 && updated.contractor_accepted === 1) {
    // Both accepted — finalize
    db.prepare(
      "UPDATE dispute_resolutions SET final_resolution = 1, updated_at = datetime('now') WHERE dispute_id = ?"
    ).run(disputeId);
    db.prepare(
      "UPDATE disputes SET resolution_status = 'resolved', status = 'resolved', updated_at = datetime('now') WHERE id = ?"
    ).run(disputeId);

    // Issue Stripe refund if client_refund_cents > 0
    if (updated.client_refund_cents > 0) {
      try {
        const jobForRefund = await db.prepare(
          "SELECT payment_intent_id FROM jobs WHERE id = ?"
        ).get(dispute.job_id) as { payment_intent_id: string | null } | undefined;

        if (jobForRefund?.payment_intent_id) {
          await stripe.refunds.create({
            payment_intent: jobForRefund.payment_intent_id,
            amount: updated.client_refund_cents,
          });
        }
      } catch (refundErr) {
        logger.error({ err: refundErr }, "Failed to issue Stripe refund for dispute");
        // Don't block resolution — admin can manually refund
      }
    }

    // Notify both parties that the dispute has been resolved
    const notifyUsers = [job.consumer_id, bid?.contractor_id].filter(Boolean) as string[];
    const resType = updated.resolution_type.replace(/_/g, " ");
    for (const userId of notifyUsers) {
      try {
        const refundInfo = userId === job.consumer_id
          ? `Refund: $${(updated.client_refund_cents / 100).toFixed(2)}`
          : `Payout: $${(updated.contractor_payout_cents / 100).toFixed(2)}`;
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
          VALUES (?, ?, 'dispute_resolved', 'Dispute Resolved', ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          userId,
          `The dispute for "${job.title}" has been resolved (${resType}). ${refundInfo}. Thank you for your cooperation.`,
          dispute.job_id
        );
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, status: "resolved" });
  }

  // Notify the other party that one side has accepted
  try {
    const otherPartyId = isConsumer ? bid?.contractor_id : job.consumer_id;
    if (otherPartyId) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
        VALUES (?, ?, 'dispute_resolution_accepted', 'Resolution Accepted', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        otherPartyId,
        `The other party has accepted the proposed resolution for "${job.title}". Please review and respond.`,
        dispute.job_id
      );
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, status: "pending_other_party" });
}
