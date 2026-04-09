import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const profile = await db.prepare(`
    SELECT u.id, u.name, u.email, u.location, u.created_at,
      cp.bio, cp.years_experience, cp.categories, cp.profile_photo,
      cp.rating, cp.rating_count,
      cp.verification_status, cp.insurance_status,
      cp.business_established, cp.portfolio_photos,
      cp.contractor_type, cp.qualifications,
      cp.headline, cp.about_me, cp.license_number,
      cp.insurance_verified, cp.background_check_status
    FROM users u
    LEFT JOIN contractor_profiles cp ON u.id = cp.user_id
    WHERE u.id = ? AND u.role = 'contractor'
  `).get(id);

  if (!profile) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const completedJobs = await db.prepare(`
    SELECT COUNT(*) as count FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.contractor_id = ? AND b.status = 'accepted' AND j.status = 'completed'
  `).get(id) as { count: number };

  // On-platform paid completions (jobs that went through escrow)
  const paidCompletions = await db.prepare(`
    SELECT COUNT(*) as count FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.contractor_id = ? AND b.status = 'accepted' AND j.status = 'completed' AND j.payment_status = 'paid'
  `).get(id) as { count: number };

  const totalAccepted = await db.prepare(`
    SELECT COUNT(*) as count FROM bids WHERE contractor_id = ? AND status = 'accepted'
  `).get(id) as { count: number };

  const onPlatformRate = totalAccepted.count > 0
    ? Math.round((paidCompletions.count / totalAccepted.count) * 100)
    : null;

  // Phone gating: only reveal phone if requester has a paid job with this contractor
  const requesterPayload = getAuthPayload(request.headers);
  let phoneVisible = false;
  if (requesterPayload) {
    if (requesterPayload.userId === id) {
      phoneVisible = true; // contractor sees their own phone
    } else {
      const hasPaidJob = await db.prepare(`
        SELECT COUNT(*) as count FROM jobs j
        JOIN bids b ON b.job_id = j.id AND b.contractor_id = ? AND b.status = 'accepted'
        WHERE j.consumer_id = ? AND j.payment_status = 'paid'
      `).get(id, requesterPayload.userId) as { count: number };
      phoneVisible = hasPaidJob.count > 0;
    }
  }

  // Strip phone if not visible
  const safeProfile = { ...(profile as Record<string, unknown>) };
  if (!phoneVisible) {
    delete safeProfile.phone;
  }

  // Fetch certifications and work history
  const certifications = await db
    .prepare("SELECT * FROM certifications WHERE contractor_id = ? ORDER BY created_at DESC")
    .all(id);

  const workHistory = await db
    .prepare("SELECT * FROM work_history WHERE contractor_id = ? ORDER BY start_date DESC")
    .all(id);

  return NextResponse.json({
    profile: safeProfile,
    completedJobs: completedJobs.count,
    paidCompletions: paidCompletions.count,
    onPlatformRate,
    totalAccepted: totalAccepted.count,
    certifications,
    workHistory,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const { bio, years_experience, categories, profile_photo, portfolio_photos, contractor_type, qualifications, headline, about_me, license_number } = await request.json();

    const db = getDb();
  await initializeDatabase();
    await db.prepare(`
      UPDATE contractor_profiles
      SET bio = ?, years_experience = ?, categories = ?, profile_photo = ?, portfolio_photos = ?,
          contractor_type = ?, qualifications = ?,
          headline = ?, about_me = ?, license_number = ?
      WHERE user_id = ?
    `).run(
      bio || null,
      years_experience || 0,
      JSON.stringify(categories || []),
      profile_photo || null,
      JSON.stringify(portfolio_photos || []),
      contractor_type || "independent",
      JSON.stringify(qualifications || []),
      headline || null,
      about_me || null,
      license_number || null,
      id
    );

    const profile = await db.prepare("SELECT * FROM contractor_profiles WHERE user_id = ?").get(id);
    return NextResponse.json({ profile });
  } catch (error) {
    logger.error({ err: error }, "Update profile error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — partial update (contractor_type + qualifications only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const db = getDb();
  await initializeDatabase();

    if (
      body.contractor_type !== undefined ||
      body.qualifications !== undefined ||
      body.years_experience !== undefined
    ) {
      const current = await db.prepare(
        "SELECT contractor_type, qualifications, years_experience FROM contractor_profiles WHERE user_id = ?"
      ).get(id) as { contractor_type: string; qualifications: string; years_experience: number } | undefined;

      const newType = body.contractor_type ?? current?.contractor_type ?? "independent";
      const newQuals = body.qualifications !== undefined
        ? JSON.stringify(body.qualifications)
        : (current?.qualifications ?? "[]");
      const newYears = body.years_experience !== undefined
        ? Number(body.years_experience)
        : (current?.years_experience ?? 0);

      await db.prepare(
        "UPDATE contractor_profiles SET contractor_type = ?, qualifications = ?, years_experience = ? WHERE user_id = ?"
      ).run(newType, newQuals, newYears, id);
    }

    // Handle headline, about_me, license_number updates
    if (body.headline !== undefined || body.about_me !== undefined || body.license_number !== undefined) {
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (body.headline !== undefined) {
        updates.push("headline = ?");
        vals.push(body.headline || null);
      }
      if (body.about_me !== undefined) {
        updates.push("about_me = ?");
        vals.push(body.about_me || null);
      }
      if (body.license_number !== undefined) {
        updates.push("license_number = ?");
        vals.push(body.license_number || null);
      }
      if (updates.length > 0) {
        vals.push(id);
        await db.prepare(`UPDATE contractor_profiles SET ${updates.join(", ")} WHERE user_id = ?`).run(...vals);
      }
    }

    const profile = await db.prepare("SELECT * FROM contractor_profiles WHERE user_id = ?").get(id);
    return NextResponse.json({ profile });
  } catch (error) {
    logger.error({ err: error }, "Patch profile error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
