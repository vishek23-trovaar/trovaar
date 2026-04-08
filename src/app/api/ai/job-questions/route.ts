import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, title, description } = await request.json() as {
    category: string;
    title?: string;
    description?: string;
  };

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ questions: getFallbackQuestions(category) });
  }

  try {
    const contextLines = [
      `Service category: ${category}`,
      title?.trim() ? `Job title: "${title.trim()}"` : null,
      description?.trim() ? `Customer description: "${description.trim()}"` : null,
    ].filter(Boolean).join("\n");

    const promptText = `You are a contractor estimating assistant. A customer has posted a service request. Generate the specific questions a contractor needs answered to provide an accurate quote.

${contextLines}

Generate questions tailored specifically to this job. Cover:
- Exact measurements, dimensions, square footage, or quantities where relevant
- Vehicle/equipment identifiers (year, make, model, VIN) if applicable
- Current condition and what has already been tried or diagnosed
- Access challenges (stairs, tight spaces, attic, crawl space, etc.)
- Materials preferences or whether the customer supplies them
- Whether this is new install, repair, or replacement
- Timeline or scheduling constraints
- Any trade-specific details critical to accurate pricing for THIS exact job

Do NOT ask about things already described in the title or description.
Do NOT ask generic questions unrelated to this specific job.
Return ONLY a JSON array of question strings. No explanation, no markdown, no code fences.

Example: ["Question 1?", "Question 2?"]`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      console.error("Gemini job-questions error:", await res.text());
      return NextResponse.json({ questions: getFallbackQuestions(category) });
    }

    const json = await res.json();
    const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Could not parse questions from response");

    const questions: string[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error("Invalid questions format");

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI job questions error:", err);
    return NextResponse.json({ questions: getFallbackQuestions(category) });
  }
}

function getFallbackQuestions(category: string): string[] {
  const fallbacks: Record<string, string[]> = {
    plumbing: [
      "Is this a repair of an existing fixture or a new installation?",
      "How many fixtures or areas are affected?",
      "Is the water shut-off valve easily accessible?",
      "Have you noticed any water damage or mold near the problem area?",
      "What is the age of the plumbing in the home?",
      "Is there a crawl space, slab foundation, or basement?",
    ],
    electrical: [
      "Is this a repair, upgrade, or new installation?",
      "What is your electrical panel amperage (100A, 200A, etc.)?",
      "How many outlets, switches, or fixtures are involved?",
      "Is drywall access needed or is wiring exposed?",
      "Will permits be required (new circuits, panel upgrades)?",
      "Is the electrical panel in the home or detached structure?",
    ],
    hvac: [
      "What is the square footage of the area to be heated/cooled?",
      "What is the brand and model of the existing system?",
      "How old is the current system?",
      "Is this a repair or full replacement?",
      "Do you have existing ductwork, or is this ductless?",
      "Is there attic, crawl space, or closet access to the air handler?",
    ],
    roofing: [
      "What is the approximate square footage of your roof?",
      "Is this a repair or full replacement?",
      "What is the current roofing material (shingles, metal, tile, etc.)?",
      "How many stories is your home?",
      "Are there skylights, chimneys, or dormers to work around?",
      "Have you noticed any interior water staining or leaks?",
    ],
    auto_repair: [
      "What is the year, make, and model of your vehicle?",
      "What is the VIN number?",
      "What is the current mileage?",
      "What symptoms are you experiencing (sounds, warning lights, etc.)?",
      "When did the problem first start?",
      "Has this been diagnosed or previously worked on?",
      "Is the vehicle drivable?",
    ],
    jetski_repair: [
      "What is the year, make, and model of the jet ski / PWC?",
      "What is the hull identification number (HIN)?",
      "What engine does it have (2-stroke, 4-stroke, model number)?",
      "What hours are on the engine?",
      "What symptoms are you experiencing?",
      "When was the last service?",
      "Is it currently running at all?",
    ],
    marine_fiberglass: [
      "What is the make, model, and year of the vessel?",
      "What is the hull identification number (HIN)?",
      "What is the size of the damaged area (length × width)?",
      "Is this above or below the waterline?",
      "What is the existing hull color and finish type (gel coat, paint)?",
      "Is there structural damage or just cosmetic?",
      "Do you want color-match gel coat work or will you paint over?",
    ],
    flooring: [
      "What is the total square footage of the area?",
      "What type of flooring are you installing or repairing?",
      "Is subfloor work or removal of existing flooring needed?",
      "Are there stairs or irregular shapes involved?",
      "Is the area on slab, wood subfloor, or over a crawl space?",
      "Will you be supplying the flooring material or should the contractor source it?",
    ],
    painting: [
      "What is the total square footage or number of rooms?",
      "Is this interior, exterior, or both?",
      "Are there high ceilings, vaulted areas, or hard-to-reach surfaces?",
      "Do the walls need patching, priming, or stain blocking first?",
      "What is the current paint condition (peeling, chalking, dirty)?",
      "Will you supply the paint or should the contractor?",
      "How many colors / accent walls?",
    ],
    auto_glass: [
      "What is the year, make, and model of the vehicle?",
      "What is the VIN number?",
      "Is this a repair (chip/crack) or full replacement?",
      "What glass needs service (windshield, door, rear, sunroof)?",
      "How large is the chip or crack in inches?",
      "Does the vehicle have any ADAS cameras mounted to the windshield?",
      "Is OEM or aftermarket glass acceptable?",
    ],
    kitchen_remodel: [
      "What is the square footage of the kitchen?",
      "Is this a full gut remodel or cabinet/surface refresh?",
      "Are you moving plumbing or electrical (wall relocations)?",
      "What is the current cabinet configuration (L-shape, U-shape, galley)?",
      "Are you supplying fixtures, appliances, and cabinets or should the contractor source them?",
      "Do you have a design plan or are you starting from scratch?",
    ],
    bathroom_remodel: [
      "What is the square footage of the bathroom?",
      "Is this a full gut remodel or a refresh (fixtures/tile)?",
      "How many fixtures (toilet, vanity, tub, shower)?",
      "Is there a tub-to-shower conversion or are you keeping the layout?",
      "Will plumbing need to be moved?",
      "Are you supplying tile, fixtures, and vanity or should the contractor source them?",
    ],
  };

  return fallbacks[category] || [
    "What is the approximate size or scope of the project (measurements, square footage, etc.)?",
    "Is this a repair of existing work or a brand new installation?",
    "Are there any access challenges (basement, attic, tight spaces, second floor)?",
    "What is the age of the existing system, structure, or equipment?",
    "Have you received any prior quotes or had previous work done on this?",
    "Will you be supplying any materials, or should the contractor source everything?",
  ];
}
