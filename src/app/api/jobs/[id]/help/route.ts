import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();

  const helpRequests = await db.prepare(`
    SELECT
      hr.*,
      u.name AS lead_contractor_name,
      u.profile_photo AS lead_contractor_photo,
      cp.rating AS lead_rating,
      (
        SELECT COUNT(*) FROM job_help_applications a
        WHERE a.help_request_id = hr.id AND a.status = 'pending'
      ) AS pending_applications,
      (
        SELECT json_group_array(json_object(
          'id', a.id,
          'applicant_id', a.applicant_id,
          'applicant_name', u2.name,
          'applicant_photo', cp2.profile_photo,
          'applicant_rating', cp2.rating,
          'message', a.message,
          'status', a.status,
          'created_at', a.created_at
        ))
        FROM job_help_applications a
        JOIN users u2 ON u2.id = a.applicant_id
        LEFT JOIN contractor_profiles cp2 ON cp2.user_id = a.applicant_id
        WHERE a.help_request_id = hr.id
      ) AS applications_json
    FROM job_help_requests hr
    JOIN users u ON u.id = hr.lead_contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = hr.lead_contractor_id
    WHERE hr.job_id = ?
    ORDER BY hr.created_at DESC
  `).all(id) as Array<Record<string, unknown>>;

  // Parse applications_json for each request
  const enriched = helpRequests.map((hr) => ({
    ...hr,
    applications: (() => {
      try { return JSON.parse(hr.applications_json as string || "[]"); } catch { return []; }
    })(),
  }));

  return NextResponse.json({ help_requests: enriched });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can post help requests" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify caller is the accepted contractor on this job
  const job = await db.prepare(`
    SELECT j.status, b.contractor_id as accepted_contractor_id
    FROM jobs j
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as { status: string; accepted_contractor_id: string } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found or no accepted bid" }, { status: 404 });
  }
  if (job.accepted_contractor_id !== payload.userId) {
    return NextResponse.json({ error: "Only the lead contractor can post help requests" }, { status: 403 });
  }
  if (!["accepted", "en_route", "arrived", "in_progress"].includes(job.status)) {
    return NextResponse.json({ error: "Job must be active to post a help request" }, { status: 400 });
  }

  const body = await request.json();
  const { title, description, skills_needed, pay_cents, spots, date_needed } = body as {
    title?: string;
    description?: string;
    skills_needed?: string;
    pay_cents?: number;
    spots?: number;
    date_needed?: string;
  };

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!pay_cents || pay_cents < 100) {
    return NextResponse.json({ error: "Pay must be at least $1.00" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const helpId = randomUUID();

  await db.prepare(`
    INSERT INTO job_help_requests
      (id, job_id, lead_contractor_id, title, description, skills_needed, pay_cents, spots, date_needed, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    helpId, id, payload.userId,
    title.trim(),
    description?.trim() || null,
    skills_needed?.trim() || null,
    pay_cents,
    Math.max(1, Math.min(spots || 1, 20)),
    date_needed || null,
    now, now
  );

  const helpRequest = await db.prepare("SELECT * FROM job_help_requests WHERE id = ?").get(helpId);
  return NextResponse.json({ help_request: helpRequest }, { status: 201 });
}
