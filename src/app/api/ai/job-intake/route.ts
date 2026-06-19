import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { getDb, initializeDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { aiLogger as logger } from "@/lib/logger";
import { generateJobBrief, storeJobBrief } from "@/lib/job-brief";

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

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const brief = await generateJobBrief({ title, description, category, photos, videoBase64, videoMimeType });
  if (!brief) {
    return NextResponse.json({ error: "Unable to generate brief" }, { status: 503 });
  }

  // Optional persistence — only if a jobId is supplied AND the caller owns it.
  if (jobId) {
    try {
      const db = getDb();
      await initializeDatabase();
      const job = (await db.prepare("SELECT consumer_id FROM jobs WHERE id = ?").get(jobId)) as
        | { consumer_id?: string }
        | undefined;
      if (job && (job.consumer_id === payload.userId || payload.isAdmin)) {
        await storeJobBrief(db, jobId, brief);
      }
    } catch (err) {
      logger.error({ err, jobId }, "Failed to persist job brief");
      // non-fatal — still return the brief
    }
  }

  return NextResponse.json({ brief });
}
