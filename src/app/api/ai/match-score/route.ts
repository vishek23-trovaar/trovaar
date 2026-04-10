import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

interface MatchScoreResult {
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, keyPrefix: "ai-match" });
  if (rl) return rl;

  const { jobId, contractorId } = await request.json() as { jobId: string; contractorId: string };

  if (!jobId || !contractorId) {
    return NextResponse.json({ error: "jobId and contractorId are required" }, { status: 400 });
  }

  await initializeDatabase();
  const db = getDb();

  try {
    // Check cache first
    const cached = await db.prepare(
      `SELECT score, reasoning, highlights, concerns, computed_at
       FROM match_score_cache WHERE job_id = ? AND contractor_id = ?`
    ).get(jobId, contractorId) as Record<string, unknown> | undefined;

    if (cached) {
      // Use cache if less than 24 hours old
      const computedAt = new Date(String(cached.computed_at));
      const ageHours = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        return NextResponse.json({
          score: cached.score,
          reasoning: cached.reasoning,
          highlights: JSON.parse(String(cached.highlights || "[]")),
          concerns: JSON.parse(String(cached.concerns || "[]")),
          cached: true,
        });
      }
    }

    // Gather job details
    const job = await db.prepare(
      `SELECT j.*, u.name as consumer_name
       FROM jobs j JOIN users u ON u.id = j.consumer_id
       WHERE j.id = ?`
    ).get(jobId) as Record<string, unknown> | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Gather contractor profile
    const profile = await db.prepare(
      `SELECT cp.*, u.name, u.location as user_location
       FROM contractor_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = ?`
    ).get(contractorId) as Record<string, unknown> | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
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

    // Gather quiz scores
    let quizScores: Array<Record<string, unknown>> = [];
    try {
      quizScores = await db.prepare(
        `SELECT category, score, percentage
         FROM skill_assessments WHERE user_id = ? ORDER BY percentage DESC`
      ).all(contractorId) as Array<Record<string, unknown>>;
    } catch {
      // skill_assessments may not exist yet
    }

    // Get AI profile summary if available
    const aiSummary = profile.ai_profile_summary ? String(profile.ai_profile_summary) : null;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    const categories = (() => {
      try { return JSON.parse(String(profile.categories || "[]")); } catch { return []; }
    })();

    const jobCategory = String(job.category || "");
    const categoryMatch = categories.includes(jobCategory);

    // Find quiz score for this job's category
    const relevantQuiz = quizScores.find((q) => String(q.category) === jobCategory);

    const promptText = `Score how well this contractor matches this specific job. Consider all factors carefully.

JOB DETAILS:
- Title: ${job.title}
- Description: ${job.description || "No description"}
- Category: ${jobCategory}
- Urgency: ${job.urgency}
- Location: ${job.location}

CONTRACTOR PROFILE:
- Name: ${profile.name}
- Location: ${profile.user_location || "Not specified"}
- Service Categories: ${categories.join(", ") || "None listed"}
- Category Match: ${categoryMatch ? "YES - contractor lists this category" : "NO - this category is not in their profile"}
- Years of Experience: ${profile.years_experience || 0}
- Rating: ${profile.rating || 0}/5.0 (${profile.rating_count || 0} reviews)
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
    `- ${c.name} from ${c.issuer || "Unknown"} (verified: ${c.verified ? "Yes" : "No"})`
  ).join("\n")
  : "No certifications"}

QUIZ SCORE FOR JOB CATEGORY (${jobCategory}):
${relevantQuiz ? `${relevantQuiz.percentage}%` : "No assessment taken for this category"}

ALL QUIZ SCORES:
${quizScores.length > 0
  ? quizScores.map((q) => `- ${q.category}: ${q.percentage}%`).join("\n")
  : "No assessments taken"}

${aiSummary ? `AI PROFILE SUMMARY:\n${aiSummary}` : ""}

SCORING GUIDELINES:
- 90-100: Perfect match — strong category expertise, great rating, relevant certs, high quiz score
- 75-89: Strong match — good expertise in category, decent experience
- 60-74: Moderate match — some relevant experience but gaps
- 40-59: Weak match — limited relevant experience
- 0-39: Poor match — wrong specialty area

Return ONLY a JSON object with:
- "score": integer 0-100
- "reasoning": string, 1-2 sentences explaining the score
- "highlights": array of 2-4 short strings noting positive factors (e.g. "12 years plumbing experience", "Master licensed", "96% quiz score")
- "concerns": array of 0-2 short strings noting gaps (e.g. "No HVAC certification", "New to platform")

Return ONLY valid JSON with no markdown formatting, no code fences, no extra text.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: promptText }],
    });

    const responseBlock = message.content[0];
    if (responseBlock.type !== "text") throw new Error("Unexpected response type");

    const text = responseBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse match score");

    const result: MatchScoreResult = JSON.parse(jsonMatch[0]);

    // Validate
    if (typeof result.score !== "number" || result.score < 0 || result.score > 100) {
      throw new Error("Invalid score value");
    }

    // Cache the result (upsert)
    const cacheId = uuidv4();
    await db.prepare(
      `INSERT INTO match_score_cache (id, job_id, contractor_id, score, reasoning, highlights, concerns, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (job_id, contractor_id) DO UPDATE SET
         score = EXCLUDED.score,
         reasoning = EXCLUDED.reasoning,
         highlights = EXCLUDED.highlights,
         concerns = EXCLUDED.concerns,
         computed_at = NOW()`
    ).run(
      cacheId,
      jobId,
      contractorId,
      result.score,
      result.reasoning || "",
      JSON.stringify(result.highlights || []),
      JSON.stringify(result.concerns || []),
    );

    return NextResponse.json({
      score: result.score,
      reasoning: result.reasoning,
      highlights: result.highlights || [],
      concerns: result.concerns || [],
      cached: false,
    });
  } catch (err) {
    logger.error({ err }, "AI match score error");
    return NextResponse.json({ error: "Failed to compute match score" }, { status: 500 });
  }
}
