import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// ─── Address masking helpers ──────────────────────────────────────────────────

function maskAddress(fullAddress: string): string {
  // "123 Main St, Atlanta, GA 30301" → "Atlanta, GA area"
  const cityStateMatch = fullAddress.match(/,\s*([^,]+),\s*([A-Z]{2})/);
  if (cityStateMatch) return `${cityStateMatch[1].trim()}, ${cityStateMatch[2]} area`;
  // Fallback: last two comma-delimited parts
  const parts = fullAddress.split(",");
  if (parts.length >= 2) return parts.slice(-2).join(",").trim() + " area";
  return "Location hidden until accepted";
}

interface JobRow {
  id: string;
  consumer_id: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  payment_status: string;
  [key: string]: unknown;
}

function maskJobLocation(
  job: JobRow,
  requesterId: string | null,
  isAcceptedContractor: boolean
): JobRow {
  const isOwner = requesterId !== null && requesterId === job.consumer_id;
  const isPaid =
    job.payment_status === "paid" || job.payment_status === "escrow";

  const shouldRevealFull = isOwner || (isAcceptedContractor && isPaid);

  if (!shouldRevealFull && job.location) {
    return {
      ...job,
      location: maskAddress(job.location),
      latitude: null,
      longitude: null,
      location_masked: true,
    };
  }
  return { ...job, location_masked: false };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();
  const payload = getAuthPayload(request.headers);

  const job = await db.prepare(`
    SELECT j.*, u.name as consumer_name,
      u.consumer_rating as consumer_rating,
      u.consumer_rating_count as consumer_rating_count,
      (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count
    FROM jobs j
    JOIN users u ON j.consumer_id = u.id
    WHERE j.id = ?
  `).get(id) as JobRow | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Determine if requester is the accepted contractor for this job
  let isAcceptedContractor = false;
  if (payload) {
    const acceptedBid = await db.prepare(
      "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
    ).get(id) as { contractor_id: string } | undefined;
    isAcceptedContractor = !!(
      acceptedBid && acceptedBid.contractor_id === payload.userId
    );
  }

  const maskedJob = maskJobLocation(
    job,
    payload?.userId ?? null,
    isAcceptedContractor
  );

  return NextResponse.json({ job: maskedJob });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as {
    consumer_id: string;
    status: string;
  } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.consumer_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // --- Content edit (when title is provided in body) ---
  if (body.title !== undefined) {
    const { title, description, category, urgency, location, photos, expected_completion_date } = body;

    // Guard: no accepted bid and job is still in editable state
    const hasAcceptedBid = await db.prepare(
      "SELECT id FROM bids WHERE job_id = ? AND status = 'accepted'"
    ).get(id);
    if (hasAcceptedBid) {
      return NextResponse.json({ error: "Cannot edit a job with an accepted bid" }, { status: 409 });
    }
    if (!["posted", "bidding"].includes(job.status)) {
      return NextResponse.json({ error: "Job cannot be edited in its current state" }, { status: 409 });
    }
    if (!title || !description?.trim() || !category || !urgency || !location) {
      return NextResponse.json(
        { error: "Title, description, category, urgency, and location are required" },
        { status: 400 }
      );
    }

    await db.prepare(`
      UPDATE jobs SET title = ?, description = ?, category = ?, urgency = ?,
        location = ?, photos = ?, expected_completion_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title,
      description.trim(),
      category,
      urgency,
      location,
      JSON.stringify(photos || []),
      expected_completion_date || null,
      id
    );
  } else if (body.terms_accepted_at !== undefined) {
    // --- Record terms acceptance ---
    await db.prepare("UPDATE jobs SET terms_accepted_at = ?, updated_at = datetime('now') WHERE id = ?")
      .run(body.terms_accepted_at, id);
  } else {
    // --- Status-only update ---
    const { status } = body;
    await db.prepare("UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  const updated = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  return NextResponse.json({ job: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as {
    consumer_id: string;
    status: string;
  } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.consumer_id !== payload.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const hasAcceptedBid = await db.prepare(
    "SELECT id FROM bids WHERE job_id = ? AND status = 'accepted'"
  ).get(id);
  if (hasAcceptedBid) {
    return NextResponse.json({ error: "Cannot delete a job with an accepted bid" }, { status: 409 });
  }
  if (!["posted", "bidding"].includes(job.status)) {
    return NextResponse.json({ error: "Job cannot be deleted in its current state" }, { status: 409 });
  }

  await db.prepare("DELETE FROM bids WHERE job_id = ?").run(id);
  await db.prepare("DELETE FROM jobs WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
