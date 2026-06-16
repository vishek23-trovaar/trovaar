import { aiLogger as logger } from "@/lib/logger";

/**
 * Shared helpers for the Gemini-backed customer-post breakdown routes
 * (detect-category, parse-job, job-questions, voice-analyze).
 *
 * - GEMINI_MODEL: one current multimodal Flash model so the whole breakdown
 *   pipeline stays in sync instead of scattering 1.5-flash / 2.0-flash / 1.5-pro.
 * - photoToInlineData / photosToInlineParts: fetch images (http or /public) into
 *   Gemini inlineData parts — previously copy-pasted verbatim into every route.
 * - geminiJson(): a generateContent call that uses Gemini's native
 *   response_schema structured output, replacing the brittle ```json regex-strip
 *   + JSON.parse dance.
 * - Shared scenario-question guidance + schema + normalizer so the "questions a
 *   contractor would ask" logic lives in one place rather than three copies.
 */

// Already proven in this codebase (parse-job, job-questions). Handles images,
// video, and audio; cheaper and faster than 1.5-pro on the video path.
export const GEMINI_MODEL = "gemini-2.0-flash";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export interface InlineImagePart {
  inlineData: { mimeType: GeminiMediaType; data: string };
}

function mimeFromContentType(ct: string): GeminiMediaType {
  return ct.includes("png") ? "image/png"
    : ct.includes("webp") ? "image/webp"
    : ct.includes("gif") ? "image/gif"
    : "image/jpeg";
}

function mimeFromExt(ext: string): GeminiMediaType {
  return ext === ".png" ? "image/png"
    : ext === ".webp" ? "image/webp"
    : ext === ".gif" ? "image/gif"
    : "image/jpeg";
}

/** Fetch one photo (remote http(s) URL or local /public path) as a Gemini inlineData part, or null on failure. */
export async function photoToInlineData(url: string): Promise<InlineImagePart | null> {
  try {
    if (url.startsWith("http")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const mimeType = mimeFromContentType(res.headers.get("content-type") ?? "image/jpeg");
      return { inlineData: { mimeType, data: Buffer.from(buf).toString("base64") } };
    }
    if (url.startsWith("/")) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", url);
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const mimeType = mimeFromExt(path.extname(url).toLowerCase());
      return { inlineData: { mimeType, data: buffer.toString("base64") } };
    }
    return null;
  } catch {
    return null;
  }
}

/** Map up to `limit` photo URLs to Gemini inlineData parts, dropping any that fail to load. */
export async function photosToInlineParts(urls: string[] | undefined, limit: number): Promise<InlineImagePart[]> {
  if (!urls?.length) return [];
  const results = await Promise.all(urls.slice(0, limit).map(photoToInlineData));
  return results.filter((r): r is InlineImagePart => r !== null);
}

/**
 * Call Gemini generateContent with a JSON response schema and return the parsed
 * object. Throws on transport error / empty response / invalid JSON (callers
 * fall back). No markdown-fence stripping needed — response_schema yields raw JSON.
 */
export async function geminiJson<T>(opts: {
  apiKey: string;
  parts: object[];
  schema: object;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  const { apiKey, parts, schema, model = GEMINI_MODEL, temperature = 0, maxOutputTokens = 1200 } = opts;
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        response_mime_type: "application/json",
        response_schema: schema,
      },
    }),
  });
  if (!res.ok) {
    logger.error({ status: res.status, body: await res.text() }, "Gemini error");
    throw new Error(`Gemini error: ${res.status}`);
  }
  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Empty Gemini response");
  return JSON.parse(text) as T;
}

// ── Scenario questions (shared by parse-job + job-questions) ─────────────────
export const QUESTION_TYPES = ["text", "measurement", "choice", "yesno"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface ScenarioQuestion {
  question: string;
  type: QuestionType;
  placeholder: string;
}

/** Gemini response_schema fragment for a single scenario-question object. */
export const questionItemSchema = {
  type: "OBJECT",
  properties: {
    question: { type: "STRING" },
    type: { type: "STRING", enum: [...QUESTION_TYPES] },
    placeholder: { type: "STRING" },
  },
  required: ["question", "type", "placeholder"],
};

/** The shared rubric for what makes a good contractor pricing question. */
export const SCENARIO_QUESTION_GUIDANCE = `Generate between 2 and 10 questions tailored specifically to this job. Every question should directly help a contractor price the job accurately — don't pad with generic ones. A simple task needs 2-3 questions; a complex renovation might need 8-10.

Focus questions on:
- Exact measurements (room dimensions, pipe sizes, area square footage, fence length, etc.)
- Desired end result ("How do you want it to look after?" / "What finish/material do you prefer?")
- Current condition details the photos don't show (age of system, what's behind the wall, etc.)
- Access considerations (stairs, crawl spaces, parking for work trucks)
- Materials — do they have them or need them sourced?
- Timeline and scheduling constraints
- Previous repair attempts or existing damage not visible
- Budget range or priorities (quality vs. cost)
- For vehicles: year, make, model, mileage
- For rooms: which floor, how many rooms, occupied or empty

Do NOT ask about things already clearly described in the title/description or visible in the photos. Each question has a "question", a "type" (one of text, measurement, choice, yesno), and a "placeholder" example answer.`;

/** Validate/normalize a raw questions array from the model into clean ScenarioQuestions. */
export function normalizeQuestions(raw: unknown): ScenarioQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 10)
    .map((q: { question?: string; type?: string; placeholder?: string }) => ({
      question: q.question || "",
      type: (QUESTION_TYPES as readonly string[]).includes(q.type || "") ? (q.type as QuestionType) : "text",
      placeholder: q.placeholder || "Your answer",
    }))
    .filter((q) => q.question.length > 0);
}
