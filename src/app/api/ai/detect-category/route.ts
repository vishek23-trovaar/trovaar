import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { CATEGORY_GROUPS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit-api";
import fs from "fs";
import path from "path";

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

async function photoToInlineData(url: string): Promise<{ mimeType: MediaType; data: string } | null> {
  try {
    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url);
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType: MediaType =
        ext === ".png" ? "image/png" :
        ext === ".webp" ? "image/webp" :
        ext === ".gif" ? "image/gif" : "image/jpeg";
      return { mimeType, data: buffer.toString("base64") };
    } else if (url.startsWith("http")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      const mimeType: MediaType =
        ct.includes("png") ? "image/png" :
        ct.includes("webp") ? "image/webp" :
        ct.includes("gif") ? "image/gif" : "image/jpeg";
      return { mimeType, data: Buffer.from(buf).toString("base64") };
    }
    return null;
  } catch {
    return null;
  }
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(
  apiKey: string,
  parts: object[],
  schema: object,
): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 64,
        temperature: 0,
        response_mime_type: "application/json",
        response_schema: schema,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const json = await res.json();
  return (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, keyPrefix: "ai-detect" });
  if (rl) return rl;

  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ category: null, categoryGroup: null, label: null });
  }

  const { photos, title, description } = (await request.json()) as {
    photos: string[];
    title?: string;
    description?: string;
  };

  if (!photos?.length) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  try {
    const photosToAnalyze = photos.slice(0, 2);
    const inlineResults = await Promise.all(photosToAnalyze.map(photoToInlineData));
    const imageParts = inlineResults
      .filter((r): r is { mimeType: MediaType; data: string } => r !== null)
      .map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));

    const contextHint = [
      title?.trim() ? `Job title: "${title.trim()}"` : null,
      description?.trim() ? `Description: "${description.trim()}"` : null,
    ].filter(Boolean).join("\n");

    const contextLine = contextHint
      ? `\n\nAdditional context from the customer:\n${contextHint}`
      : "";

    // ── Stage 1: pick the service group (13 choices) ─────────────────────────
    const groupLabels = CATEGORY_GROUPS.map((g) => g.label);

    const stage1Parts = [
      ...imageParts,
      {
        text: `Look at this photo of a service or repair job.${contextLine}

Which of these service groups best describes what's needed? Pick exactly one.`,
      },
    ];

    const stage1Raw = await callGemini(apiKey, stage1Parts, {
      type: "STRING",
      enum: groupLabels,
    });

    const groupLabel = JSON.parse(stage1Raw) as string;
    const matchedGroup = CATEGORY_GROUPS.find((g) => g.label === groupLabel);

    if (!matchedGroup) {
      return NextResponse.json({ category: null, categoryGroup: null, label: null, groupIcon: null });
    }

    // ── Stage 2: pick specific category within that group (~10 choices) ───────
    const categoryValues = matchedGroup.categories.map((c) => c.value);
    const categoryDescriptions = matchedGroup.categories
      .map((c) => `${c.value} — ${c.label}`)
      .join("\n");

    const stage2Parts = [
      ...imageParts,
      {
        text: `Look at this photo of a service or repair job.${contextLine}

This job belongs to the "${matchedGroup.label}" group. Pick the single most specific category:

${categoryDescriptions}

Return only the category key (the part before " — ").`,
      },
    ];

    const stage2Raw = await callGemini(apiKey, stage2Parts, {
      type: "STRING",
      enum: categoryValues,
    });

    const categoryValue = JSON.parse(stage2Raw) as string;
    const matchedCategory = matchedGroup.categories.find((c) => c.value === categoryValue);

    if (!matchedCategory) {
      // Group matched but category didn't — return the first in the group as best guess
      return NextResponse.json({
        category: matchedGroup.categories[0].value,
        categoryGroup: matchedGroup.label,
        label: matchedGroup.categories[0].label,
        groupIcon: matchedGroup.icon,
      });
    }

    return NextResponse.json({
      category: matchedCategory.value,
      categoryGroup: matchedGroup.label,
      label: matchedCategory.label,
      groupIcon: matchedGroup.icon,
    });
  } catch (err) {
    console.error("detect-category error:", err);
    return NextResponse.json({ category: null, categoryGroup: null, label: null, groupIcon: null });
  }
}
