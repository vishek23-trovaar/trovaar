import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { aiLogger as logger } from "@/lib/logger";
import {
  geminiJson,
  photosToInlineParts,
  questionItemSchema,
  SCENARIO_QUESTION_GUIDANCE,
  normalizeQuestions,
  type ScenarioQuestion,
} from "@/lib/gemini";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: { type: "ARRAY", items: questionItemSchema },
  },
  required: ["questions"],
};

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, title, description, photos } = (await request.json()) as {
    category: string;
    title?: string;
    description?: string;
    photos?: string[];
  };

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ questions: getFallbackQuestions(category) });
  }

  try {
    const imageParts = await photosToInlineParts(photos, 2);

    const contextLines = [
      `Service category: ${category}`,
      title?.trim() ? `Job title: "${title.trim()}"` : null,
      description?.trim() ? `Customer description: "${description.trim()}"` : null,
      imageParts.length > 0
        ? `\nThe customer also uploaded ${imageParts.length} photo(s) of the project — examine them carefully for additional context about the scope, condition, and materials.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const promptText = `You are an expert contractor estimating assistant for Trovaar, a home services & trades marketplace. A customer has posted a service request. Generate the specific scenario-based questions a contractor NEEDS answered to provide an accurate quote.

${contextLines}

${SCENARIO_QUESTION_GUIDANCE}`;

    const result = await geminiJson<{ questions?: unknown }>({
      apiKey,
      parts: [...imageParts, { text: promptText }],
      schema: RESPONSE_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 1200,
    });

    const questions = normalizeQuestions(result.questions);
    if (questions.length === 0) throw new Error("No valid questions generated");

    return NextResponse.json({ questions });
  } catch (err) {
    logger.error({ err }, "AI job questions error");
    return NextResponse.json({ questions: getFallbackQuestions(category) });
  }
}

function getFallbackQuestions(category: string): ScenarioQuestion[] {
  const fallbacks: Record<string, ScenarioQuestion[]> = {
    plumbing: [
      { question: "Is this a repair of an existing fixture or a new installation?", type: "choice", placeholder: "Repair / New installation / Replacement" },
      { question: "How many fixtures or areas are affected?", type: "measurement", placeholder: "e.g. 1 sink, 2 toilets" },
      { question: "Is the water shut-off valve easily accessible?", type: "yesno", placeholder: "" },
      { question: "Have you noticed any water damage or mold near the problem area?", type: "yesno", placeholder: "" },
      { question: "What is the approximate age of the plumbing?", type: "text", placeholder: "e.g. 20 years, original to the house" },
    ],
    electrical: [
      { question: "Is this a repair, upgrade, or new installation?", type: "choice", placeholder: "Repair / Upgrade / New installation" },
      { question: "What is your electrical panel amperage?", type: "text", placeholder: "e.g. 100A, 200A, not sure" },
      { question: "How many outlets, switches, or fixtures are involved?", type: "measurement", placeholder: "e.g. 3 outlets, 1 ceiling fan" },
      { question: "Is drywall access needed or is wiring exposed?", type: "choice", placeholder: "Drywall / Exposed / Not sure" },
    ],
    hvac: [
      { question: "What is the square footage of the area to be heated/cooled?", type: "measurement", placeholder: "e.g. 1,500 sq ft" },
      { question: "What is the brand and model of the existing system?", type: "text", placeholder: "e.g. Carrier 24ACC636, not sure" },
      { question: "Is this a repair or full replacement?", type: "choice", placeholder: "Repair / Replacement" },
      { question: "Do you have existing ductwork, or is this ductless?", type: "choice", placeholder: "Ducted / Ductless / Not sure" },
    ],
    roofing: [
      { question: "What is the approximate square footage of your roof?", type: "measurement", placeholder: "e.g. 2,000 sq ft" },
      { question: "Is this a repair or full replacement?", type: "choice", placeholder: "Repair / Full replacement" },
      { question: "What is the current roofing material?", type: "text", placeholder: "e.g. asphalt shingles, metal, tile" },
      { question: "How many stories is your home?", type: "text", placeholder: "e.g. 1 story, 2 story" },
    ],
    auto_repair: [
      { question: "What is the year, make, and model of your vehicle?", type: "text", placeholder: "e.g. 2019 Honda Civic" },
      { question: "What is the current mileage?", type: "measurement", placeholder: "e.g. 65,000 miles" },
      { question: "What symptoms are you experiencing?", type: "text", placeholder: "e.g. grinding noise when braking, check engine light" },
      { question: "Is the vehicle drivable?", type: "yesno", placeholder: "" },
    ],
    flooring: [
      { question: "What is the total square footage of the area?", type: "measurement", placeholder: "e.g. 500 sq ft" },
      { question: "What type of flooring do you want?", type: "text", placeholder: "e.g. hardwood, LVP, tile, carpet" },
      { question: "Does existing flooring need to be removed?", type: "yesno", placeholder: "" },
      { question: "Will you supply the material or should the contractor source it?", type: "choice", placeholder: "I'll supply / Contractor sources / Not sure yet" },
    ],
    painting: [
      { question: "What is the total square footage or number of rooms?", type: "measurement", placeholder: "e.g. 3 rooms, ~1,200 sq ft" },
      { question: "Is this interior, exterior, or both?", type: "choice", placeholder: "Interior / Exterior / Both" },
      { question: "Do the walls need patching or priming first?", type: "yesno", placeholder: "" },
      { question: "Will you supply the paint or should the contractor?", type: "choice", placeholder: "I'll supply / Contractor supplies / Not sure" },
    ],
  };

  return (
    fallbacks[category] || [
      { question: "What is the approximate size or scope of the project?", type: "measurement", placeholder: "e.g. dimensions, square footage, quantity" },
      { question: "Is this a repair or a new installation?", type: "choice", placeholder: "Repair / New installation / Replacement" },
      { question: "Are there any access challenges?", type: "text", placeholder: "e.g. 2nd floor, tight crawl space, no parking nearby" },
      { question: "Will you be supplying materials or should the contractor source everything?", type: "choice", placeholder: "I'll supply / Contractor sources / Not sure" },
    ]
  );
}
