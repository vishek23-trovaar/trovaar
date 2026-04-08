import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can browse help requests" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = `
    SELECT
      hr.*,
      j.title AS job_title,
      j.category AS job_category,
      j.location AS job_location,
      u.name AS lead_contractor_name,
      cp.rating AS lead_rating,
      cp.rating_count AS lead_rating_count,
      cp.years_experience AS lead_years,
      cp.profile_photo AS lead_photo,
      (
        SELECT COUNT(*) FROM job_help_applications a
        WHERE a.help_request_id = hr.id AND a.status NOT IN ('rejected','withdrawn')
      ) AS applicant_count,
      (
        SELECT a.status FROM job_help_applications a
        WHERE a.help_request_id = hr.id AND a.applicant_id = ?
        LIMIT 1
      ) AS my_application_status
    FROM job_help_requests hr
    JOIN jobs j ON j.id = hr.job_id
    JOIN users u ON u.id = hr.lead_contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = hr.lead_contractor_id
    WHERE hr.status = 'open'
      AND hr.lead_contractor_id != ?
  `;

  const args: unknown[] = [payload.userId, payload.userId];

  if (category) {
    query += " AND j.category = ?";
    args.push(category);
  }

  query += " ORDER BY hr.created_at DESC LIMIT 50";

  const requests = await db.prepare(query).all(...args);
  return NextResponse.json({ help_requests: requests });
}
