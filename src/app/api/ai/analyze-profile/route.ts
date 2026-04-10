import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

interface ProfileAnalysis {
  specialties: Array<{ category: string; level: string; years: number }>;
  strengths: string[];
  certifications_summary: string;
  experience_tier: "entry" | "mid" | "senior" | "master";
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 10, windowMs: 60 * 60 * 1000, keyPrefix: "ai-profile" });
  if (rl) return rl;

  const { contractorId } = await request.json() as { contractorId: string };

  // Only the contractor themselves can analyze their own profile
  if (payload.userId !== contractorId && !payload.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await initializeDatabase();
  const db = getDb();

  try {
    // Gather contractor profile
    const profile = await db.prepare(
      `SELECT cp.*, u.name, u.location
       FROM contractor_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = ?`
    ).get(contractorId) as Record<string, unknown> | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    // Gather work history
    const workHistory = await db.prepare(
      `SELECT company_name, role, start_date, end_date, description
       FROM work_history WHERE contractor_id = ? ORDER BY start_date DESC`
    ).all(contractorId) as Array<Record<string, unknown>>;

    // Gather certifications
    const certifications = await db.prepare(
      `SELECT name, issuer, issue_date, expiry_date, verified
       FROM certifications WHERE contractor_id = ? ORDER BY issue_date DESC`
    ).all(contractorId) as Array<Record<string, unknown>>;

    // Gather quiz/skill assessment scores (if table exists)
    let quizScores: Array<Record<string, unknown>> = [];
    try {
      quizScores = await db.prepare(
        `SELECT category, score, percentage
         FROM skill_assessments WHERE user_id = ? ORDER BY percentage DESC`
      ).all(contractorId) as Array<Record<string, unknown>>;
    } catch {
      // skill_assessments table may not exist yet
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    const categories = (() => {
      try { return JSON.parse(String(profile.categories || "[]")); } catch { return []; }
    })();

    const promptText = `Analyze this contractor's professional profile and extract their key strengths and specialties.

CONTRACTOR PROFILE:
- Name: ${profile.name}
- Location: ${profile.location || "Not specified"}
- Service Categories: ${categories.join(", ") || "None listed"}
- Years of Experience: ${profile.years_experience || 0}
- Bio: ${profile.bio || "None"}
- About Me: ${profile.about_me || "None"}
- Rating: ${profile.rating || 0}/5 (${profile.rating_count || 0} reviews)
- Contractor Type: ${profile.contractor_type || "independent"}
- Verification Status: ${profile.verification_status || "none"}
- Insurance Status: ${profile.insurance_status || "none"}
- Background Check: ${profile.background_check_status || "none"}
- License Number: ${profile.license_number || "None"}

WORK HISTORY:
${workHistory.length > 0
  ? workHistory.map((w) =>
    `- ${w.role || "Worker"} at ${w.company_name} (${w.start_date || "?"} to ${w.end_date || "Present"}): ${w.description || "No description"}`
  ).join("\n")
  : "No work history recorded"}

CERTIFICATIONS:
${certifications.length > 0
  ? certifications.map((c) =>
    `- ${c.name} from ${c.issuer || "Unknown issuer"} (issued: ${c.issue_date || "?"}, expires: ${c.expiry_date || "N/A"}, verified: ${c.verified ? "Yes" : "No"})`
  ).join("\n")
  : "No certifications recorded"}

SKILL ASSESSMENT SCORES:
${quizScores.length > 0
  ? quizScores.map((q) => `- ${q.category}: ${q.percentage}%`).join("\n")
  : "No assessments taken"}

Based on ALL the above information, analyze this contractor and return a JSON object with:
1. "specialties" - An array of their primary specialties ranked by strength. Each item: { "category": string, "level": "beginner"|"intermediate"|"expert", "years": number }
2. "strengths" - An array of 3-5 concise key strengths (e.g. "12 years residential plumbing experience", "Master licensed and insured")
3. "certifications_summary" - A brief 1-2 sentence summary of their certifications and what they indicate
4. "experience_tier" - One of "entry" (0-2 years), "mid" (3-7 years), "senior" (8-15 years), or "master" (16+ years) based on total verifiable experience

Return ONLY valid JSON with no markdown formatting, no code fences, no extra text.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: promptText }],
    });

    const responseBlock = message.content[0];
    if (responseBlock.type !== "text") throw new Error("Unexpected response type");

    const text = responseBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI analysis");

    const analysis: ProfileAnalysis = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!Array.isArray(analysis.specialties) || !Array.isArray(analysis.strengths)) {
      throw new Error("Invalid analysis format");
    }

    // Store the analysis in the contractor_profiles table
    const summaryJson = JSON.stringify(analysis);
    await db.prepare(
      `UPDATE contractor_profiles SET ai_profile_summary = ? WHERE user_id = ?`
    ).run(summaryJson, contractorId);

    return NextResponse.json({ analysis });
  } catch (err) {
    logger.error({ err }, "AI profile analysis error");
    return NextResponse.json({ error: "Failed to analyze profile" }, { status: 500 });
  }
}
