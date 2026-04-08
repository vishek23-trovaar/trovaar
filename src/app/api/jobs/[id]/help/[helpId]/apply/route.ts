import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; helpId: string }> }
) {
  const { id, helpId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can apply" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();
  const hr = await db.prepare(
    "SELECT * FROM job_help_requests WHERE id = ? AND job_id = ?"
  ).get(helpId, id) as {
    id: string; lead_contractor_id: string; status: string; spots: number; spots_filled: number; pay_cents: number; title: string;
  } | undefined;

  if (!hr) return NextResponse.json({ error: "Help request not found" }, { status: 404 });
  if (hr.status !== "open") return NextResponse.json({ error: "This help request is no longer open" }, { status: 400 });
  if (hr.lead_contractor_id === payload.userId) {
    return NextResponse.json({ error: "You cannot apply to your own help request" }, { status: 400 });
  }
  if (hr.spots_filled >= hr.spots) {
    return NextResponse.json({ error: "All spots are filled" }, { status: 400 });
  }

  // Check if already applied
  const existing = await db.prepare(
    "SELECT id FROM job_help_applications WHERE help_request_id = ? AND applicant_id = ?"
  ).get(helpId, payload.userId);
  if (existing) return NextResponse.json({ error: "You have already applied" }, { status: 409 });

  const { message } = await request.json() as { message?: string };
  const now = new Date().toISOString();
  const appId = randomUUID();

  db.prepare(`
    INSERT INTO job_help_applications (id, help_request_id, job_id, applicant_id, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(appId, helpId, id, payload.userId, message?.trim() || null, now);

  // Notify lead contractor
  const applicantName = (await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | undefined)?.name ?? "A contractor";
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
    VALUES (?, ?, 'help_application', 'New Collaboration Request', ?, ?, ?)
  `).run(
    randomUUID(),
    hr.lead_contractor_id,
    `${applicantName} wants to help on: "${hr.title}"`,
    id,
    now
  );

  return NextResponse.json({ application: await db.prepare("SELECT * FROM job_help_applications WHERE id = ?").get(appId) }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; helpId: string }> }
) {
  const { id, helpId } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const app = await db.prepare(
    "SELECT * FROM job_help_applications WHERE help_request_id = ? AND applicant_id = ? AND job_id = ?"
  ).get(helpId, payload.userId, id) as { id: string; status: string } | undefined;

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status === "accepted") return NextResponse.json({ error: "Cannot withdraw from an accepted application" }, { status: 400 });

  await db.prepare("UPDATE job_help_applications SET status = 'withdrawn' WHERE id = ?").run(app.id);
  return NextResponse.json({ message: "Application withdrawn" });
}
