import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthPayload } from "@/lib/auth";
import { aiLogger as logger } from "@/lib/logger";

interface ProtectionReport {
  fair_low: number;
  fair_high: number;
  price_note: string;
  upsell_warnings: string[];
  questions: string[];
  fair_includes: string[];
}

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ report: getFallbackReport(category) });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a consumer protection advisor helping ordinary people avoid being overcharged or upsold on service work.

Service category: ${category}
Job title: ${title || ""}
Description: ${description || ""}
Location: ${location || "United States"}

Return ONLY a JSON object with these exact fields:
{
  "fair_low": <lowest realistic USD price — integer>,
  "fair_high": <highest realistic USD price — integer>,
  "price_note": "<one sentence, max 20 words, explaining the main cost driver>",
  "upsell_warnings": [
    "<specific thing this trade/dealer commonly adds that may not be needed>",
    "<another common unnecessary upsell for this specific job>",
    "<third upsell if relevant>"
  ],
  "questions": [
    "<protective question the consumer should ask before accepting>",
    "<another question>",
    "<another question>"
  ],
  "fair_includes": [
    "<what a legitimate quote for this job should include>",
    "<another item that should be included>",
    "<third item>"
  ]
}

For upsell_warnings, be SPECIFIC to this exact job and trade — not generic. For example, for auto repair at a dealer, mention specific items dealers push like "cabin air filter replacement", "fuel system cleaning", "tire rotation added to brake job", etc. For plumbing, mention "whole-house repiping upsell", "water softener push", etc.

For questions, help the consumer protect themselves — e.g. "Ask to see the worn part they removed", "Get an itemized quote in writing before any work starts", "Ask if this repair is required for safety or just recommended".

Base price range on real US labor and parts rates for the described job specifically.`,
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse report");

    const report: ProtectionReport = JSON.parse(jsonMatch[0]);

    // Validate required shape
    if (
      typeof report.fair_low !== "number" ||
      typeof report.fair_high !== "number" ||
      !Array.isArray(report.upsell_warnings) ||
      !Array.isArray(report.questions) ||
      !Array.isArray(report.fair_includes)
    ) {
      throw new Error("Invalid report format");
    }

    return NextResponse.json({ report });
  } catch (err) {
    logger.error({ err }, "consumer-protect error");
    return NextResponse.json({ report: getFallbackReport(category) });
  }
}

function getFallbackReport(category: string): ProtectionReport {
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

  return (
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
    }
  );
}
