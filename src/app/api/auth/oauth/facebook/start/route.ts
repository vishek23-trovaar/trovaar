import { NextResponse } from "next/server";
import { buildFacebookAuthUrl, setStateCookie } from "@/lib/oauth";

export async function GET(): Promise<NextResponse> {
  const state = crypto.randomUUID();
  const authUrl = buildFacebookAuthUrl(state);
  const response = NextResponse.redirect(authUrl);
  setStateCookie(response, state);
  return response;
}
