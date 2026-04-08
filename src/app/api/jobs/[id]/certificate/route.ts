import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/jobs/[id]/certificate — get certificate data for a completed job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();

  const job = await db.prepare(`
    SELECT
      j.*,
      u.name as consumer_name,
      u.location as consumer_location,
      cu.name as contractor_name,
      cp.license_number,
      cp.contractor_type,
      cp.years_experience,
      b.amount_cents,
      b.labor_cents,
      b.materials_json,
      b.parts_summary
    FROM jobs j
    JOIN users u ON u.id = j.user_id
    JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    JOIN users cu ON cu.id = b.contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = b.contractor_id
    WHERE j.id = ?
      AND (j.user_id = ? OR b.contractor_id = ? OR ? = 'admin')
      AND j.status = 'completed'
  `).get(id, payload.userId, payload.userId, payload.role) as {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    completed_at: string | null;
    consumer_name: string;
    consumer_location: string | null;
    contractor_name: string;
    license_number: string | null;
    contractor_type: string;
    years_experience: number;
    amount_cents: number;
    labor_cents: number | null;
    materials_json: string | null;
    parts_summary: string | null;
  } | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found or not completed" }, { status: 404 });
  }

  // Mark certificate as generated
  await db.prepare(`UPDATE jobs SET certificate_generated = 1 WHERE id = ?`).run(id);

  const review = await db.prepare(`
    SELECT rating, comment FROM reviews WHERE job_id = ? LIMIT 1
  `).get(id) as { rating: number; comment: string | null } | undefined;

  return NextResponse.json({
    certificate: {
      jobId: job.id,
      jobTitle: job.title,
      jobDescription: job.description,
      category: job.category,
      location: job.location,
      completedAt: job.completed_at,
      consumerName: job.consumer_name,
      consumerLocation: job.consumer_location,
      contractorName: job.contractor_name,
      contractorType: job.contractor_type,
      licenseNumber: job.license_number,
      yearsExperience: job.years_experience,
      amountCents: job.amount_cents,
      laborCents: job.labor_cents,
      partsSummary: job.parts_summary,
      review: review ?? null,
      generatedAt: new Date().toISOString(),
    },
  });
}
