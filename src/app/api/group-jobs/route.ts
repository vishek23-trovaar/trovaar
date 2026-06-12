import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

interface GroupJob {
  id: string;
  category: string;
  zip_code: string;
  lead_job_id: string;
  status: string;
  min_participants: number;
  max_participants: number;
  participant_count: number;
  created_at: string;
  expires_at: string | null;
  lead_job_title?: string;
  lead_job_description?: string;
}

// GET /api/group-jobs?category=X&zip=Y — find active group jobs
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const zip = searchParams.get("zip");

  if (!category || !zip) {
    return NextResponse.json({ groups: [] });
  }

  const db = getDb();
  await initializeDatabase();

  const groups = await db.prepare(`
    SELECT g.*, j.title as lead_job_title, j.description as lead_job_description
    FROM group_jobs g
    JOIN jobs j ON j.id = g.lead_job_id
    WHERE g.category = ? AND g.zip_code = ? AND g.status = 'forming'
    AND g.expires_at > NOW()
    ORDER BY g.participant_count DESC
  `).all(category, zip) as GroupJob[];

  return NextResponse.json({ groups });
}

// POST /api/group-jobs — creates a new group job or joins an existing one
export async function POST(req: NextRequest) {
  const payload = getAuthPayload(req.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { group_job_id, job_id } = await req.json();

    if (!group_job_id || !job_id) {
      return NextResponse.json({ error: "group_job_id and job_id are required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Verify the group exists and is still forming
    const group = await db.prepare(
      "SELECT * FROM group_jobs WHERE id = ? AND status = 'forming'"
    ).get(group_job_id) as GroupJob | undefined;

    if (!group) {
      return NextResponse.json({ error: "Group not found or no longer forming" }, { status: 404 });
    }

    // Check if already a participant
    const existing = await db.prepare(
      "SELECT id FROM group_job_participants WHERE group_job_id = ? AND consumer_id = ?"
    ).get(group_job_id, payload.userId);

    if (existing) {
      return NextResponse.json({ error: "You are already a participant in this group" }, { status: 409 });
    }

    // Claim a spot atomically. The guarded UPDATE only succeeds while the
    // group is forming AND has room — two concurrent joins can't both pass a
    // read-then-check, because the guard is re-evaluated under the UPDATE's
    // row lock. changes === 0 means we lost the race (or the group closed).
    let claimed = false;
    await db.transaction(async (tx) => {
      const claim = await tx.prepare(
        "UPDATE group_jobs SET participant_count = participant_count + 1 WHERE id = ? AND status = 'forming' AND participant_count < max_participants"
      ).run(group_job_id);
      if (claim.changes === 0) return; // full — leave claimed=false, tx commits no-op

      await tx.prepare(
        "INSERT INTO group_job_participants (id, group_job_id, job_id, consumer_id) VALUES (?, ?, ?, ?)"
      ).run(uuidv4(), group_job_id, job_id, payload.userId);

      // Close the group once the last spot is claimed
      await tx.prepare(
        "UPDATE group_jobs SET status = 'active' WHERE id = ? AND participant_count >= max_participants"
      ).run(group_job_id);
      claimed = true;
    });

    if (!claimed) {
      return NextResponse.json({ error: "This group is full" }, { status: 400 });
    }

    const updatedGroup = await db.prepare("SELECT * FROM group_jobs WHERE id = ?").get(group_job_id);

    return NextResponse.json({ success: true, group: updatedGroup }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Group jobs POST error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
