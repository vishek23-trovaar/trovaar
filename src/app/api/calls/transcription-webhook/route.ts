import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { verifyTwilioWebhook } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const webhookError = await verifyTwilioWebhook(request);
  if (webhookError) return webhookError;

  const formData = await request.formData();
  const callSid = formData.get("CallSid") as string | null;
  const transcriptionText = formData.get("TranscriptionText") as string | null;
  const transcriptionStatus = formData.get("TranscriptionStatus") as string | null;

  if (callSid && transcriptionText && transcriptionStatus === "completed") {
    const db = getDb();
  await initializeDatabase();
    await db.prepare(
      `UPDATE call_logs SET transcript = ? WHERE twilio_call_sid = ?`
    ).run(transcriptionText, callSid);

    console.log(
      `[VOICE] Transcript saved for call ${callSid}: ${transcriptionText.slice(0, 100)}...`
    );
  }

  return new NextResponse("OK", { status: 200 });
}
