import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

export interface DocumentVerificationResult {
  holderName: string | null;
  licenseNumber: string | null;
  licenseType: string | null;
  issuer: string | null;
  state: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  confidence: "high" | "medium" | "low";
  summary: string;
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(request, { maxRequests: 10, windowMs: 60 * 60 * 1000, keyPrefix: "ai-verify-doc" });
  if (rl) return rl;

  const { documentUrl } = await request.json() as { documentUrl: string };

  if (!documentUrl) {
    return NextResponse.json({ error: "documentUrl is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: documentUrl },
            },
            {
              type: "text",
              text: `You are a document verification specialist. Analyze this license, certification, or professional credential image and extract all relevant information.

Return ONLY a JSON object with these exact fields:
- holderName: full name of the license/certificate holder (string or null if unreadable)
- licenseNumber: the license or certificate number (string or null)
- licenseType: type of license/certification (e.g. "General Contractor", "Master Plumber", "Electrical Contractor", "HVAC Technician", etc.) (string or null)
- issuer: issuing authority or organization (e.g. "State of California CSLB", "EPA", etc.) (string or null)
- state: US state abbreviation if applicable (e.g. "CA", "TX") (string or null)
- expiryDate: expiration date in YYYY-MM-DD format (string or null)
- isExpired: true if the document appears expired based on the date shown, false otherwise (boolean)
- confidence: your confidence level in the extraction — "high" if all text is clearly legible and you're certain, "medium" if some fields are partially obscured, "low" if the image is blurry or hard to read
- summary: one sentence describing what this document is (e.g. "California General Contractor License issued to John Smith, expires 2025-12-31")

If this image is NOT a license, certification, or professional credential (e.g. it's a random photo, selfie, or unrelated document), return:
{"holderName": null, "licenseNumber": null, "licenseType": null, "issuer": null, "state": null, "expiryDate": null, "isExpired": false, "confidence": "low", "summary": "This image does not appear to be a professional license or certification."}`,
            },
          ],
        },
      ],
    });

    const responseBlock = message.content[0];
    if (responseBlock.type !== "text") throw new Error("Unexpected response type");

    const text = responseBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse verification result");

    const result: DocumentVerificationResult = JSON.parse(jsonMatch[0]);

    // Save to contractor profile
    const db = getDb();
    await initializeDatabase();

    await db.prepare(`
      UPDATE contractor_profiles SET
        license_holder_name = COALESCE(?, license_holder_name),
        license_number = COALESCE(?, license_number),
        license_type = COALESCE(?, license_type),
        license_issuer = COALESCE(?, license_issuer),
        license_state = COALESCE(?, license_state),
        license_expiry_date = COALESCE(?, license_expiry_date),
        ai_verification_result = ?,
        ai_verified_at = NOW()
      WHERE user_id = ?
    `).run(
      result.holderName,
      result.licenseNumber,
      result.licenseType,
      result.issuer,
      result.state,
      result.expiryDate,
      JSON.stringify(result),
      payload.userId,
    );

    return NextResponse.json({ result });
  } catch (err) {
    logger.error({ err }, "AI document verification error");
    return NextResponse.json({ error: "Failed to verify document" }, { status: 500 });
  }
}
