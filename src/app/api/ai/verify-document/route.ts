import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { AI_MODEL, parseStructured } from "@/lib/ai";

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

const VerifySchema = z.object({
  holderName: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  licenseType: z.string().nullable(),
  issuer: z.string().nullable(),
  state: z.string().nullable(),
  expiryDate: z.string().nullable(),
  isExpired: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
});

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

  try {
    const result = await parseStructured({
      model: AI_MODEL.vision, // Sonnet 4.6 — vision-capable, far cheaper than Opus for OCR-style reads
      schema: VerifySchema,
      maxTokens: 1024,
      temperature: 0,
      content: [
        { type: "image", source: { type: "url", url: documentUrl } },
        {
          type: "text",
          text: `You are a document verification specialist. Analyze this license, certification, or professional credential image and extract all relevant information.

Extract:
- holderName: full name of the license/certificate holder (or null if unreadable)
- licenseNumber: the license or certificate number (or null)
- licenseType: type of license/certification (e.g. "General Contractor", "Master Plumber", "Electrical Contractor", "HVAC Technician") (or null)
- issuer: issuing authority or organization (e.g. "State of California CSLB", "EPA") (or null)
- state: US state abbreviation if applicable (e.g. "CA", "TX") (or null)
- expiryDate: expiration date in YYYY-MM-DD format (or null)
- isExpired: true if the document appears expired based on the date shown, false otherwise
- confidence: "high" only if all text is clearly legible and you are certain; "medium" if some fields are partially obscured; "low" if blurry, hard to read, or you are unsure
- summary: one sentence describing what this document is

If this image is NOT a license, certification, or professional credential (e.g. a random photo, selfie, or unrelated document), set every field to null/false and confidence "low", with a summary saying it does not appear to be a professional license.`,
        },
      ],
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to verify document" }, { status: 500 });
    }

    // ── Trust gating ──────────────────────────────────────────────────────────
    // The AI read is a PRE-SCREEN, never authoritative verification. We never set
    // verification_status here — a human/authoritative check remains the only thing
    // that grants a "verified" badge. We only let the AI populate the license_*
    // fields when it's a high-confidence read of an actual credential; otherwise
    // those fields are left untouched (NULL → COALESCE keeps existing) so a blurry
    // or wrong read can't overwrite real data or masquerade as verified.
    const isCredential = !!(result.holderName || result.licenseNumber);
    const trusted = isCredential && result.confidence === "high";
    const requiresHumanReview = !trusted;

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
      trusted ? result.holderName : null,
      trusted ? result.licenseNumber : null,
      trusted ? result.licenseType : null,
      trusted ? result.issuer : null,
      trusted ? result.state : null,
      trusted ? result.expiryDate : null,
      JSON.stringify({ ...result, requiresHumanReview }),
      payload.userId,
    );

    return NextResponse.json({ result, requiresHumanReview });
  } catch (err) {
    logger.error({ err }, "AI document verification error");
    return NextResponse.json({ error: "Failed to verify document" }, { status: 500 });
  }
}
