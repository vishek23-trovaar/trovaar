import { smsLogger as logger } from "@/lib/logger";

export async function sendSMS(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // Twilio not configured — log for development
    logger.debug({ to, message }, "SMS not sent (Twilio not configured)");
    return;
  }

  // Real Twilio call
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }).toString(),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err }, "SMS send failed");
  }
}
