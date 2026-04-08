/**
 * Twilio Programmable Voice helper.
 * Falls back to console logging when TWILIO env vars are not configured.
 */

export interface CallInitResult {
  callLogId: string;
  twilioCallSid: string | null;
  status: string;
}

export async function initiateCall(params: {
  callLogId: string;
  fromUserId: string;
  toUserId: string;
  jobId: string;
  callerPhone: string;
  receiverPhone: string;
}): Promise<CallInitResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const appBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

  if (!accountSid || !authToken || !twilioNumber) {
    console.log(
      `[VOICE] Call initiated: ${params.callerPhone} → ${params.receiverPhone} for job ${params.jobId}`
    );
    console.log(`[VOICE] Twilio not configured — call simulated`);
    return {
      callLogId: params.callLogId,
      twilioCallSid: null,
      status: "simulated",
    };
  }

  // TwiML URL: announces recording then connects the call
  const twimlUrl = `${appBaseUrl}/api/calls/twiml?callLogId=${params.callLogId}&jobId=${params.jobId}`;

  const body = new URLSearchParams({
    To: params.receiverPhone,
    From: twilioNumber,
    Url: twimlUrl,
    Record: "true",
    RecordingStatusCallback: `${appBaseUrl}/api/calls/recording-webhook`,
    RecordingStatusCallbackMethod: "POST",
    StatusCallback: `${appBaseUrl}/api/calls/status-webhook`,
    StatusCallbackMethod: "POST",
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("[VOICE] Twilio call failed:", err);
    return {
      callLogId: params.callLogId,
      twilioCallSid: null,
      status: "failed",
    };
  }

  const data = (await response.json()) as { sid: string; status: string };
  return {
    callLogId: params.callLogId,
    twilioCallSid: data.sid,
    status: data.status,
  };
}
