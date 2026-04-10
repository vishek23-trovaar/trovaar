import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";

interface MatchScoreEntry {
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
}

async function computeMatchScore(
  db: ReturnType<typeof getDb>,
  client: Anthropic,
  jobId: string,
  contractorId: string,
  jobData: Record<string, unknown>,
): Promise<MatchScoreEntry> {
  // Check cache first
  const cached = await db.prepare(
    `SELECT score, reasoning, highlights, concerns, computed_at
     FROM match_score_cache WHERE job_id = ? AND contractor_id = ?`
  ).get(jobId, contractorId) as Record<string, unknown> | undefined;

  if (cached) {
    const computedAt = new Date(String(cached.computed_at));
    const ageHours = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      return {
        score: Number(cached.score),
        reasoning: String(cached.reasoning || ""),
        highlights: JSON.parse(String(cached.highlights || "[]")),
        concerns: JSON.parse(String(cached.concerns || "[]")),
      };
    }
  }

  // Gather contractor data
  const profile = await db.prepare(
    `SELECT cp.*, u.name, u.location as user_location
     FROM contractor_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = ?`
  ).get(contractorId) as Record<string, unknown> | undefined;

  if (!profile) {
    return { score: 0, reasoning: "Contractor profile not found", highlights: [], concerns: ["Profile missing"] };
  }

  const workHistory = await db.prepare(
    `SELECT company_name, role, start_date, end_date, description
     FROM work_history WHERE contractor_id = ? ORDER BY start_date DESC`
  ).all(contractorId) as Array<Record<string, unknown>>;

  const certifications = await db.prepare(
    `SELECT name, issuer, verified
     FROM certifications WHERE contractor_id = ? ORDER BY issue_date DESC`
  ).all(contractorId) as Array<Record<string, unknown>>;

  let quizScores: Array<Record<string, unknown>> = [];
  try {
    quizScores = await db.prepare(
      `SELECT category, percentage FROM skill_assessments WHERE user_id = ?`
    ).all(contractorId) as Array<Record<string, unknown>>;
  } catch {
    // skill_assessments may not exist yet
  }

  const categories = (() => {
    try { return JSON.parse(String(profile.categories || "[]")); } catch { return []; }
  })();

  const jobCategory = String(jobData.category || "");
  const categoryMatch = categories.includes(jobCategory);
  const relevantQuiz = quizScores.find((q) => String(q.category) === jobCategory);
  const aiSummary = profile.ai_profile_summary ? String(profile.ai_profile_summary) : null;

  const promptText = `Score how well this contractor matches this specific job. Consider all factors carefully.

JOB DETAILS:
- Title: ${jobData.title}
- Description: ${jobData.description || "No description"}
- Category: ${jobCategory}
- Urgency: ${jobData.urgency}
- Location: ${jobData.location}

CONTRACTOR PROFILE:
- Name: ${profile.name}
- Location: ${profile.user_location || "Not specified"}
- Service Categories: ${categories.join(", ") || "None listed"}
- Category Match: ${categoryMatch ? "YES" : "NO"}
- Years of Experience: ${profile.years_experience || 0}
- Rating: ${profile.rating || 0}/5.0 (${profile.rating_count || 0} reviews)
- Contractor Type: ${profile.contractor_type || "independent"}
- Verified: ${profile.verification_status === "approved" ? "Yes" : "No"}
- Insured: ${profile.insurance_status === "approved" ? "Yes" : "No"}
- Background Check: ${profile.background_check_status || "none"}
- License: ${profile.license_number || "None"}

WORK HISTORY:
${workHistory.length > 0
  ? workHistory.slice(0, 5).map((w) =>
    `- ${w.role || "Worker"} at ${w.company_name} (${w.start_date || "?"} to ${w.end_date || "Present"})`
  ).join("\n")
  : "None"}

CERTIFICATIONS:
${certifications.length > 0
  ? certifications.map((c) => `- ${c.name} (verified: ${c.verified ? "Yes" : "No"})`).join("\n")
  : "None"}

QUIZ SCORE FOR ${jobCategory}: ${relevantQuiz ? `${relevantQuiz.percentage}%` : "Not taken"}

${aiSummary ? `AI PROFILE SUMMARY:\n${aiSummary}` : ""}

Score 0-100. Return ONLY valid JSON:
{"score": number, "reasoning": "1-2 sentences", "highlights": ["short positive factor", ...], "concerns": ["short gap", ...]}`;

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

  const result: MatchScoreEntry = JSON.parse(jsonMatch[0]);

  if (typeof result.score !== "number" || result.score < 0 || result.score > 100) {
    throw new Error("Invalid score value");
  }

  // Cache result
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

  return {
    score: result.score,
    reasoning: result.reasoning || "",
    highlights: result.highlights || [],
    concerns: result.concerns || [],
  };
}

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 15, windowMs: 60 * 60 * 1000, keyPrefix: "ai-match-batch" });
  if (rl) return rl;

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  await initializeDatabase();
  const db = getDb();

  try {
    // Verify the job exists and the requester is the job owner
    const job = await db.prepare(
      `SELECT * FROM jobs WHERE id = ?`
    ).get(jobId) as Record<string, unknown> | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.consumer_id) !== payload.userId && !payload.isAdmin) {
      return NextResponse.json({ error: "Only the job owner can view match scores" }, { status: 403 });
    }

    // Get all bids for this job
    const bids = await db.prepare(
      `SELECT contractor_id FROM bids WHERE job_id = ? AND status != 'withdrawn'`
    ).all(jobId) as Array<Record<string, unknown>>;

    if (bids.length === 0) {
      return NextResponse.json({ scores: {} });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    // Compute scores for each bidder (sequentially to avoid rate limits)
    const scores: Record<string, MatchScoreEntry> = {};

    for (const bid of bids) {
      const cid = String(bid.contractor_id);
      try {
        scores[cid] = await computeMatchScore(db, client, jobId, cid, job);
      } catch (err) {
        logger.warn({ err, contractorId: cid }, "Failed to compute match score for contractor");
        scores[cid] = {
          score: 0,
          reasoning: "Unable to compute match score",
          highlights: [],
          concerns: [],
        };
      }
    }

    return NextResponse.json({ scores });
  } catch (err) {
    logger.error({ err }, "AI batch match scores error");
    return NextResponse.json({ error: "Failed to compute match scores" }, { status: 500 });
  }
}
