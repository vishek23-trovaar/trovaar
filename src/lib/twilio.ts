import twilio, { validateRequest } from "twilio";
import { NextRequest, NextResponse } from "next/server";

if (!process.env.TWILIO_ACCOUNT_SID && process.env.NODE_ENV === "production") {
  throw new Error("TWILIO_ACCOUNT_SID is required in production");
}

let _client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  _client = twilio(sid, token);
  return _client;
}

export const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || "";

export function generateVerifyCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Verify Twilio webhook signature. Returns a NextResponse error if invalid, or null if valid.
 */
export async function verifyTwilioWebhook(request: NextRequest): Promise<NextResponse | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    if (process.env.NODE_ENV === "production") {
      console.error("TWILIO_AUTH_TOKEN not set — rejecting webhook");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    // In development, skip verification if token not set
    return null;
  }

  const signature = request.headers.get("x-twilio-signature") || "";
  const url = request.url;

  // Parse form data params for validation
  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const isValid = validateRequest(authToken, signature, url, params);
  if (!isValid) {
    console.error("Twilio webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  return null;
}
