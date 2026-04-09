import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, revokeUserTokens } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Revoke all existing tokens for this user (invalidates Bearer tokens too)
  const payload = getAuthPayload(request.headers);
  if (payload?.userId) {
    try {
      await revokeUserTokens(payload.userId);
    } catch {
      // Non-fatal — cookie will still be cleared
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
