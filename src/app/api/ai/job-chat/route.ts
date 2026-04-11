import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { getDb, initializeDatabase, type AsyncDatabase } from "@/lib/db";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface QAPair {
  question: string;
  answer: string;
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, keyPrefix: "ai-job-chat" });
  if (rl) return rl;

  const { jobId, message, history } = await request.json() as {
    jobId: string;
    message: string;
    history: ChatMessage[];
  };

  if (!jobId || !message?.trim()) {
    return NextResponse.json({ error: "jobId and message are required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  try {
    await initializeDatabase();
    const db = getDb();

    // Fetch job and verify ownership
    const job = await db.prepare(
      "SELECT id, consumer_id, title, description, category, photos, location, urgency, ai_questions FROM jobs WHERE id = ?"
    ).get(jobId) as { id: string; consumer_id: string; title: string; description: string; category: string; photos: string | null; location: string | null; urgency: string | null; ai_questions: string | null } | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.consumer_id !== payload.userId) {
      return NextResponse.json({ error: "You can only chat about your own jobs" }, { status: 403 });
    }

    // Build job context
    const photos = job.photos ? JSON.parse(job.photos) as string[] : [];
    const existingQA: QAPair[] = job.ai_questions
      ? JSON.parse(job.ai_questions)
      : [];

    const jobContext = [
      `Job Title: ${job.title}`,
      `Category: ${job.category}`,
      job.description ? `Description: ${job.description}` : null,
      job.location ? `Location: ${job.location}` : null,
      job.urgency ? `Urgency: ${job.urgency}` : null,
      photos.length > 0 ? `Photos uploaded: ${photos.length} photo(s)` : null,
      existingQA.length > 0 ? `Previously answered questions:\n${existingQA.map((q) => `  Q: ${q.question}\n  A: ${q.answer}`).join("\n")}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are a helpful project assistant for Trovaar, a home services marketplace. You're helping a homeowner prepare their service request so contractors can provide accurate bids.

Here is the full context of their job posting:
${jobContext}

Your role:
- Ask clarifying questions that contractors would need answered to provide accurate quotes
- Focus on practical details: measurements, materials, access, timeline, budget, current condition
- Keep responses short and conversational (2-3 sentences max)
- Only ask one or two questions at a time
- If the user asks something unrelated to the project, gently redirect them back
- Don't repeat questions that have already been answered
- Be friendly and knowledgeable about home services`;

    // Build Gemini conversation contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // System instruction goes as first user message per Gemini's format
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I'm ready to help with this project." }] });

    // Add conversation history
    for (const msg of (history || [])) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Add current message
    contents.push({ role: "user", parts: [{ text: message }] });

    // Call Gemini
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ body: errBody }, "Gemini job-chat error");
      if (res.status === 429) {
        return NextResponse.json({ error: "AI is temporarily busy — please wait a minute and try again." }, { status: 429 });
      }
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const json = await res.json();
    const reply = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

    if (!reply) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    // Extract Q&A pairs from the full conversation (including the new exchange)
    const fullHistory: ChatMessage[] = [...(history || []), { role: "user", content: message }, { role: "assistant", content: reply }];
    await extractAndSaveQA(apiKey, jobId, fullHistory, existingQA, db);

    return NextResponse.json({ reply });
  } catch (err) {
    logger.error({ err }, "AI job-chat error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function extractAndSaveQA(
  apiKey: string,
  jobId: string,
  history: ChatMessage[],
  existingQA: QAPair[],
  db: AsyncDatabase,
) {
  try {
    // Build the conversation text
    const conversationText = history
      .map((m) => `${m.role === "user" ? "Homeowner" : "Assistant"}: ${m.content}`)
      .join("\n");

    const extractPrompt = `Extract key question-and-answer pairs from this conversation between a homeowner and a project assistant. Only include pairs where the homeowner provided a concrete, useful answer that would help a contractor understand the project.

Conversation:
${conversationText}

${existingQA.length > 0 ? `Already extracted Q&A (do NOT duplicate these):\n${existingQA.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n")}\n` : ""}

Return ONLY a JSON array of NEW question-answer pairs (not already extracted). Each item should have "question" and "answer" fields. If no new pairs can be extracted, return an empty array [].
Return ONLY valid JSON, no markdown, no code blocks.`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
      }),
    });

    if (!res.ok) return;

    const json = await res.json();
    const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim()
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const newPairs: QAPair[] = JSON.parse(text);
    if (!Array.isArray(newPairs) || newPairs.length === 0) return;

    // Validate and clean pairs
    const validPairs = newPairs
      .filter((p) => p.question?.trim() && p.answer?.trim())
      .map((p) => ({ question: p.question.trim(), answer: p.answer.trim() }));

    if (validPairs.length === 0) return;

    // Merge with existing
    const merged = [...existingQA, ...validPairs];

    await db.prepare(
      "UPDATE jobs SET ai_questions = ? WHERE id = ?"
    ).run(JSON.stringify(merged), jobId);
  } catch (err) {
    // Non-critical — don't fail the chat response
    logger.error({ err }, "Failed to extract/save Q&A pairs");
  }
}
