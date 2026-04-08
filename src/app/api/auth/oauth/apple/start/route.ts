import { NextResponse } from "next/server";
import { buildAppleAuthUrl, setStateCookie } from "@/lib/oauth";

export async function GET(): Promise<NextResponse> {
  const state = crypto.randomUUID();
  const authUrl = buildAppleAuthUrl(state);
  const response = NextResponse.redirect(authUrl);
  setStateCookie(response, state);
  return response;
}
