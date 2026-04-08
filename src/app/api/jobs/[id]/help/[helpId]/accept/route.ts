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

  const db = getDb();
  await initializeDatabase();
  const hr = await db.prepare(
    "SELECT * FROM job_help_requests WHERE id = ? AND job_id = ?"
  ).get(helpId, id) as {
    id: string; lead_contractor_id: string; status: string; spots: number; spots_filled: number; pay_cents: number; title: string;
  } | undefined;

  if (!hr) return NextResponse.json({ error: "Help request not found" }, { status: 404 });
  if (hr.lead_contractor_id !== payload.userId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (hr.status !== "open") return NextResponse.json({ error: "Help request is not open" }, { status: 400 });

  const { application_id } = await request.json() as { application_id: string };
  if (!application_id) return NextResponse.json({ error: "application_id required" }, { status: 400 });

  const app = await db.prepare(
    "SELECT * FROM job_help_applications WHERE id = ? AND help_request_id = ?"
  ).get(application_id, helpId) as {
    id: string; applicant_id: string; status: string;
  } | undefined;

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Application is not pending" }, { status: 400 });

  const now = new Date().toISOString();

  await db.transaction(async (db) => {
    // Accept this application
    await db.prepare(
      "UPDATE job_help_applications SET status = 'accepted' WHERE id = ?"
    ).run(app.id);

    // Increment spots filled
    const newFilled = hr.spots_filled + 1;
    await db.prepare(
      "UPDATE job_help_requests SET spots_filled = ?, status = ?, updated_at = ? WHERE id = ?"
    ).run(newFilled, newFilled >= hr.spots ? "filled" : "open", now, helpId);
  });

  // Notify the accepted helper
  const leadName = (await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | undefined)?.name ?? "The lead contractor";
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
    VALUES (?, ?, 'help_accepted', 'You Got the Gig! 🎉', ?, ?, ?)
  `).run(
    randomUUID(),
    app.applicant_id,
    `${leadName} accepted you to help on "${hr.title}". Pay: $${(hr.pay_cents / 100).toFixed(2)} flat.`,
    id,
    now
  );

  return NextResponse.json({ message: "Application accepted", spots_remaining: hr.spots - (hr.spots_filled + 1) });
}
