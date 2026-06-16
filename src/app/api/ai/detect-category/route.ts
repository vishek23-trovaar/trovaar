import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { CATEGORY_GROUPS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { geminiJson, photosToInlineParts } from "@/lib/gemini";

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
    const imageParts = await photosToInlineParts(photos, 2);

    const contextHint = [
      title?.trim() ? `Job title: "${title.trim()}"` : null,
      description?.trim() ? `Description: "${description.trim()}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const contextLine = contextHint
      ? `\n\nAdditional context from the customer:\n${contextHint}`
      : "";

    // ── Stage 1: pick the service group (13 choices) ─────────────────────────
    const groupLabels = CATEGORY_GROUPS.map((g) => g.label);

    const groupLabel = await geminiJson<string>({
      apiKey,
      parts: [
        ...imageParts,
        { text: `Look at this photo of a service or repair job.${contextLine}\n\nWhich of these service groups best describes what's needed? Pick exactly one.` },
      ],
      schema: { type: "STRING", enum: groupLabels },
      temperature: 0,
      maxOutputTokens: 64,
    });

    const matchedGroup = CATEGORY_GROUPS.find((g) => g.label === groupLabel);

    if (!matchedGroup) {
      return NextResponse.json({ category: null, categoryGroup: null, label: null, groupIcon: null });
    }

    // ── Stage 2: pick specific category within that group (~10 choices) ───────
    const categoryValues = matchedGroup.categories.map((c) => c.value);
    const categoryDescriptions = matchedGroup.categories
      .map((c) => `${c.value} — ${c.label}`)
      .join("\n");

    const categoryValue = await geminiJson<string>({
      apiKey,
      parts: [
        ...imageParts,
        { text: `Look at this photo of a service or repair job.${contextLine}\n\nThis job belongs to the "${matchedGroup.label}" group. Pick the single most specific category:\n\n${categoryDescriptions}\n\nReturn only the category key (the part before " — ").` },
      ],
      schema: { type: "STRING", enum: categoryValues },
      temperature: 0,
      maxOutputTokens: 64,
    });

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
    logger.error({ err }, "detect-category error");
    return NextResponse.json({ category: null, categoryGroup: null, label: null, groupIcon: null });
  }
}
