import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { generateJobBrief, storeJobBrief, fallbackBrief } from "@/lib/job-brief";

/**
 * Unified multimodal Job Intake (Phase 1 — see JOB_INTAKE_DESIGN.md).
 *
 * Produces one structured JobBrief from a post's text + photos. Eventually
 * replaces parse-job / job-questions / voice-analyze; for now it runs in shadow
 * mode (the brief is stored but no UI reads it). If a `jobId` the caller owns is
 * supplied, the brief is persisted onto that job.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-job-intake" });
  if (rl) return rl;

  const { jobId, title, description, category, photos, videoBase64, videoMimeType } = (await request.json()) as {
    jobId?: string;
    title?: string;
    description?: string;
    category?: string;
    photos?: string[];
    videoBase64?: string;
    videoMimeType?: string;
  };

  // category is optional: the early photo-analysis step runs before the user has
  // picked one (detect-category fills it separately). Brief carries through "".
  const cat = category || "";

  // Only a real, AI-generated brief is persisted; a fallback brief is returned to
  // keep the post-a-job flow's question step alive but is never stored.
  const real = await generateJobBrief({ title, description, category: cat, photos, videoBase64, videoMimeType });
  const brief = real ?? fallbackBrief(cat);

  // Optional persistence — only when a real brief was generated AND a jobId the caller owns is supplied.
  if (jobId && real) {
    try {
      const db = getDb();
      await initializeDatabase();
      const job = (await db.prepare("SELECT consumer_id FROM jobs WHERE id = ?").get(jobId)) as
        | { consumer_id?: string }
        | undefined;
      if (job && (job.consumer_id === payload.userId || payload.isAdmin)) {
        await storeJobBrief(db, jobId, real);
      }
    } catch (err) {
      logger.error({ err, jobId }, "Failed to persist job brief");
      // non-fatal — still return the brief
    }
  }

  return NextResponse.json({ brief });
}
