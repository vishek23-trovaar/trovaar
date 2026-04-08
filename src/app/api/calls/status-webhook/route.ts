import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { verifyTwilioWebhook } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const webhookError = await verifyTwilioWebhook(request);
  if (webhookError) return webhookError;

  const formData = await request.formData();
  const callSid = formData.get("CallSid") as string | null;
  const callStatus = formData.get("CallStatus") as string | null;

  if (callSid && callStatus) {
    const db = getDb();
  await initializeDatabase();

    // Normalize Twilio status strings to our internal format
    const statusMap: Record<string, string> = {
      "in-progress": "in_progress",
      "no-answer": "no_answer",
    };
    const mappedStatus = statusMap[callStatus] ?? callStatus;

    await db.prepare(
      `UPDATE call_logs SET status = ? WHERE twilio_call_sid = ?`
    ).run(mappedStatus, callSid);
  }

  return new NextResponse("OK", { status: 200 });
}
