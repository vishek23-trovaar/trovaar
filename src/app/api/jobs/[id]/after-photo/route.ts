import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can upload completion photos" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  // Verify the contractor has an accepted bid on this job
  const acceptedBid = await db.prepare(
    "SELECT id FROM bids WHERE job_id = ? AND contractor_id = ? AND status = 'accepted'"
  ).get(id, payload.userId);

  if (!acceptedBid) {
    return NextResponse.json({ error: "You do not have an accepted bid on this job" }, { status: 403 });
  }

  const job = await db.prepare("SELECT status FROM jobs WHERE id = ?").get(id) as { status: string } | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (!["in_progress", "accepted", "completed"].includes(job.status)) {
    return NextResponse.json({ error: "Job must be in progress or completed to upload a photo" }, { status: 400 });
  }

  const { after_photo_url } = await request.json();
  if (!after_photo_url || typeof after_photo_url !== "string") {
    return NextResponse.json({ error: "after_photo_url is required" }, { status: 400 });
  }

  db.prepare("UPDATE jobs SET after_photo_url = ?, updated_at = datetime('now') WHERE id = ?").run(
    after_photo_url,
    id
  );

  const updated = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  return NextResponse.json({ job: updated });
}
