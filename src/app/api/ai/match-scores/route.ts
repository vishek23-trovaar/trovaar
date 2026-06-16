import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { AI_MODEL, parseStructured } from "@/lib/ai";

interface MatchScoreEntry {
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
}

// One result per contractor, identified by its 1-based index in the prompt.
const BatchScoreSchema = z.object({
  scores: z.array(
    z.object({
      index: z.number(),
      score: z.number(),
      reasoning: z.string(),
      highlights: z.array(z.string()),
      concerns: z.array(z.string()),
    })
  ),
});

// How many contractors to score per Claude call. Most jobs have far fewer bids
// than this, so they resolve in a single call; large jobs split into a few.
const CHUNK_SIZE = 10;

/** Return a fresh (<24h) cached score for a contractor, or null. */
async function getCachedScore(
  db: ReturnType<typeof getDb>,
  jobId: string,
  contractorId: string,
): Promise<MatchScoreEntry | null> {
  const cached = (await db
    .prepare(
      `SELECT score, reasoning, highlights, concerns, computed_at
       FROM match_score_cache WHERE job_id = ? AND contractor_id = ?`
    )
    .get(jobId, contractorId)) as Record<string, unknown> | undefined;

  if (!cached) return null;
  const computedAt = new Date(String(cached.computed_at));
  const ageHours = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours >= 24) return null;

  return {
    score: Number(cached.score),
    reasoning: String(cached.reasoning || ""),
    highlights: JSON.parse(String(cached.highlights || "[]")),
    concerns: JSON.parse(String(cached.concerns || "[]")),
  };
}

/** Upsert a contractor's score into the 24h cache. */
async function cacheScore(
  db: ReturnType<typeof getDb>,
  jobId: string,
  contractorId: string,
  entry: MatchScoreEntry,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO match_score_cache (id, job_id, contractor_id, score, reasoning, highlights, concerns, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (job_id, contractor_id) DO UPDATE SET
         score = EXCLUDED.score,
         reasoning = EXCLUDED.reasoning,
         highlights = EXCLUDED.highlights,
         concerns = EXCLUDED.concerns,
         computed_at = NOW()`
    )
    .run(
      uuidv4(),
      jobId,
      contractorId,
      entry.score,
      entry.reasoning,
      JSON.stringify(entry.highlights),
      JSON.stringify(entry.concerns),
    );
}

interface ContractorBlock {
  contractorId: string;
  block: string;
}

/** Gather a contractor's profile into a compact text block, or null if missing. */
async function gatherContractorBlock(
  db: ReturnType<typeof getDb>,
  contractorId: string,
  jobCategory: string,
): Promise<ContractorBlock | null> {
  const profile = (await db
    .prepare(
      `SELECT cp.*, u.name, u.location as user_location
       FROM contractor_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = ?`
    )
    .get(contractorId)) as Record<string, unknown> | undefined;

  if (!profile) return null;

  const workHistory = (await db
    .prepare(
      `SELECT company_name, role, start_date, end_date
       FROM work_history WHERE contractor_id = ? ORDER BY start_date DESC`
    )
    .all(contractorId)) as Array<Record<string, unknown>>;

  const certifications = (await db
    .prepare(
      `SELECT name, verified
       FROM certifications WHERE contractor_id = ? ORDER BY issue_date DESC`
    )
    .all(contractorId)) as Array<Record<string, unknown>>;

  let quizScores: Array<Record<string, unknown>> = [];
  try {
    quizScores = (await db
      .prepare(`SELECT category, percentage FROM skill_assessments WHERE user_id = ?`)
      .all(contractorId)) as Array<Record<string, unknown>>;
  } catch {
    // skill_assessments may not exist yet
  }

  const categories = (() => {
    try {
      return JSON.parse(String(profile.categories || "[]"));
    } catch {
      return [];
    }
  })();

  const categoryMatch = categories.includes(jobCategory);
  const relevantQuiz = quizScores.find((q) => String(q.category) === jobCategory);
  const aiSummary = profile.ai_profile_summary ? String(profile.ai_profile_summary) : null;

  const work =
    workHistory.length > 0
      ? workHistory
          .slice(0, 5)
          .map(
            (w) =>
              `${w.role || "Worker"} at ${w.company_name} (${w.start_date || "?"}–${w.end_date || "Present"})`
          )
          .join("; ")
      : "None";

  const certs =
    certifications.length > 0
      ? certifications.map((c) => `${c.name} (verified: ${c.verified ? "Yes" : "No"})`).join("; ")
      : "None";

  const block = `- Name: ${profile.name}
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
- Work History: ${work}
- Certifications: ${certs}
- Quiz Score for ${jobCategory}: ${relevantQuiz ? `${relevantQuiz.percentage}%` : "Not taken"}${aiSummary ? `\n- AI Summary: ${aiSummary}` : ""}`;

  return { contractorId, block };
}

/**
 * Score one chunk of contractors against the job in a SINGLE Claude call.
 * The job context + scoring rubric are stated once for the whole chunk
 * instead of being re-sent per contractor — the core token saving.
 */
async function scoreChunk(
  db: ReturnType<typeof getDb>,
  jobId: string,
  jobData: Record<string, unknown>,
  chunk: ContractorBlock[],
): Promise<Record<string, MatchScoreEntry>> {
  const out: Record<string, MatchScoreEntry> = {};
  const jobCategory = String(jobData.category || "");

  const contractorsText = chunk
    .map((c, i) => `=== Contractor #${i + 1} ===\n${c.block}`)
    .join("\n\n");

  const promptText = `Score how well EACH contractor below matches this specific job. Consider all factors carefully and return one score per contractor, identified by their "Contractor #" index.

JOB DETAILS:
- Title: ${jobData.title}
- Description: ${jobData.description || "No description"}
- Category: ${jobCategory}
- Urgency: ${jobData.urgency}
- Location: ${jobData.location}

SCORING GUIDELINES (0-100):
- 90-100: Perfect match — strong category expertise, great rating, relevant certs, high quiz score
- 75-89: Strong match — good expertise in category, decent experience
- 60-74: Moderate match — some relevant experience but gaps
- 40-59: Weak match — limited relevant experience
- 0-39: Poor match — wrong specialty area

CONTRACTORS (${chunk.length}):

${contractorsText}

Return a "scores" array with exactly one entry per contractor. Each entry:
- "index": the contractor's number (1 to ${chunk.length})
- "score": integer 0-100
- "reasoning": 1-2 sentences explaining the score
- "highlights": 2-4 short positive factors (e.g. "12 years plumbing experience", "Master licensed")
- "concerns": 0-2 short gaps (e.g. "No HVAC certification", "New to platform")`;

  const result = await parseStructured({
    model: AI_MODEL.fast,
    schema: BatchScoreSchema,
    content: promptText,
    maxTokens: Math.min(8192, 300 * chunk.length + 256),
    temperature: 0,
  });

  const byIndex = new Map<number, z.infer<typeof BatchScoreSchema>["scores"][number]>();
  if (result?.scores) {
    for (const s of result.scores) byIndex.set(s.index, s);
  }

  for (let i = 0; i < chunk.length; i++) {
    const cid = chunk[i].contractorId;
    const s = byIndex.get(i + 1);
    if (s && typeof s.score === "number" && s.score >= 0 && s.score <= 100) {
      const entry: MatchScoreEntry = {
        score: s.score,
        reasoning: s.reasoning || "",
        highlights: s.highlights || [],
        concerns: s.concerns || [],
      };
      out[cid] = entry;
      await cacheScore(db, jobId, cid, entry); // only cache successful scores
    } else {
      // Missing/invalid entry for this contractor — surface a neutral result, don't cache.
      out[cid] = { score: 0, reasoning: "Unable to compute match score", highlights: [], concerns: [] };
    }
  }

  return out;
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
    const job = (await db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId)) as
      | Record<string, unknown>
      | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (String(job.consumer_id) !== payload.userId && !payload.isAdmin) {
      return NextResponse.json({ error: "Only the job owner can view match scores" }, { status: 403 });
    }

    // Get all bids for this job
    const bids = (await db
      .prepare(`SELECT contractor_id FROM bids WHERE job_id = ? AND status != 'withdrawn'`)
      .all(jobId)) as Array<Record<string, unknown>>;

    if (bids.length === 0) {
      return NextResponse.json({ scores: {} });
    }

    const jobCategory = String(job.category || "");
    const scores: Record<string, MatchScoreEntry> = {};

    // 1. Serve fresh cache hits immediately; collect the rest to score.
    const toScore: string[] = [];
    const seen = new Set<string>();
    for (const bid of bids) {
      const cid = String(bid.contractor_id);
      if (seen.has(cid)) continue; // a contractor can only have one active bid, but be safe
      seen.add(cid);
      const cached = await getCachedScore(db, jobId, cid);
      if (cached) scores[cid] = cached;
      else toScore.push(cid);
    }

    // 2. Gather profiles for cache-misses; missing profiles get a neutral result.
    const blocks: ContractorBlock[] = [];
    for (const cid of toScore) {
      const block = await gatherContractorBlock(db, cid, jobCategory);
      if (block) blocks.push(block);
      else scores[cid] = { score: 0, reasoning: "Contractor profile not found", highlights: [], concerns: ["Profile missing"] };
    }

    // 3. Score the cache-misses in batched Claude calls (one per chunk).
    for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
      const chunk = blocks.slice(i, i + CHUNK_SIZE);
      try {
        Object.assign(scores, await scoreChunk(db, jobId, job, chunk));
      } catch (err) {
        logger.warn({ err, count: chunk.length }, "Failed to compute match scores for chunk");
        for (const c of chunk) {
          scores[c.contractorId] = { score: 0, reasoning: "Unable to compute match score", highlights: [], concerns: [] };
        }
      }
    }

    return NextResponse.json({ scores });
  } catch (err) {
    logger.error({ err }, "AI batch match scores error");
    return NextResponse.json({ error: "Failed to compute match scores" }, { status: 500 });
  }
}
