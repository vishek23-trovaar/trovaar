import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

interface QuoteBustResult {
  originalQuote: number;
  estimatedFairLow: number;
  estimatedFairHigh: number;
  savingsLow: number;
  savingsHigh: number;
  savingsPercentLow: number;
  savingsPercentHigh: number;
  breakdown: string;
  tips: string[];
}

export async function POST(request: NextRequest) {
  // No auth required — this is a marketing/lead-gen tool
  const rl = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, keyPrefix: "quote-bust" });
  if (rl) return rl;

  const { category, quoteAmount, description, zipCode, quoteImageUrl } = await request.json() as {
    category: string;
    quoteAmount: number;
    description?: string;
    zipCode?: string;
    quoteImageUrl?: string;
  };

  if (!category || !quoteAmount || quoteAmount <= 0) {
    return NextResponse.json({ error: "category and quoteAmount are required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ result: getFallbackResult(category, quoteAmount) });
  }

  try {
    const client = new Anthropic({ apiKey });

    const promptText = `You are a home services pricing expert. A consumer received a quote from a large national company. Analyze whether they're overpaying and estimate what a skilled local independent contractor would typically charge for the same work.

${quoteImageUrl ? "I've attached an image of the actual quote document. Use the details visible in the document (line items, company name, scope of work, materials listed) to make a more precise analysis." : ""}

Category: ${category}
Quote received: $${quoteAmount}
${description ? `Work description: ${description}` : ""}
${zipCode ? `ZIP code: ${zipCode}` : "Location: United States (average)"}

Return ONLY a JSON object with these exact fields:
- estimatedFairLow: lowest realistic price a qualified local pro would charge (integer)
- estimatedFairHigh: highest realistic price a qualified local pro would charge (integer)
- breakdown: one paragraph (max 60 words) explaining WHY big companies charge more (overhead, marketing, franchise fees, etc.) and what drives the fair price range${quoteImageUrl ? ". Reference specific line items from the quote if visible." : ""}
- tips: array of exactly 3 short tips (max 15 words each) for the consumer to get the best deal

Base estimates on real US labor rates and material costs. The fair range should be realistic — not artificially low. If the original quote seems reasonable for the work described, say so honestly.

Example: {"estimatedFairLow": 180, "estimatedFairHigh": 350, "breakdown": "National chains add 30-50% markup for brand overhead, dispatch fees, and warranty programs. Local pros save on these costs and pass savings to you.", "tips": ["Get 3 quotes minimum before committing", "Ask if materials are included in the price", "Check contractor reviews and license status"]}`;

    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "url"; url: string } };

    const content: ContentBlock[] = [{ type: "text", text: promptText }];

    // Attach quote document image if provided
    if (quoteImageUrl?.startsWith("http")) {
      content.unshift({ type: "image", source: { type: "url", url: quoteImageUrl } });
    }

    // Use Opus for vision (image analysis), Haiku for text-only
    const model = quoteImageUrl ? "claude-opus-4-6" : "claude-haiku-4-5";

    const message = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content }],
    });

    const responseBlock = message.content[0];
    if (responseBlock.type !== "text") throw new Error("Unexpected response type");

    const text = responseBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse result");

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.estimatedFairLow !== "number" || typeof parsed.estimatedFairHigh !== "number") {
      throw new Error("Invalid result format");
    }

    const result: QuoteBustResult = {
      originalQuote: quoteAmount,
      estimatedFairLow: parsed.estimatedFairLow,
      estimatedFairHigh: parsed.estimatedFairHigh,
      savingsLow: Math.max(0, quoteAmount - parsed.estimatedFairHigh),
      savingsHigh: Math.max(0, quoteAmount - parsed.estimatedFairLow),
      savingsPercentLow: Math.max(0, Math.round(((quoteAmount - parsed.estimatedFairHigh) / quoteAmount) * 100)),
      savingsPercentHigh: Math.max(0, Math.round(((quoteAmount - parsed.estimatedFairLow) / quoteAmount) * 100)),
      breakdown: parsed.breakdown,
      tips: parsed.tips || [],
    };

    return NextResponse.json({ result });
  } catch (err) {
    logger.error({ err }, "Quote Buster AI error");
    return NextResponse.json({ result: getFallbackResult(category, quoteAmount) });
  }
}

function getFallbackResult(category: string, quoteAmount: number): QuoteBustResult {
  // Average markup by big companies is 30-50%. Estimate fair range at 50-75% of original quote.
  const markupFactors: Record<string, { low: number; high: number }> = {
    plumbing:         { low: 0.45, high: 0.70 },
    electrical:       { low: 0.50, high: 0.75 },
    hvac:             { low: 0.50, high: 0.75 },
    roofing:          { low: 0.55, high: 0.80 },
    flooring:         { low: 0.50, high: 0.75 },
    painting:         { low: 0.40, high: 0.65 },
    handyman:         { low: 0.45, high: 0.70 },
    carpentry:        { low: 0.50, high: 0.75 },
    landscaping:      { low: 0.45, high: 0.70 },
    auto_repair:      { low: 0.50, high: 0.75 },
    kitchen_remodel:  { low: 0.55, high: 0.80 },
    bathroom_remodel: { low: 0.55, high: 0.80 },
    concrete_masonry: { low: 0.55, high: 0.80 },
    fencing:          { low: 0.50, high: 0.75 },
    deck_patio:       { low: 0.55, high: 0.80 },
  };

  const factors = markupFactors[category] || { low: 0.50, high: 0.75 };
  const fairLow = Math.round(quoteAmount * factors.low);
  const fairHigh = Math.round(quoteAmount * factors.high);

  return {
    originalQuote: quoteAmount,
    estimatedFairLow: fairLow,
    estimatedFairHigh: fairHigh,
    savingsLow: Math.max(0, quoteAmount - fairHigh),
    savingsHigh: Math.max(0, quoteAmount - fairLow),
    savingsPercentLow: Math.max(0, Math.round(((quoteAmount - fairHigh) / quoteAmount) * 100)),
    savingsPercentHigh: Math.max(0, Math.round(((quoteAmount - fairLow) / quoteAmount) * 100)),
    breakdown: "Large national companies typically add 30-50% markup for brand overhead, marketing, franchise fees, and dispatch coordination. Local independent pros have lower overhead and pass those savings directly to you.",
    tips: [
      "Get at least 3 quotes before committing",
      "Ask if materials are included in the price",
      "Check contractor reviews and license status",
    ],
  };
}
