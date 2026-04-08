import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { initiateCall } from "@/lib/voice";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId, receiverId } = (await request.json()) as {
    jobId: string;
    receiverId: string;
  };

  if (!jobId || !receiverId) {
    return NextResponse.json(
      { error: "jobId and receiverId are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  await initializeDatabase();

  // Verify both users are part of this job
  const job = await db
    .prepare(
      `
      SELECT j.id, j.consumer_id, b.contractor_id as accepted_contractor_id
      FROM jobs j
      LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
      WHERE j.id = ?
    `
    )
    .get(jobId) as
    | {
        id: string;
        consumer_id: string;
        accepted_contractor_id: string | null;
      }
    | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isAuthorized =
    payload.userId === job.consumer_id ||
    payload.userId === job.accepted_contractor_id;
  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Not authorized for this job" },
      { status: 403 }
    );
  }

  // Verify receiver is also part of the job
  const receiverIsAuthorized =
    receiverId === job.consumer_id ||
    receiverId === job.accepted_contractor_id;
  if (!receiverIsAuthorized) {
    return NextResponse.json(
      { error: "Receiver is not part of this job" },
      { status: 403 }
    );
  }

  // Get phone numbers for both users
  const caller = await db
    .prepare(`SELECT phone_number FROM users WHERE id = ?`)
    .get(payload.userId) as { phone_number: string | null } | undefined;
  const receiver = await db
    .prepare(`SELECT phone_number FROM users WHERE id = ?`)
    .get(receiverId) as { phone_number: string | null } | undefined;

  const now = new Date().toISOString();
  const callLogId = randomUUID();

  // Create call log record
  await db.prepare(
    `INSERT INTO call_logs (id, job_id, caller_id, receiver_id, status, created_at)
     VALUES (?, ?, ?, ?, 'initiated', ?)`
  ).run(callLogId, jobId, payload.userId, receiverId, now);

  // If phones not configured, return an informative response
  if (!caller?.phone_number || !receiver?.phone_number) {
    return NextResponse.json({
      callLogId,
      status: "no_phone",
      message:
        "Phone number required for calls. Please add your phone number in settings.",
    });
  }

  const result = await initiateCall({
    callLogId,
    fromUserId: payload.userId,
    toUserId: receiverId,
    jobId,
    callerPhone: caller.phone_number,
    receiverPhone: receiver.phone_number,
  });

  // Update call log with Twilio SID
  if (result.twilioCallSid) {
    await db.prepare(
      `UPDATE call_logs SET twilio_call_sid = ?, status = ? WHERE id = ?`
    ).run(result.twilioCallSid, result.status, callLogId);
  } else if (result.status !== "simulated") {
    await db.prepare(`UPDATE call_logs SET status = ? WHERE id = ?`).run(
      result.status,
      callLogId
    );
  }

  const { callLogId: _cid, ...restResult } = result;
  return NextResponse.json({ callLogId, ...restResult });
}
