import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping",
  "tree_service", "cleaning", "moving", "carpentry", "flooring", "drywall",
  "auto_repair", "auto_detailing", "pest_control", "appliance_repair",
  "locksmith", "security_cameras", "smart_home_install", "computer_repair",
  "it_networking", "photography", "videography", "personal_training",
  "dog_walking", "pet_sitting", "pet_grooming", "event_setup", "welding",
  "pressure_washing", "window_cleaning", "gutter_cleaning", "general_handyman",
  "boat_repair", "jetski_repair", "marine_fiberglass", "marine_upholstery",
  "marine_electrical", "marine_detailing", "marine_trailer",
  "auto_glass", "commercial_glass", "shower_glass", "mirror_install",
  "errands", "grocery_shopping", "waiting_in_line", "personal_assistant",
  "furniture_assembly", "organizing", "event_staffing", "massage_therapy",
  "nutrition_coaching", "yoga_instruction", "personal_training",
  "commercial_cleaning", "commercial_electrical", "commercial_plumbing",
  "commercial_hvac", "irrigation", "fencing", "concrete", "demolition"
];

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
    // Local file path fallback (dev)
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

// ── Gemini vision analysis ─────────────────────────────────────────────────
async function analyzeWithVision(
  apiKey: string,
  photos: string[],
  transcript?: string
): Promise<{ title: string; description: string; category: string; urgency: string; questions: string[] } | null> {
  // Convert up to 4 photos to inline data
  const inlineResults = await Promise.all(photos.slice(0, 4).map(photoToInlineData));
  const imageParts = inlineResults
    .filter((r): r is { mimeType: MediaType; data: string } => r !== null)
    .map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));

  if (imageParts.length === 0 && !transcript?.trim()) return null;

  const contextNote = transcript?.trim() && !transcript.includes("User uploaded")
    ? `\n\nThe customer also said: "${transcript}"`
    : "";

  const prompt = `You are an expert job analysis AI for a home services & trades marketplace.
${imageParts.length > 0 ? "Carefully examine the photo(s) provided." : ""}${contextNote}

Your task:
1. **Identify** exactly what service or repair is needed based on what you SEE in the image(s)
2. **Generate** a clear, specific job title (max 60 chars)
3. **Write** a professional 2-3 sentence description a contractor would find useful
4. **Classify** into the single best category from this list: ${CATEGORIES.join(", ")}
5. **Assess** urgency: low / medium / high / emergency
6. **Generate** 3-4 specific follow-up questions a contractor would need answered to give an accurate bid

Be specific about what you observe — mention visible damage, materials, fixtures, vehicle details, etc.
If the image is unclear, make your best assessment and note uncertainty in the description.

Respond with ONLY valid JSON (no markdown, no code blocks):
{"title":"...","description":"...","category":"...","urgency":"...","questions":["...","...","..."]}`;

  const parts = [
    ...imageParts,
    { text: prompt },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
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
  // Validate category
  if (!CATEGORIES.includes(parsed.category)) {
    parsed.category = "general_handyman";
  }
  return parsed;
}

// ── Text-only Gemini analysis (no photos) ──────────────────────────────────
async function analyzeWithText(
  apiKey: string,
  transcript: string
): Promise<{ title: string; description: string; category: string; urgency: string; questions: string[] } | null> {
  const prompt = `You are a job classification AI for a home services marketplace. Analyze this description and extract structured job info.

Description: "${transcript}"

Available categories: ${CATEGORIES.join(", ")}

Generate 3-4 specific follow-up questions a contractor would need answered.

Respond with ONLY valid JSON (no markdown, no code blocks):
{"title":"Short job title (max 60 chars)","description":"Cleaned up description (2-3 sentences)","category":"one of the available categories","urgency":"low or medium or high or emergency","questions":["...","...","..."]}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
      }),
    }
  );

  if (!res.ok) return null;

  const aiData = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  if (!text) return null;

  const parsed = JSON.parse(text);
  if (!CATEGORIES.includes(parsed.category)) parsed.category = "general_handyman";
  return parsed;
}

// ── Keyword fallback (no AI available) ─────────────────────────────────────
function parseWithKeywords(transcript: string): {
  title: string;
  description: string;
  category: string;
  urgency: string;
  questions: string[];
} {
  const lower = transcript.toLowerCase();

  let category = "general_handyman";
  const categoryMap: Record<string, string[]> = {
    plumbing: ["pipe", "leak", "drain", "toilet", "faucet", "water", "plumb", "sink"],
    electrical: ["electric", "outlet", "wire", "circuit", "breaker", "light", "switch", "power"],
    hvac: ["ac", "heat", "air condition", "furnace", "hvac", "duct", "vent", "cooling", "heating"],
    roofing: ["roof", "shingle", "gutter", "leak", "rain"],
    painting: ["paint", "repaint", "wall", "color", "stain"],
    landscaping: ["lawn", "grass", "garden", "mow", "landscape", "yard", "weed", "plant"],
    tree_service: ["tree", "branch", "trim", "cut down", "stump"],
    cleaning: ["clean", "maid", "housekeep", "vacuum", "sweep", "mop"],
    moving: ["move", "moving", "haul", "furniture", "transport", "relocate"],
    carpentry: ["wood", "cabinet", "shelf", "door", "frame", "carpenter"],
    flooring: ["floor", "tile", "carpet", "hardwood", "laminate"],
    auto_repair: ["car", "vehicle", "brake", "engine", "transmission", "oil change", "tire"],
    auto_detailing: ["detail", "wash car", "polish", "wax"],
    pest_control: ["pest", "bug", "roach", "ant", "mouse", "rat", "termite", "mosquito"],
    dog_walking: ["dog", "walk", "pet", "puppy"],
    computer_repair: ["computer", "laptop", "virus", "slow pc", "windows", "mac"],
    pressure_washing: ["pressure wash", "power wash", "driveway", "concrete"],
    window_cleaning: ["window", "glass"],
    general_handyman: ["fix", "repair", "install", "help", "handyman"],
  };

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      category = cat;
      break;
    }
  }

  let urgency = "medium";
  if (lower.includes("emergency") || lower.includes("asap") || lower.includes("urgent") || lower.includes("right now") || lower.includes("today")) {
    urgency = "emergency";
  } else if (lower.includes("soon") || lower.includes("this week") || lower.includes("couple days")) {
    urgency = "high";
  } else if (lower.includes("whenever") || lower.includes("no rush") || lower.includes("flexible")) {
    urgency = "low";
  }

  const words = transcript.trim().split(" ").slice(0, 8);
  const title = words.join(" ").replace(/[.!?].*$/, "").trim();
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title: capitalizedTitle.length > 60 ? capitalizedTitle.slice(0, 60) + "..." : capitalizedTitle,
    description: transcript.trim(),
    category,
    urgency,
    questions: [
      "Can you describe the current condition in more detail?",
      "Do you have a preferred timeline for completion?",
      "Are there any access restrictions at the job site?",
    ],
  };
}

// ── POST handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-parse" });
  if (rl) return rl;

  const { transcript, photos } = await request.json() as { transcript?: string; photos?: string[] };

  const geminiKey = process.env.GEMINI_API_KEY;

  // ── Strategy 1: Photos available → use Gemini Vision ─────────────────────
  if (geminiKey && photos?.length) {
    try {
      const result = await analyzeWithVision(geminiKey, photos, transcript);
      if (result) return NextResponse.json(result);
    } catch (err) {
      logger.error({ err }, "Vision analysis failed, falling back");
    }
  }

  // ── Strategy 2: Text-only with Gemini ────────────────────────────────────
  if (geminiKey && transcript?.trim()) {
    try {
      const result = await analyzeWithText(geminiKey, transcript);
      if (result) return NextResponse.json(result);
    } catch {
      // Fall through to keyword matching
    }
  }

  // ── Strategy 3: Keyword fallback ─────────────────────────────────────────
  const fallbackText = transcript?.trim() || "Home service project";
  return NextResponse.json(parseWithKeywords(fallbackText));
}
