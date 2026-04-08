import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { verifyTwilioWebhook } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const webhookError = await verifyTwilioWebhook(request);
  if (webhookError) return webhookError;

  const formData = await request.formData();
  const callSid = formData.get("CallSid") as string | null;
  const recordingUrl = formData.get("RecordingUrl") as string | null;
  const recordingSid = formData.get("RecordingSid") as string | null;
  const durationRaw = formData.get("RecordingDuration") as string | null;
  const duration = durationRaw ? parseInt(durationRaw, 10) : 0;

  if (callSid && recordingUrl) {
    const db = getDb();
  await initializeDatabase();
    await db.prepare(
      `UPDATE call_logs
       SET recording_url = ?, recording_sid = ?, duration_seconds = ?, status = 'completed', ended_at = ?
       WHERE twilio_call_sid = ?`
    ).run(
      recordingUrl + ".mp3",
      recordingSid,
      duration,
      new Date().toISOString(),
      callSid
    );
  }

  return new NextResponse("OK", { status: 200 });
}
