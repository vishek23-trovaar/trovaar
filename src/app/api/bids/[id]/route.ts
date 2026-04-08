import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { issueStrike } from "@/lib/strikes";
import { sendBidAcceptedEmail } from "@/lib/email";
import { notifyBidAccepted, notifyBidRejected } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bidId } = await params;
  const { status } = await request.json();

  if (!["accepted", "rejected", "withdrawn"].includes(status)) {
    return NextResponse.json({ error: "Status must be accepted, rejected, or withdrawn" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const bid = await db.prepare(`
    SELECT b.*, j.consumer_id, j.title as job_title, j.status as job_status FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.id = ?
  `).get(bidId) as { job_id: string; consumer_id: string; contractor_id: string; job_title: string; status: string; job_status: string; price: number; availability_date: string } | undefined;

  if (!bid) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }

  // Contractors can withdraw their own bids; consumers can accept/reject
  if (status === "withdrawn") {
    if (bid.contractor_id !== payload.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!["pending", "accepted"].includes(bid.status)) {
      return NextResponse.json({ error: "Bid cannot be withdrawn in its current state" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const wasAccepted = bid.status === "accepted";

    // Wrap all withdrawal updates in a transaction for atomicity
    let strikeResult: { suspended: boolean; strikesInWindow: number } | null = null;
    await db.transaction(async (db) => {
      await db.prepare("UPDATE bids SET status = 'withdrawn' WHERE id = ?").run(bidId);

      if (wasAccepted) {
        // Reopen job for new bids
        await db.prepare("UPDATE jobs SET status = 'posted', updated_at = ? WHERE id = ?").run(now, bid.job_id);

        // Increment cancellation_count on contractor profile
        await db.prepare("UPDATE contractor_profiles SET cancellation_count = cancellation_count + 1 WHERE user_id = ?")
          .run(bid.contractor_id);

        // Issue cancellation strike
        strikeResult = await issueStrike(
          bid.contractor_id,
          "cancellation",
          bid.job_id,
          `Contractor withdrew accepted bid on job: ${bid.job_title}`
        );

        // Notify contractor of strike
        await db.prepare(
          "INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
          uuidv4(), bid.contractor_id, "cancellation_strike",
          "Cancellation Strike Issued",
          `You withdrew from "${bid.job_title}" after it was accepted. ${strikeResult.suspended ? "Your account has been suspended." : `You now have ${strikeResult.strikesInWindow} active strike(s).`}`,
          bid.job_id, now
        );

        // Notify consumer that job has been reopened
        await db.prepare(
          "INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
          uuidv4(), bid.consumer_id, "contractor_cancelled",
          "Contractor Cancelled",
          `Your contractor withdrew from "${bid.job_title}". Your job has been reopened for new bids.`,
          bid.job_id, now
        );
      }
    });

    const updated = await db.prepare("SELECT * FROM bids WHERE id = ?").get(bidId);
    return NextResponse.json({ bid: updated });
  }

  // Consumer-only: accept/reject
  if (bid.consumer_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (status === "accepted") {
    // Atomically accept bid — the WHERE clause on job status prevents race conditions
    // where two users try to accept different bids on the same job simultaneously
    let accepted = false;
    await db.transaction(async (db) => {
      const result = await db.prepare(
        "UPDATE jobs SET status = 'accepted', updated_at = datetime('now') WHERE id = ? AND status IN ('posted', 'bidding')"
      ).run(bid.job_id);
      if (result.changes === 0) {
        // Job was already accepted by another bid — abort
        accepted = false;
        return;
      }
      accepted = true;
      await db.prepare("UPDATE bids SET status = 'accepted' WHERE id = ?").run(bidId);
      await db.prepare("UPDATE bids SET status = 'rejected' WHERE job_id = ? AND id != ?").run(bid.job_id, bidId);
    });

    if (!accepted) {
      return NextResponse.json({ error: "This job has already been assigned to a contractor" }, { status: 409 });
    }

    try { trackEvent("bid_accepted", { userId: payload.userId, jobId: bid.job_id, properties: { bidId, contractorId: bid.contractor_id, price: bid.price } }); } catch {}

    // Update contractor_stats acceptance counts (Feature 23)
    await db.prepare(`
      INSERT INTO contractor_stats (contractor_id, total_bids, accepted_bids, acceptance_rate, updated_at)
      VALUES (?, 1, 1, 1.0, CURRENT_TIMESTAMP)
      ON CONFLICT(contractor_id) DO UPDATE SET
        accepted_bids = accepted_bids + 1,
        acceptance_rate = CAST(accepted_bids + 1 AS REAL) / total_bids,
        updated_at = CURRENT_TIMESTAMP
    `).run(bid.contractor_id);

    // Increment acceptance_count on contractor profile (Accountability System)
    await db.prepare("UPDATE contractor_profiles SET acceptance_count = acceptance_count + 1 WHERE user_id = ?")
      .run(bid.contractor_id);

    // Notify the winning contractor
    notifyBidAccepted(bid.contractor_id, bid.job_title, bid.job_id);

    // Send bid accepted email to contractor
    try {
      const contractor = await db.prepare("SELECT email, name FROM users WHERE id = ?").get(bid.contractor_id) as { email: string; name: string } | null;
      const client = await db.prepare("SELECT name FROM users WHERE id = ?").get(bid.consumer_id) as { name: string } | null;
      if (contractor && client) {
        await sendBidAcceptedEmail({
          toEmail: contractor.email,
          toName: contractor.name,
          jobTitle: bid.job_title,
          clientName: client.name,
          price: Math.round(bid.price / 100),
          availabilityDate: bid.availability_date,
          jobId: bid.job_id,
        });
      }
    } catch { /* never block bid acceptance */ }
  } else {
    await db.prepare("UPDATE bids SET status = 'rejected' WHERE id = ?").run(bidId);

    // Notify the contractor whose bid was rejected
    notifyBidRejected(bid.contractor_id, bid.job_title, bid.job_id);
  }

  const updated = await db.prepare("SELECT * FROM bids WHERE id = ?").get(bidId);
  return NextResponse.json({ bid: updated });
}
