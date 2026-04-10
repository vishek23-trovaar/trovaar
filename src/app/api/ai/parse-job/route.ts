import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

// ── Convert photo URL to Gemini inline data ────────────────────────────────
type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

async function photoToInlineData(url: string): Promise<{ mimeType: MediaType; data: string } | null> {
  try {
    if (url.startsWith("http")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      const mimeType: MediaType =
        ct.includes("png") ? "image/png" :
        ct.includes("webp") ? "image/webp" :
        ct.includes("gif") ? "image/gif" : "image/jpeg";
      return { mimeType, data: Buffer.from(buf).toString("base64") };
    }
    if (url.startsWith("/")) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", url);
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType: MediaType =
        ext === ".png" ? "image/png" :
        ext === ".webp" ? "image/webp" :
        ext === ".gif" ? "image/gif" : "image/jpeg";
      return { mimeType, data: buffer.toString("base64") };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main Gemini Vision analysis ────────────────────────────────────────────
async function analyzeWithVision(
  apiKey: string,
  photos: string[],
): Promise<{ description: string; questions: Array<{ question: string; type: string; placeholder: string }> } | null> {
  const inlineResults = await Promise.all(photos.slice(0, 4).map(photoToInlineData));
  const imageParts = inlineResults
    .filter((r): r is { mimeType: MediaType; data: string } => r !== null)
    .map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));

  if (imageParts.length === 0) return null;

  const prompt = `You are an expert project analyst for a home services & trades marketplace called Trovaar.

Carefully examine the photo(s) provided. Your job is to help a customer describe their project so contractors have everything they need to provide an accurate bid.

Return TWO things:

1. **description** — A clear, detailed description (3-5 sentences) of what you see and what likely needs to be done. Describe visible damage, materials, conditions, scope of work. Write in first person as if the customer is describing it. Be specific about what you observe. Example: "I have a leaking pipe under my kitchen sink. There's visible water damage on the cabinet floor and the P-trap connection appears corroded. The pipe is copper and the joint is leaking at the compression fitting."

2. **questions** — Between 2 and 10 scenario-based questions that a contractor would NEED answered to give an accurate quote. These should be practical, specific questions based on what you see. Each question should have:
   - "question": The question text
   - "type": One of "text", "measurement", "choice", "yesno"
   - "placeholder": A helpful example answer or hint

Focus questions on things like:
- Exact measurements (room dimensions, pipe sizes, area square footage, fence length, etc.)
- Desired end result ("How do you want it to look after?" / "What finish/material do you prefer?")
- Current condition details the photo doesn't show (age of system, what's behind the wall, etc.)
- Access considerations (stairs, crawl spaces, parking for work trucks)
- Materials — do they have them or need them sourced?
- Timeline and scheduling constraints
- Previous repair attempts or existing damage not visible in photos
- Budget range or priorities (quality vs. cost)
- For vehicles: year, make, model, mileage
- For rooms: which floor, how many rooms, occupied or empty

IMPORTANT: Ask the minimum questions needed — don't pad with generic ones. If the photo clearly shows a simple task, 2-3 questions is fine. A complex renovation might need 8-10. Every question should directly help a contractor price the job accurately.

Respond with ONLY valid JSON (no markdown, no code blocks):
{"description":"...","questions":[{"question":"...","type":"text|measurement|choice|yesno","placeholder":"..."},...]}`;

  const parts = [...imageParts, { text: prompt }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
        },
      }),
    }
  );

  if (!res.ok) {
    logger.error({ status: res.status, body: await res.text() }, "Gemini vision error");
    return null;
  }

  const aiData = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  if (!text) return null;

  const parsed = JSON.parse(text);

  // Validate and normalize questions
  const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 10).map((q: { question?: string; type?: string; placeholder?: string }) => ({
    question: q.question || "",
    type: ["text", "measurement", "choice", "yesno"].includes(q.type || "") ? q.type : "text",
    placeholder: q.placeholder || "Your answer",
  })).filter((q: { question: string }) => q.question.length > 0) : [];

  return {
    description: parsed.description || "",
    questions,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-parse" });
  if (rl) return rl;

  const { photos } = await request.json() as { photos?: string[] };

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && photos?.length) {
    try {
      const result = await analyzeWithVision(geminiKey, photos);
      if (result) return NextResponse.json(result);
    } catch (err) {
      logger.error({ err }, "Vision analysis failed");
    }
  }

  // Fallback — no AI available
  return NextResponse.json({
    description: "",
    questions: [
      { question: "Can you describe what needs to be done in detail?", type: "text", placeholder: "e.g. The pipe under my sink is leaking at the joint" },
      { question: "What are the approximate measurements or dimensions?", type: "measurement", placeholder: "e.g. 12ft x 10ft room, 6ft fence, etc." },
      { question: "How would you like the finished result to look?", type: "text", placeholder: "e.g. Match the existing tile, paint it white, etc." },
    ],
  });
}
