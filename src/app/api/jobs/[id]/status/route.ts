import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";
import { trackEvent } from "@/lib/analytics";

// Valid contractor-driven status transitions (en_route removed)
// accepted → arrived is optional; accepted → in_progress is also allowed (skipping arrived step)
const CONTRACTOR_TRANSITIONS: Record<string, string[]> = {
  accepted:    ["arrived", "in_progress"],  // arrived is optional; contractor may skip directly to in_progress
  arrived:     ["in_progress"],             // contractor starts work
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Contractors only" }, { status: 403 });

  const body = await request.json() as { status: string; scheduled_at?: string };
  const { status, scheduled_at } = body;

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare(`
    SELECT j.*, b.contractor_id as accepted_contractor_id
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as {
    id: string;
    consumer_id: string;
    status: string;
    title: string;
    accepted_contractor_id: string | null;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (payload.userId !== job.accepted_contractor_id) {
    return NextResponse.json({ error: "Not authorized for this job" }, { status: 403 });
  }

  const allowedNext = CONTRACTOR_TRANSITIONS[job.status];
  if (!allowedNext || !allowedNext.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${job.status} to ${status}` },
      { status: 400 }
    );
  }

  // scheduled_at is optional for arrived; default to current datetime if not provided
  const resolvedScheduledAt = scheduled_at ?? new Date().toISOString();

  const now = new Date().toISOString();

  if (status === "arrived") {
    await db.prepare(
      `UPDATE jobs SET status = ?, scheduled_arrival_at = ?, updated_at = ? WHERE id = ?`
    ).run(status, resolvedScheduledAt, now, id);
  } else {
    await db.prepare(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, id);
  }

  // Consumer notifications
  const scheduledLabel = status === "arrived"
    ? new Date(resolvedScheduledAt).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : "";

  const NOTIFICATIONS: Record<string, { title: string; message: string }> = {
    arrived:     {
      title: "Contractor scheduled! 📅",
      message: `Your pro has scheduled their arrival for "${job.title}"${scheduledLabel ? ` on ${scheduledLabel}` : ""}.`,
    },
    in_progress: {
      title: "Work has started 🔧",
      message: `Your contractor has begun work on "${job.title}".`,
    },
  };

  const notif = NOTIFICATIONS[status];
  if (notif) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), job.consumer_id, `status_${status}`, notif.title, notif.message, id, now);
  }

  return NextResponse.json({ status, scheduled_arrival_at: status === "arrived" ? resolvedScheduledAt : null });
}
