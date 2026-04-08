import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { issueStrike } from "@/lib/strikes";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "consumer") return NextResponse.json({ error: "Consumers only" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare(`
    SELECT j.*, b.contractor_id as accepted_contractor_id, b.id as bid_id
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ? AND j.consumer_id = ?
  `).get(id, payload.userId) as {
    id: string; consumer_id: string; title: string; status: string;
    accepted_contractor_id: string | null; bid_id: string | null;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.accepted_contractor_id) return NextResponse.json({ error: "No accepted contractor" }, { status: 400 });
  if (!["accepted", "en_route", "arrived"].includes(job.status)) {
    return NextResponse.json({ error: "Job is not in a reportable state" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Wrap all no-show updates in a transaction for atomicity
  let strikeResult: { suspended: boolean; strikesInWindow: number };
  await db.transaction(async (db) => {
    // Update no_show_count on contractor profile
    await db.prepare(`UPDATE contractor_profiles SET no_show_count = no_show_count + 1 WHERE user_id = ?`)
      .run(job.accepted_contractor_id);

    // Issue a strike
    strikeResult = await issueStrike(job.accepted_contractor_id!, "no_show", id, `No-show reported on job: ${job.title}`);

    // Reopen the job so consumer can get new bids
    await db.prepare(`UPDATE jobs SET status = 'posted', updated_at = ? WHERE id = ?`).run(now, id);

    // Reject the accepted bid
    if (job.bid_id) {
      await db.prepare(`UPDATE bids SET status = 'rejected' WHERE id = ?`).run(job.bid_id);
    }

    // Release any completion bond
    await db.prepare(`UPDATE completion_bonds SET status = 'forfeited', resolved_at = ? WHERE job_id = ?`).run(now, id);

    // Notify the contractor
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
      VALUES (?, ?, 'no_show_strike', ?, ?, ?, ?)
    `).run(
      randomUUID(), job.accepted_contractor_id, "No-Show Strike Issued",
      `A no-show was reported on "${job.title}". ${strikeResult!.suspended ? "Your account has been suspended." : `You now have ${strikeResult!.strikesInWindow} active strike(s).`}`,
      id, now
    );
  });

  return NextResponse.json({
    message: "No-show reported. Job has been reopened.",
    strikeResult: strikeResult!,
  });
}
