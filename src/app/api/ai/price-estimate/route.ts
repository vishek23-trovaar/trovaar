import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

interface PriceEstimate {
  low: number;
  high: number;
  note: string;
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-price" });
  if (rl) return rl;

  const { category, title, description, location, photos } = await request.json() as {
    category: string;
    title?: string;
    description?: string;
    location?: string;
    photos?: string[]; // array of image URLs for Vision analysis
  };

  if (!category || !description?.trim()) {
    return NextResponse.json({ error: "category and description are required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ estimate: getFallbackEstimate(category) });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build content array — include photos for Vision analysis if available
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "url"; url: string } };

    const promptText = `You are a contractor pricing assistant. Based on the service job details below${photos?.length ? " AND the photos attached" : ""}, provide a realistic price range estimate in USD that a skilled contractor might charge.

Category: ${category}
Job title: ${title || ""}
Job description: ${description}
Location: ${location || "United States"}
${photos?.length ? `\nJob photos included: ${photos.length} photo(s) — analyze the scope, condition, and complexity visible in the images to refine your estimate.` : ""}

Return ONLY a JSON object with these exact fields:
- low: lowest realistic price in dollars (integer, no cents)
- high: highest realistic price in dollars (integer, no cents)
- note: one short sentence (max 20 words) explaining the main cost driver${photos?.length ? " (mention if photo shows complex or simple work)" : ""}

Example: {"low": 200, "high": 600, "note": "Moderate damage visible in photo — repair complexity drives range."}

Base your estimate on real US labor rates. Do NOT include $ signs in the number fields.`;

    const content: ContentBlock[] = [{ type: "text", text: promptText }];

    // Attach up to 3 photos (keep token usage reasonable)
    if (photos && photos.length > 0) {
      const photoUrls = photos.slice(0, 3).filter(url => url?.startsWith("http"));
      for (const url of photoUrls) {
        content.push({ type: "image", source: { type: "url", url } });
      }
    }

    const model = photos?.length ? "claude-opus-4-6" : "claude-haiku-4-5";

    const message = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content }],
    });

    const responseBlock = message.content[0];
    if (responseBlock.type !== "text") throw new Error("Unexpected response type");

    const text = responseBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse estimate");

    const estimate: PriceEstimate = JSON.parse(jsonMatch[0]);
    if (typeof estimate.low !== "number" || typeof estimate.high !== "number") {
      throw new Error("Invalid estimate format");
    }

    return NextResponse.json({ estimate });
  } catch (err) {
    logger.error({ err }, "AI price estimate error");
    return NextResponse.json({ estimate: getFallbackEstimate(category) });
  }
}

function getFallbackEstimate(category: string): PriceEstimate {
  const estimates: Record<string, PriceEstimate> = {
    plumbing:          { low: 150,  high: 800,  note: "Range depends on complexity and whether pipe access is needed." },
    electrical:        { low: 200,  high: 1200, note: "Range depends on scope, permits required, and panel access." },
    hvac:              { low: 300,  high: 3500, note: "Range depends on whether repair or full system replacement." },
    roofing:           { low: 500,  high: 8000, note: "Range depends on roof size and extent of damage." },
    flooring:          { low: 300,  high: 3000, note: "Range depends on square footage and material type chosen." },
    painting:          { low: 200,  high: 2500, note: "Range depends on square footage and surface prep needed." },
    handyman:          { low: 100,  high: 500,  note: "Range depends on number of tasks and materials required." },
    carpentry:         { low: 200,  high: 3000, note: "Range depends on complexity and materials used." },
    landscaping:       { low: 150,  high: 2000, note: "Range depends on yard size and scope of work." },
    auto_repair:       { low: 100,  high: 1500, note: "Range depends on parts cost and diagnostic findings." },
    auto_body:         { low: 300,  high: 3000, note: "Range depends on damage extent and paint matching required." },
    auto_glass:        { low: 150,  high: 600,  note: "Range depends on glass type and ADAS recalibration needs." },
    boat_repair:       { low: 200,  high: 3000, note: "Range depends on system affected and parts availability." },
    marine_fiberglass: { low: 400,  high: 5000, note: "Range depends on damage size and gel coat color matching." },
    kitchen_remodel:   { low: 5000, high: 40000,note: "Range depends on scope, cabinet quality, and layout changes." },
    bathroom_remodel:  { low: 3000, high: 20000,note: "Range depends on fixture quality and plumbing relocation." },
    drywall:           { low: 200,  high: 2000, note: "Range depends on square footage and number of coats needed." },
    concrete_masonry:  { low: 500,  high: 8000, note: "Range depends on project size and rebar/forming needs." },
    fencing:           { low: 800,  high: 6000, note: "Range depends on linear footage and material type." },
    deck_patio:        { low: 1500, high: 15000,note: "Range depends on square footage and decking material." },
    welding:           { low: 200,  high: 3000, note: "Range depends on material thickness and joint complexity." },
    pressure_washing:  { low: 100,  high: 500,  note: "Range depends on surface area and cleaning agent needed." },
  };

  return (
    estimates[category] || {
      low: 150,
      high: 1500,
      note: "Range depends on job complexity and local labor rates.",
    }
  );
}
