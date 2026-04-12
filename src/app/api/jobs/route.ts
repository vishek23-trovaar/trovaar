import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { geocodeLocation, haversineDistanceMiles } from "@/lib/geocode";
import { sendEmergencyAlert } from "@/lib/email";
import { sanitizeText, sanitizeDescription } from "@/lib/sanitize";
import { trackEvent } from "@/lib/analytics";
import { jobsLogger as logger } from "@/lib/logger";

const VALID_URGENCIES = ['low', 'medium', 'high', 'emergency'];

const VALID_CATEGORIES = [
  "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping",
  "tree_service", "cleaning", "moving", "carpentry", "flooring", "drywall",
  "auto_repair", "auto_detailing", "auto_glass", "tires_wheels",
  "pest_control", "appliance_repair", "locksmith", "security_cameras",
  "smart_home_install", "computer_repair", "it_networking",
  "photography", "videography", "personal_training", "yoga_instruction",
  "massage_therapy", "nutrition_coaching", "dog_walking", "pet_sitting",
  "pet_grooming", "pet_training", "event_setup", "event_staffing",
  "welding", "powder_coating", "fiberglass_composite", "vinyl_wrap",
  "pressure_washing", "window_cleaning", "gutter_cleaning",
  "general_handyman", "boat_repair", "jetski_repair", "marine_fiberglass",
  "marine_upholstery", "commercial_cleaning", "commercial_electrical",
  "commercial_plumbing", "commercial_hvac", "commercial_glass",
  "shower_glass", "mirror_install", "errands", "grocery_shopping",
  "waiting_in_line", "personal_assistant", "moving_labor",
  "furniture_moving", "heavy_lifting", "irrigation", "fencing",
  "auto_windshield", "it_networking"
];

// ─── Address privacy helpers (used in GET list) ───────────────────────────────

function maskAddressForList(fullAddress: string): string {
  const cityStateMatch = fullAddress.match(/,\s*([^,]+),\s*([A-Z]{2})/);
  if (cityStateMatch) return `${cityStateMatch[1].trim()}, ${cityStateMatch[2]} area`;
  const parts = fullAddress.split(",");
  if (parts.length >= 2) return parts.slice(-2).join(",").trim() + " area";
  return "Location hidden";
}

function approximateCoords(
  lat: number,
  lng: number
): { lat: number; lng: number } {
  // Add random offset of ±0.008 degrees (~0.5 miles) to protect privacy
  const offset = () => (Math.random() - 0.5) * 0.016;
  return { lat: lat + offset(), lng: lng + offset() };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Require authentication to view job listings and map locations
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Sign in to browse jobs and view locations" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categories = searchParams.getAll("category");
  const category = categories.length === 1 ? categories[0] : null;
  const status = searchParams.get("status") || "posted,bidding";
  const search = searchParams.get("search")?.trim() || "";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  const db = getDb();
  await initializeDatabase();

  // Auto-expire jobs with no bids past expires_at
  await db.prepare(`
    UPDATE jobs SET status = 'cancelled'
    WHERE status IN ('posted', 'bidding')
      AND expires_at IS NOT NULL
      AND expires_at < datetime('now')
      AND (SELECT COUNT(*) FROM bids WHERE job_id = jobs.id) = 0
  `).run();

  let query = `
    SELECT j.*, u.name as consumer_name,
      u.consumer_rating as consumer_rating,
      u.consumer_rating_count as consumer_rating_count,
      (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count
    FROM jobs j
    JOIN users u ON j.consumer_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (categories.length > 1) {
    // Multiple categories (group-level filter)
    query += ` AND j.category IN (${categories.map(() => "?").join(",")})`;
    params.push(...categories);
  } else if (category) {
    query += " AND j.category = ?";
    params.push(category);
  }

  if (status) {
    const statuses = status.split(",");
    query += ` AND j.status IN (${statuses.map(() => "?").join(",")})`;
    params.push(...statuses);
  }

  if (search) {
    query += " AND (j.title LIKE ? OR j.description LIKE ? OR j.location LIKE ? OR j.category LIKE ?)";
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  query += " ORDER BY j.created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rawJobs = await db.prepare(query).all(...params) as Array<{
    location: string;
    latitude: number | null;
    longitude: number | null;
    [key: string]: unknown;
  }>;
  const total = await db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };

  // Always mask address and approximate coords for the public listing
  // (full address only revealed in the job detail after acceptance + payment)
  const jobs = rawJobs.map((job) => {
    const approx =
      job.latitude != null && job.longitude != null
        ? approximateCoords(job.latitude, job.longitude)
        : null;
    return {
      ...job,
      location: job.location ? maskAddressForList(job.location) : job.location,
      latitude: approx ? approx.lat : null,
      longitude: approx ? approx.lng : null,
      location_masked: true,
    };
  });

  // ── Pull open collaboration help requests and surface them in the feed ──────
  // Only shown to contractors (or unauthenticated browsing); consumers see all.
  // Shape each help request to look like a JobWithBidCount so JobCard can render it.
  let collabEntries: unknown[] = [];
  try {
    interface RawHelpReq {
      hr_id: string;
      job_id: string;
      title: string;
      description: string | null;
      category: string;
      photos: string;
      location: string;
      latitude: number | null;
      longitude: number | null;
      urgency: string;
      status: string;
      consumer_id: string;
      consumer_name: string;
      pay_cents: number;
      spots: number;
      spots_filled: number;
      created_at: string;
      updated_at: string;
    }

    let collabQuery = `
      SELECT
        hr.id          AS hr_id,
        j.id           AS job_id,
        j.title, j.description, j.category, j.photos,
        j.location, j.latitude, j.longitude,
        j.urgency, j.status, j.consumer_id,
        u.name         AS consumer_name,
        hr.pay_cents, hr.spots, hr.spots_filled,
        hr.created_at, j.updated_at
      FROM job_help_requests hr
      JOIN jobs j ON j.id = hr.job_id
      JOIN users u ON u.id = j.consumer_id
      WHERE hr.status = 'open'
        AND hr.spots_filled < hr.spots
    `;
    const collabParams: unknown[] = [];

    if (categories.length > 1) {
      collabQuery += ` AND j.category IN (${categories.map(() => "?").join(",")})`;
      collabParams.push(...categories);
    } else if (category) {
      collabQuery += " AND j.category = ?";
      collabParams.push(category);
    }

    if (search) {
      collabQuery += " AND (j.title LIKE ? OR j.description LIKE ? OR j.location LIKE ?)";
      const q = `%${search}%`;
      collabParams.push(q, q, q);
    }

    collabQuery += " ORDER BY hr.created_at DESC LIMIT 10";

    const rawCollabs = await db.prepare(collabQuery).all(...collabParams) as RawHelpReq[];

    collabEntries = rawCollabs.map((hr) => {
      const approx =
        hr.latitude != null && hr.longitude != null
          ? approximateCoords(hr.latitude, hr.longitude)
          : null;
      return {
        // Shape as a JobWithBidCount so the existing card/map logic works
        id: hr.job_id,               // link to the parent job page
        consumer_id: hr.consumer_id,
        title: hr.title,
        description: hr.description,
        category: hr.category,
        photos: hr.photos,
        location: hr.location ? maskAddressForList(hr.location) : hr.location,
        latitude: approx ? approx.lat : null,
        longitude: approx ? approx.lng : null,
        urgency: hr.urgency,
        status: hr.status,
        emergency_fee: 0,
        expected_completion_date: null,
        created_at: hr.created_at,
        updated_at: hr.updated_at,
        bid_count: 0,
        consumer_name: hr.consumer_name,
        location_masked: true,
        // Collab-specific fields
        is_collab: true,
        collab_help_request_id: hr.hr_id,
        collab_pay_cents: hr.pay_cents,
        collab_spots: hr.spots,
        collab_spots_filled: hr.spots_filled,
      };
    });
  } catch { /* non-fatal — table may not exist yet */ }

  // Merge and re-sort by created_at descending
  const allEntries = [...jobs, ...collabEntries].sort(
    (a, b) =>
      new Date((b as { created_at: string }).created_at).getTime() -
      new Date((a as { created_at: string }).created_at).getTime()
  );

  return NextResponse.json({ jobs: allEntries, total: total.count });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "consumer") {
    return NextResponse.json({ error: "Only consumers can post jobs" }, { status: 403 });
  }
  try {
    const { title, description, category, photos, videos, location, urgency, expected_completion_date, ai_questions, reference_links, inspiration_photos, budget_range } = await request.json();

    if (!title || !category || !location || !urgency) {
      return NextResponse.json({ error: "Title, category, location, and urgency are required" }, { status: 400 });
    }
    if (title.length > 120) {
      return NextResponse.json({ error: "Title must be 120 characters or less" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: "Description must be 2000 characters or less" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    if (urgency && !VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json({ error: "Urgency must be one of: low, medium, high, emergency" }, { status: 400 });
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = sanitizeDescription(description);
    const sanitizedLocation = sanitizeText(location);

    const db = getDb();
  await initializeDatabase();
    const id = uuidv4();

    const isEmergency = urgency === "emergency";
    const emergencyFee = isEmergency ? 1 : 0;

    // Default expiry: 30 days from now (can be shorter for emergency jobs)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const photosArray: string[] = photos || [];
    const videosArray: string[] = videos || [];
    const beforePhotoUrl = photosArray.length > 0 ? photosArray[0] : null;

    await db.prepare(
      `INSERT INTO jobs (id, consumer_id, title, description, category, photos, videos, location, urgency, emergency_fee, expected_completion_date, expires_at, ai_questions, reference_links, inspiration_photos, before_photo_url, budget_range)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, payload.userId, sanitizedTitle, sanitizedDescription, category,
      JSON.stringify(photosArray), JSON.stringify(videosArray), sanitizedLocation, urgency, emergencyFee,
      expected_completion_date || null, expiresAt,
      ai_questions ? JSON.stringify(ai_questions) : null,
      reference_links && reference_links.length > 0 ? JSON.stringify(reference_links) : null,
      inspiration_photos && inspiration_photos.length > 0 ? JSON.stringify(inspiration_photos) : null,
      beforePhotoUrl,
      budget_range || null
    );

    try { trackEvent("job_posted", { userId: payload.userId, jobId: id, properties: { category, urgency } }); } catch {}

    // Geocode all jobs (non-blocking) so they appear on the map
    ;(async () => {
      try {
        const coords = await geocodeLocation(location);
        if (coords) {
          await db.prepare("UPDATE jobs SET latitude = ?, longitude = ? WHERE id = ?").run(
            coords.lat, coords.lon, id
          );

          // For emergency jobs: also alert nearby contractors
          if (isEmergency) {
            const contractors = await db.prepare(
              `SELECT u.id, u.email, u.name, u.latitude, u.longitude
               FROM users u
               JOIN contractor_profiles cp ON cp.user_id = u.id
               WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL`
            ).all() as Array<{ id: string; email: string; name: string; latitude: number; longitude: number }>;

            const nearby = contractors.filter((c) =>
              haversineDistanceMiles(coords.lat, coords.lon, c.latitude, c.longitude) <= 20
            );

            for (const contractor of nearby) {
              await db.prepare(
                `INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)`
              ).run(
                uuidv4(), contractor.id, "emergency_job",
                "⚡ Emergency Job Near You",
                `${title} in ${location} — bid now for a +25% bonus!`,
                id
              );

              sendEmergencyAlert(contractor.email, contractor.name, title, location, id).catch((err) => {
                logger.error({ err, email: contractor.email }, "Failed to send emergency alert");
              });
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Geocode error");
      }
    });

    // Feature 28 — Neighborhood Group Buying: check for group opportunities
    // Extract zip code from location string
    const zipMatch = location.match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : null;

    if (zip && category) {
      try {
        interface GroupJob {
          id: string;
          participant_count: number;
        }
        const existingGroup = await db.prepare(`
          SELECT * FROM group_jobs
          WHERE category = ? AND zip_code = ? AND status = 'forming'
          AND expires_at > datetime('now')
          LIMIT 1
        `).get(category, zip) as GroupJob | undefined;

        if (existingGroup) {
          await db.prepare(
            "UPDATE group_jobs SET participant_count = participant_count + 1 WHERE id = ?"
          ).run(existingGroup.id);
          await db.prepare(
            "INSERT INTO group_job_participants (id, group_job_id, job_id, consumer_id) VALUES (?, ?, ?, ?)"
          ).run(uuidv4(), existingGroup.id, id, payload.userId);
        } else {
          // Check if any similar jobs exist in this zip
          const similarJobs = await db.prepare(`
            SELECT COUNT(*) as count FROM jobs
            WHERE category = ? AND location LIKE ? AND status = 'open'
            AND created_at >= datetime('now', '-7 days')
            AND consumer_id != ?
          `).get(category, `%${zip}%`, payload.userId) as { count: number };

          if (similarJobs.count >= 1) {
            const groupId = uuidv4();
            await db.prepare(
              "INSERT INTO group_jobs (id, category, zip_code, lead_job_id, expires_at, participant_count) VALUES (?, ?, ?, ?, datetime('now', '+7 days'), 1)"
            ).run(groupId, category, zip, id);
            await db.prepare(
              "INSERT INTO group_job_participants (id, group_job_id, job_id, consumer_id) VALUES (?, ?, ?, ?)"
            ).run(uuidv4(), groupId, id, payload.userId);
          }
        }
      } catch (groupErr) {
        // Non-blocking: group buying logic should not fail the job creation
        logger.error({ err: groupErr }, "Group buying check error");
      }
    }

    // Feature 2: notify contractors whose alert preferences include this category
    try {
      interface AlertContractor {
        user_id: string;
        categories: string;
      }
      const alertContractors = await db.prepare(`
        SELECT jap.user_id, jap.categories
        FROM job_alert_preferences jap
        JOIN contractor_profiles cp ON cp.user_id = jap.user_id
        WHERE jap.categories LIKE ?
          AND (cp.is_suspended IS NULL OR cp.is_suspended = 0)
        LIMIT 50
      `).all(`%"${category}"%`) as AlertContractor[];

      for (const ac of alertContractors) {
        try {
          const cats: string[] = JSON.parse(ac.categories);
          if (!cats.includes(category)) continue;
          await db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
            VALUES (?, ?, 'new_job_alert', 'New Job Alert', ?, ?, datetime('now'))
          `).run(
            uuidv4(),
            ac.user_id,
            `A new ${category.replace(/_/g, " ")} job was posted: ${title}`,
            id
          );
        } catch { /* skip malformed row */ }
      }
    } catch { /* non-blocking: never fail job creation */ }

    const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create job error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
