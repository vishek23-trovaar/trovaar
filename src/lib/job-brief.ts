import { getDb } from "@/lib/db";
import {
  geminiJson,
  photosToInlineParts,
  base64ToInlineParts,
  questionItemSchema,
  SCENARIO_QUESTION_GUIDANCE,
  normalizeQuestions,
  uploadVideoToGemini,
  deleteGeminiFile,
  videoFilePart,
  type GeminiUploadedFile,
} from "@/lib/gemini";
import { aiLogger as logger } from "@/lib/logger";
import { CATEGORIES } from "@/lib/constants";
import type { JobBrief } from "@/types";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

/**
 * JobBrief — one structured understanding of a customer's post, fused from all
 * modalities (typed text + photos; video transcripts are already folded into the
 * description upstream by voice-analyze). The type lives in @/types (no server
 * deps) so client components can render it. See JOB_INTAKE_DESIGN.md.
 *
 * Phase 1 is SHADOW MODE: the brief is generated and persisted on the job, but
 * no UI reads it yet — it exists for quality comparison with zero user-facing risk.
 */
export type { JobBrief };

const URGENCIES = ["low", "medium", "high", "emergency"] as const;
const IMPORTANCE = ["required", "preferred"] as const;
const CONFIDENCE = ["high", "medium", "low"] as const;

// Gemini response_schema (uppercase types). `category` is NOT requested from the
// model — it's a known, validated job field we carry through, not re-derive.
const JOB_BRIEF_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    urgency: { type: "STRING", enum: [...URGENCIES] },
    scopeItems: { type: "ARRAY", items: { type: "STRING" } },
    likelyMaterials: { type: "ARRAY", items: { type: "STRING" } },
    accessNotes: { type: "STRING" },
    riskFlags: { type: "ARRAY", items: { type: "STRING" } },
    requiredCapabilities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          skill: { type: "STRING" },
          importance: { type: "STRING", enum: [...IMPORTANCE] },
        },
        required: ["skill", "importance"],
      },
    },
    openQuestions: { type: "ARRAY", items: questionItemSchema },
    confidence: { type: "STRING", enum: [...CONFIDENCE] },
    // Best-matching category, used when the caller hasn't supplied one (e.g. a
    // mobile photo/video post where category isn't picked yet). Plain string +
    // prompt-listed options + code validation — a 40-value enum here makes the
    // schema "too branchy" for Gemini's constrained decoding (400).
    detectedCategory: { type: "STRING" },
  },
  required: ["title", "description", "urgency", "scopeItems", "openQuestions", "confidence"],
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArr(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim())
    : [];
}

function caps(v: unknown): Array<{ skill: string; importance: "required" | "preferred" }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        skill: str(o.skill).trim(),
        importance: (o.importance === "preferred" ? "preferred" : "required") as "required" | "preferred",
      };
    })
    .filter((c) => c.skill.length > 0);
}

/** Validate/coerce the raw model output into a clean JobBrief. */
export function normalizeJobBrief(
  raw: Record<string, unknown>,
  category: string,
  sources: Array<"text" | "photo" | "video">,
): JobBrief {
  const urgency = (URGENCIES as readonly string[]).includes(str(raw.urgency))
    ? (str(raw.urgency) as JobBrief["urgency"])
    : "medium";
  const confidence = (CONFIDENCE as readonly string[]).includes(str(raw.confidence))
    ? (str(raw.confidence) as JobBrief["confidence"])
    : "low";
  const accessNotes = str(raw.accessNotes).trim().length > 0 ? str(raw.accessNotes).trim() : null;

  return {
    title: str(raw.title).trim().slice(0, 80),
    description: str(raw.description).trim(),
    category,
    urgency,
    scopeItems: strArr(raw.scopeItems),
    likelyMaterials: strArr(raw.likelyMaterials),
    accessNotes,
    riskFlags: strArr(raw.riskFlags),
    requiredCapabilities: caps(raw.requiredCapabilities),
    openQuestions: normalizeQuestions(raw.openQuestions),
    sources,
    confidence,
  };
}

/**
 * Generate a JobBrief from a post's text + photos + optional video via one
 * multimodal Gemini call. Video is uploaded through the File API and analyzed
 * inline (Gemini hears the audio narration and sees the footage), so a
 * video-only post produces the same structured brief as a typed one.
 * Returns null when AI is unavailable or the call fails (callers no-op).
 */
export async function generateJobBrief(input: {
  title?: string;
  description?: string;
  category?: string;
  photos?: string[];
  photosBase64?: Array<{ mimeType?: string; data: string }>;
  videoBase64?: string;
  videoMimeType?: string;
}): Promise<JobBrief | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  let uploaded: GeminiUploadedFile | null = null;
  try {
    // Photos may arrive as uploaded URLs (web) or inline base64 (mobile local files).
    const urlParts = await photosToInlineParts(input.photos, 4);
    const imageParts = [...urlParts, ...base64ToInlineParts(input.photosBase64, 4)].slice(0, 4);

    if (input.videoBase64) {
      uploaded = await uploadVideoToGemini(apiKey, input.videoBase64, input.videoMimeType || "video/webm");
    }
    const hasVideo = !!uploaded;
    const hasCategory = !!input.category?.trim();

    const sources: Array<"text" | "photo" | "video"> = [];
    if (input.title?.trim() || input.description?.trim()) sources.push("text");
    if (imageParts.length > 0) sources.push("photo");
    if (hasVideo) sources.push("video");

    const media = [
      imageParts.length ? `${imageParts.length} photo(s)` : null,
      hasVideo ? "a short video with audio narration" : null,
    ].filter(Boolean).join(" and ");
    const mediaClause = media ? ` and the attached ${media}` : "";

    const prompt = `You are an expert project analyst for Trovaar, a home services & trades marketplace. A customer posted a service request. Produce ONE structured brief that fuses everything provided (typed text${mediaClause}) so contractors understand the job and can bid accurately.

Service category: ${hasCategory ? input.category : "(not specified — infer the best match)"}
Job title: ${input.title?.trim() || "(none)"}
Customer description: ${input.description?.trim() || "(none)"}${imageParts.length ? `\n\n${imageParts.length} photo(s) attached — examine them for scope, condition, materials, and access.` : ""}${hasVideo ? `\n\nA video is attached — transcribe what the customer says, note what is visible in the footage, and fold both into the description and the fields below.` : ""}

Produce:
- title: a clear <= 60 char title (improve the customer's if vague)
- description: 2-5 sentences, first person, fusing the text${hasVideo ? ", what the customer says in the video," : ""} and what's visible in the ${hasVideo ? "footage/photos" : "photos"}
- urgency: one of low, medium, high, emergency (infer from the situation)
- scopeItems: the discrete tasks involved (e.g. "replace P-trap", "repair water-damaged cabinet floor")
- likelyMaterials: materials a pro would likely need
- accessNotes: access/site considerations (stairs, crawl space, parking, tight cabinet); empty string if none
- riskFlags: hazards or unknowns a contractor should price for (e.g. "possible mold", "permit likely required"); empty array if none
- requiredCapabilities: skills/credentials needed, each with importance "required" or "preferred"
- openQuestions: the gaps you could NOT resolve from the inputs — the questions a contractor still needs answered
- confidence: "high" only if the inputs are clear and complete; "low" if sparse or ambiguous
- detectedCategory: the single best-matching category value for this job from this list — ${CATEGORY_VALUES.join(", ")}${hasCategory ? " (echo the category given above)" : ""}

${SCENARIO_QUESTION_GUIDANCE}`;

    const parts: object[] = [...imageParts];
    if (uploaded) parts.push(videoFilePart(uploaded));
    parts.push({ text: prompt });

    const raw = await geminiJson<Record<string, unknown>>({
      apiKey,
      parts,
      schema: JOB_BRIEF_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1500,
    });

    // Use the caller's category if given, else the model's detected one.
    const detected = typeof raw.detectedCategory === "string" ? raw.detectedCategory : "";
    const finalCategory = input.category?.trim() || (CATEGORY_VALUES.includes(detected) ? detected : "");

    return normalizeJobBrief(raw, finalCategory, sources);
  } catch (err) {
    logger.error({ err }, "generateJobBrief failed");
    return null;
  } finally {
    if (uploaded) deleteGeminiFile(apiKey, uploaded.fileName);
  }
}

/**
 * A minimal brief with generic scenario questions, returned to the UI when AI is
 * unavailable so the post-a-job flow never loses its question step. A fallback
 * brief is never persisted (only real generated briefs are stored).
 */
export function fallbackBrief(category: string): JobBrief {
  return {
    title: "",
    description: "",
    category,
    urgency: "medium",
    scopeItems: [],
    likelyMaterials: [],
    accessNotes: null,
    riskFlags: [],
    requiredCapabilities: [],
    openQuestions: [
      { question: "What is the approximate size or scope of the project?", type: "measurement", placeholder: "e.g. dimensions, square footage, quantity" },
      { question: "Is this a repair or a new installation?", type: "choice", placeholder: "Repair / New installation / Replacement" },
      { question: "Are there any access challenges?", type: "text", placeholder: "e.g. 2nd floor, tight crawl space, no parking nearby" },
      { question: "Will you supply materials or should the contractor source everything?", type: "choice", placeholder: "I'll supply / Contractor sources / Not sure" },
    ],
    sources: [],
    confidence: "low",
  };
}

/** Persist a brief onto the job (stored as JSON text, matching the photos/ai_questions convention). */
export async function storeJobBrief(
  db: ReturnType<typeof getDb>,
  jobId: string,
  brief: JobBrief,
): Promise<void> {
  await db
    .prepare(`UPDATE jobs SET ai_brief = ?, ai_brief_at = NOW() WHERE id = ?`)
    .run(JSON.stringify(brief), jobId);
}
