import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { aiLogger as logger } from "@/lib/logger";

// Increase body size limit for video uploads
export const maxDuration = 60;

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping",
  "tree_service", "cleaning", "moving", "carpentry", "flooring", "drywall",
  "auto_repair", "auto_detailing", "pest_control", "appliance_repair",
  "locksmith", "security_cameras", "smart_home_install", "computer_repair",
  "it_networking", "photography", "videography", "personal_training",
  "dog_walking", "pet_sitting", "pet_grooming", "event_setup", "welding",
  "pressure_washing", "window_cleaning", "gutter_cleaning", "general_handyman"
];

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { videoBase64, mimeType = "video/webm" } = await request.json() as { videoBase64: string; mimeType?: string };
  if (!videoBase64) return NextResponse.json({ error: "videoBase64 required" }, { status: 400 });

  try {
    // Step 1: Upload video to Gemini File API
    const videoBytes = Buffer.from(videoBase64, "base64");
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": mimeType,
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Header-Content-Length": String(videoBytes.length),
          "X-Goog-Upload-Header-Content-Type": mimeType,
        },
        body: videoBytes,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      logger.error({ body: errText }, "Gemini upload error");
      return NextResponse.json({ error: "Failed to upload video to AI" }, { status: 502 });
    }

    const uploadData = await uploadRes.json() as { file: { name: string; uri: string; state: string } };
    const fileUri = uploadData.file.uri;
    const fileName = uploadData.file.name;

    // Step 2: Poll until file is ACTIVE (usually instant for short videos)
    let state = uploadData.file.state;
    let attempts = 0;
    while (state === "PROCESSING" && attempts < 10) {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`
      );
      const pollData = await pollRes.json() as { state: string };
      state = pollData.state;
      attempts++;
    }

    if (state !== "ACTIVE") {
      return NextResponse.json({ error: "Video processing timed out" }, { status: 504 });
    }

    // Step 3: Analyze video with Gemini 1.5 Pro
    const prompt = `Watch this video carefully. A customer is describing a home service job they need done.

Your task:
1. Transcribe exactly what they said
2. Note anything you can SEE in the video (damage, problem area, location, scope of work)
3. Extract structured job information combining what you heard AND saw

Available categories: ${CATEGORIES.join(", ")}

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "transcript": "exact transcription of what was said",
  "visual_notes": "brief description of what you saw in the video",
  "title": "short job title max 60 chars",
  "description": "professional description combining audio and visual details, 2-4 sentences",
  "category": "best matching category from the list",
  "urgency": "low or medium or high or emergency",
  "questions": ["up to 3 specific follow-up questions to help contractors bid accurately"]
}`;

    const analyzeRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
        }),
      }
    );

    if (!analyzeRes.ok) {
      const errText = await analyzeRes.text();
      logger.error({ body: errText }, "Gemini analyze error");
      return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
    }

    const aiData = await analyzeRes.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = aiData.candidates[0].content.parts[0].text.trim()
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(text);

    // Clean up the uploaded file (fire and forget)
    fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`, { method: "DELETE" }).catch(() => {});

    return NextResponse.json(parsed);
  } catch (err) {
    logger.error({ err }, "Video analyze error");
    return NextResponse.json({ error: "Failed to analyze video" }, { status: 500 });
  }
}
