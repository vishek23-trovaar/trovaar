import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { aiLogger as logger } from "@/lib/logger";
import { AI_MODEL, parseStructured, categoryBidStats, type CategoryBidStats } from "@/lib/ai";

interface ProtectionReport {
  fair_low: number;
  fair_high: number;
  price_note: string;
  upsell_warnings: string[];
  questions: string[];
  fair_includes: string[];
}

const ProtectionSchema = z.object({
  fair_low: z.number(),
  fair_high: z.number(),
  price_note: z.string(),
  upsell_warnings: z.array(z.string()),
  questions: z.array(z.string()),
  fair_includes: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, title, description, location } = (await request.json()) as {
    category: string;
    title?: string;
    description?: string;
    location?: string;
  };

  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

  try {
    // Ground the fair-price range in Trovaar's own real bids for this category.
    const stats = await categoryBidStats(category);
    const grounding = stats
      ? `\nReference data — ${stats.count} recent bids on Trovaar for "${category}": roughly $${stats.lowUsd}–$${stats.highUsd}, typical ~$${stats.medianUsd}. Anchor fair_low/fair_high to this, adjusted for the described job's scope.`
      : "";

    const report = await parseStructured({
      model: AI_MODEL.fast,
      schema: ProtectionSchema,
      maxTokens: 1024,
      temperature: 0,
      content: `You are a consumer protection advisor helping ordinary people avoid being overcharged or upsold on service work.

Service category: ${category}
Job title: ${title || ""}
Description: ${description || ""}
Location: ${location || "United States"}
${grounding}

Provide:
- fair_low / fair_high: the realistic USD price range (integers) for this specific job.
- price_note: one sentence (max 20 words) explaining the main cost driver.
- upsell_warnings: 2-3 things this trade/dealer commonly adds that may not be needed — SPECIFIC to this exact job and trade, not generic. (e.g. auto repair: "cabin air filter replacement", "fuel system cleaning"; plumbing: "whole-house repiping upsell", "water softener push".)
- questions: 3 protective questions the consumer should ask before accepting (e.g. "Ask to see the worn part they removed", "Get an itemized quote in writing before any work starts").
- fair_includes: 3 things a legitimate quote for this job should include.

Base the price range on real US labor and parts rates for the described job specifically${stats ? ", anchored to the Trovaar reference data above" : ""}.`,
    });

    if (
      !report ||
      typeof report.fair_low !== "number" ||
      typeof report.fair_high !== "number" ||
      !Array.isArray(report.upsell_warnings) ||
      !Array.isArray(report.questions) ||
      !Array.isArray(report.fair_includes)
    ) {
      return NextResponse.json({ report: getFallbackReport(category, stats) });
    }

    return NextResponse.json({ report });
  } catch (err) {
    logger.error({ err }, "consumer-protect error");
    return NextResponse.json({ report: getFallbackReport(category) });
  }
}

function getFallbackReport(category: string, stats?: CategoryBidStats | null): ProtectionReport {
  const reports: Record<string, ProtectionReport> = {
    auto_repair: {
      fair_low: 80,
      fair_high: 600,
      price_note: "Range depends on parts cost and whether dealer or independent shop.",
      upsell_warnings: [
        "Cabin air filter replacement — often added at high markup, you can buy one for $15 and replace it yourself",
        "Fuel system or injector cleaning — rarely needed unless you have specific driveability issues",
        "Brake fluid flush — legitimate every 2–3 years, but often pushed prematurely",
        "Tire rotation added to unrelated repairs — check if it was actually due",
        "Dealer \"multi-point inspection fee\" — should be complimentary, not a line item",
      ],
      questions: [
        "Can I see the worn part before you replace it?",
        "Is this repair required for safety or just recommended?",
        "Can I get a written itemized estimate before any work begins?",
        "Is this covered under any warranty or recall?",
        "What happens if I wait 30–60 days on the non-urgent items?",
      ],
      fair_includes: [
        "Diagnosis fee (should be credited toward repair if you proceed)",
        "Labor at the quoted hourly rate",
        "OEM or quality aftermarket parts with part numbers listed",
        "Any applicable warranty on parts and labor (ask for minimum 12 months)",
      ],
    },
    auto_glass: {
      fair_low: 150,
      fair_high: 500,
      price_note: "Windshield replacement varies by whether ADAS recalibration is required.",
      upsell_warnings: [
        "ADAS camera recalibration — required if your car has lane assist / auto braking, but verify first",
        "\"Premium\" glass at large markup — OEM-equivalent aftermarket glass is fine for most vehicles",
        "Rust treatment on pinch weld — legitimate but often inflated; ask to see it",
        "Wipers added at dealer markup — you can buy quality wipers for $15–30 each",
      ],
      questions: [
        "Does my vehicle require ADAS recalibration after windshield replacement?",
        "Is the glass OEM or OEM-equivalent aftermarket?",
        "Does your work come with a lifetime warranty against leaks and defects?",
        "Will you provide the recalibration report if ADAS work is done?",
      ],
      fair_includes: [
        "Full windshield removal and installation",
        "New moldings/trim clips as needed",
        "ADAS recalibration if the vehicle requires it",
        "Leak test before vehicle is returned",
      ],
    },
    plumbing: {
      fair_low: 150,
      fair_high: 800,
      price_note: "Range depends heavily on access difficulty and whether parts need ordering.",
      upsell_warnings: [
        "Whole-house repiping — only needed for widespread corrosion; get a second opinion first",
        "Water softener or filtration upsell — legitimate but rarely urgent; research independently",
        "\"Code upgrade\" charges — ask exactly which code section requires the upgrade",
        "Drain cleaning service bundled in — get it itemized so you can compare separately",
      ],
      questions: [
        "Can you show me exactly what's causing the problem before starting?",
        "Is this repair required by code, or just a recommendation?",
        "What warranty do you offer on parts and labor?",
        "Will you provide a written estimate before starting work?",
      ],
      fair_includes: [
        "Diagnosis of the root cause",
        "Labor at quoted rate with time estimate",
        "Parts at wholesale + reasonable markup (ask for part numbers)",
        "Cleanup of work area after repair",
      ],
    },
    electrical: {
      fair_low: 200,
      fair_high: 1200,
      price_note: "Range depends on panel access, permits, and number of circuits involved.",
      upsell_warnings: [
        "Full panel upgrade when only a breaker swap is needed — ask for a second opinion",
        "Whole-house surge protector upsell — worthwhile but verify the quoted price vs. retail",
        "Arc-fault breaker upgrades beyond what code requires for your specific job",
        "Rewiring rooms not involved in the original scope without documented reason",
      ],
      questions: [
        "Is a permit required for this work, and is that included in the quote?",
        "What specifically requires a full panel upgrade vs. a targeted fix?",
        "Can I see the code citation that requires the additional work?",
        "Does this come with an inspection sign-off?",
      ],
      fair_includes: [
        "All required permits and inspections",
        "Labor at the quoted hourly rate",
        "Materials listed by item",
        "Final inspection and sign-off from the AHJ",
      ],
    },
  };

  const base =
    reports[category] || {
      fair_low: 100,
      fair_high: 1500,
      price_note: "Range depends on scope and local labor rates.",
      upsell_warnings: [
        "Bundled services you didn't ask for — get an itemized quote",
        "\"While we're here\" add-ons — evaluate each separately",
        "Urgency pressure — get a second opinion if pushed to decide immediately",
      ],
      questions: [
        "Can I get a written, itemized quote before any work begins?",
        "Is this repair urgent, or can I take a day to get a second opinion?",
        "What warranty do you provide on parts and labor?",
      ],
      fair_includes: [
        "Itemized labor and parts",
        "Written warranty on work performed",
        "Clean worksite after completion",
      ],
    };

  // Prefer real Trovaar bid data for the price range when we have enough of it.
  if (stats) {
    return {
      ...base,
      fair_low: stats.lowUsd,
      fair_high: Math.max(stats.highUsd, stats.lowUsd + 1),
      price_note: `Based on ${stats.count} recent bids from local pros on Trovaar for this category.`,
    };
  }
  return base;
}
