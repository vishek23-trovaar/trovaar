import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { AI_MODEL, parseStructured, categoryBidStats } from "@/lib/ai";

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

const QuoteBustSchema = z.object({
  estimatedFairLow: z.number(),
  estimatedFairHigh: z.number(),
  breakdown: z.string(),
  tips: z.array(z.string()),
});

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

  try {
    // Ground the estimate in Trovaar's own real bids for this category.
    const stats = await categoryBidStats(category);
    const grounding = stats
      ? `\nReference data — ${stats.count} recent bids on Trovaar for "${category}": roughly $${stats.lowUsd}–$${stats.highUsd}, typical ~$${stats.medianUsd}. Weigh this against the job's actual scope (a small job sits near the low end; a large/complex one near the high end). Use it to anchor your range — don't just echo these numbers.`
      : "";

    const promptText = `You are a home services pricing expert. A consumer received a quote from a large national company. Analyze whether they're overpaying and estimate what a skilled local independent contractor would typically charge for the same work.

${quoteImageUrl ? "I've attached an image of the actual quote document. Use the details visible in the document (line items, company name, scope of work, materials listed) to make a more precise analysis." : ""}

Category: ${category}
Quote received: $${quoteAmount}
${description ? `Work description: ${description}` : ""}
${zipCode ? `ZIP code: ${zipCode}` : "Location: United States (average)"}
${grounding}

Estimate:
- estimatedFairLow / estimatedFairHigh: the realistic price range (integers, USD) a qualified local pro would charge for this work.
- breakdown: one paragraph (max 60 words) explaining WHY big companies charge more (overhead, marketing, franchise fees, etc.) and what drives the fair price range${quoteImageUrl ? ". Reference specific line items from the quote if visible." : ""}.
- tips: exactly 3 short tips (max 15 words each) to get the best deal.

Base estimates on real US labor/material costs${stats ? " and the Trovaar reference data above" : ""}. Be realistic — not artificially low. If the original quote is reasonable for the work described, say so honestly.`;

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "url"; url: string } }
    > = [{ type: "text", text: promptText }];

    if (quoteImageUrl?.startsWith("http")) {
      content.unshift({ type: "image", source: { type: "url", url: quoteImageUrl } });
    }

    // Sonnet for vision (quote-document analysis), Haiku for text-only.
    const model = quoteImageUrl ? AI_MODEL.vision : AI_MODEL.fast;

    const parsed = await parseStructured({
      model,
      schema: QuoteBustSchema,
      content,
      maxTokens: 512,
      temperature: 0,
    });

    if (!parsed || typeof parsed.estimatedFairLow !== "number" || typeof parsed.estimatedFairHigh !== "number") {
      return NextResponse.json({ result: getFallbackResult(category, quoteAmount, stats) });
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

function getFallbackResult(
  category: string,
  quoteAmount: number,
  stats?: { lowUsd: number; medianUsd: number; highUsd: number } | null
): QuoteBustResult {
  // Prefer real Trovaar bid data when we have it; otherwise estimate the fair
  // range as a discount off the (typically marked-up) national quote.
  let fairLow: number;
  let fairHigh: number;

  if (stats) {
    fairLow = stats.lowUsd;
    fairHigh = Math.max(stats.highUsd, stats.lowUsd + 1);
  } else {
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
    fairLow = Math.round(quoteAmount * factors.low);
    fairHigh = Math.round(quoteAmount * factors.high);
  }

  return {
    originalQuote: quoteAmount,
    estimatedFairLow: fairLow,
    estimatedFairHigh: fairHigh,
    savingsLow: Math.max(0, quoteAmount - fairHigh),
    savingsHigh: Math.max(0, quoteAmount - fairLow),
    savingsPercentLow: Math.max(0, Math.round(((quoteAmount - fairHigh) / quoteAmount) * 100)),
    savingsPercentHigh: Math.max(0, Math.round(((quoteAmount - fairLow) / quoteAmount) * 100)),
    breakdown: stats
      ? "Based on real bids from local pros on Trovaar for this category, plus the typical 30–50% markup national chains add for brand overhead, marketing, and franchise fees."
      : "Large national companies typically add 30-50% markup for brand overhead, marketing, franchise fees, and dispatch coordination. Local independent pros have lower overhead and pass those savings directly to you.",
    tips: [
      "Get at least 3 quotes before committing",
      "Ask if materials are included in the price",
      "Check contractor reviews and license status",
    ],
  };
}
