import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import {
  geminiJson,
  photosToInlineParts,
  questionItemSchema,
  SCENARIO_QUESTION_GUIDANCE,
  normalizeQuestions,
  type ScenarioQuestion,
} from "@/lib/gemini";

interface ParseJobResult {
  description: string;
  questions: ScenarioQuestion[];
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    description: { type: "STRING" },
    questions: { type: "ARRAY", items: questionItemSchema },
  },
  required: ["description", "questions"],
};

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-parse" });
  if (rl) return rl;

  const { photos } = (await request.json()) as { photos?: string[] };
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && photos?.length) {
    try {
      const imageParts = await photosToInlineParts(photos, 4);
      if (imageParts.length > 0) {
        const prompt = `You are an expert project analyst for a home services & trades marketplace called Trovaar.

Carefully examine the photo(s) provided. Your job is to help a customer describe their project so contractors have everything they need to provide an accurate bid.

Return TWO things:

1. "description" — A clear, detailed description (3-5 sentences) of what you see and what likely needs to be done. Describe visible damage, materials, conditions, scope of work. Write in first person as if the customer is describing it. Be specific about what you observe. Example: "I have a leaking pipe under my kitchen sink. There's visible water damage on the cabinet floor and the P-trap connection appears corroded. The pipe is copper and the joint is leaking at the compression fitting."

2. "questions" — Scenario-based questions a contractor would NEED answered to give an accurate quote, based on what you see.

${SCENARIO_QUESTION_GUIDANCE}`;

        const result = await geminiJson<{ description?: string; questions?: unknown }>({
          apiKey: geminiKey,
          parts: [...imageParts, { text: prompt }],
          schema: RESPONSE_SCHEMA,
          temperature: 0.3,
          maxOutputTokens: 1200,
        });

        const out: ParseJobResult = {
          description: result.description || "",
          questions: normalizeQuestions(result.questions),
        };
        return NextResponse.json(out);
      }
    } catch (err) {
      logger.error({ err }, "Vision analysis failed");
    }
  }

  // Fallback — no AI available
  const fallback: ParseJobResult = {
    description: "",
    questions: [
      { question: "Can you describe what needs to be done in detail?", type: "text", placeholder: "e.g. The pipe under my sink is leaking at the joint" },
      { question: "What are the approximate measurements or dimensions?", type: "measurement", placeholder: "e.g. 12ft x 10ft room, 6ft fence, etc." },
      { question: "How would you like the finished result to look?", type: "text", placeholder: "e.g. Match the existing tile, paint it white, etc." },
    ],
  };
  return NextResponse.json(fallback);
}
