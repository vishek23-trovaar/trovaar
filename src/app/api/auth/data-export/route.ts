/**
 * GET /api/auth/data-export
 *
 * GDPR / CCPA "Right of Access" endpoint.
 * Returns all personal data held about the authenticated user as a single JSON
 * document, rate-limited to 1 request per 24 hours to prevent scraping.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { authLogger as logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Limit exports to once per 24 hours per user
  const rl = checkRateLimit(request, {
    maxRequests: 1,
    windowMs: 24 * 60 * 60 * 1000,
    keyPrefix: `data-export:${payload.userId}`,
  });
  if (rl) return rl;

  try {
    const db = getDb();
    await initializeDatabase();
    const userId = payload.userId;

    // ── 1. Account information ─────────────────────────────────────────────────
    const user = await db.prepare(`
      SELECT id, email, name, role, phone, location,
             email_verified, phone_verified, created_at, account_number,
             referral_code, credit_balance_cents
      FROM users WHERE id = ?
    `).get(userId) as Record<string, unknown> | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── 2. Contractor profile (if applicable) ──────────────────────────────────
    const contractorProfile = await db.prepare(`
      SELECT bio, categories, skills, hourly_rate, years_experience,
             verification_status, insurance_status, rating, rating_count,
             completion_count, contractor_type, service_radius_km,
             available, business_established
      FROM contractor_profiles WHERE user_id = ?
    `).get(userId) as Record<string, unknown> | null;

    // ── 3. Jobs posted (consumer) ─────────────────────────────────────────────
    const jobsPosted = await db.prepare(`
      SELECT id, title, description, category, status, urgency,
             location, created_at, completed_at
      FROM jobs WHERE consumer_id = ?
      ORDER BY created_at DESC
    `).all(userId) as Record<string, unknown>[];

    // ── 4. Bids placed (contractor) ───────────────────────────────────────────
    const bidsPlaced = await db.prepare(`
      SELECT b.id, b.job_id, b.price, b.message, b.status, b.created_at,
             j.title as job_title, j.category as job_category
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      WHERE b.contractor_id = ?
      ORDER BY b.created_at DESC
    `).all(userId) as Record<string, unknown>[];

    // ── 5. Messages ────────────────────────────────────────────────────────────
    const messages = await db.prepare(`
      SELECT m.id, m.job_id, m.content, m.created_at,
             m.sender_id, m.receiver_id
      FROM messages m
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
      LIMIT 500
    `).all(userId, userId) as Record<string, unknown>[];

    // ── 6. Reviews ─────────────────────────────────────────────────────────────
    const reviewsWritten = await db.prepare(`
      SELECT r.id, r.job_id, r.rating, r.comment, r.created_at,
             j.title as job_title
      FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      WHERE r.reviewer_id = ?
      ORDER BY r.created_at DESC
    `).all(userId) as Record<string, unknown>[];

    const reviewsReceived = await db.prepare(`
      SELECT r.id, r.job_id, r.rating, r.comment, r.created_at,
             j.title as job_title
      FROM reviews r
      JOIN jobs j ON j.id = r.job_id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
    `).all(userId) as Record<string, unknown>[];

    // ── 7. Notifications ───────────────────────────────────────────────────────
    const notifications = await db.prepare(`
      SELECT id, type, title, message, read, created_at
      FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 200
    `).all(userId) as Record<string, unknown>[];

    // ── 8. Disputes ────────────────────────────────────────────────────────────
    const disputes = await db.prepare(`
      SELECT d.id, d.job_id, d.reason, d.status, d.created_at,
             j.title as job_title
      FROM disputes d
      JOIN jobs j ON j.id = d.job_id
      WHERE d.opened_by = ?
      ORDER BY d.created_at DESC
    `).all(userId) as Record<string, unknown>[];

    // ── 9. Referrals ───────────────────────────────────────────────────────────
    const referrals = await db.prepare(`
      SELECT rr.id, rr.reward_type, rr.reward_cents, rr.status, rr.created_at
      FROM referral_rewards rr
      WHERE rr.referrer_id = ? OR rr.referred_id = ?
      ORDER BY rr.created_at DESC
    `).all(userId, userId) as Record<string, unknown>[];

    // ── Assemble export ────────────────────────────────────────────────────────
    const exportData = {
      exportedAt: new Date().toISOString(),
      dataController: "Trovaar (trovaar.com)",
      account: user,
      contractorProfile: contractorProfile ?? null,
      activity: {
        jobsPosted,
        bidsPlaced,
        messages: {
          note: "Limited to the 500 most recent messages.",
          items: messages,
        },
      },
      reviews: {
        written: reviewsWritten,
        received: reviewsReceived,
      },
      notifications: {
        note: "Limited to the 200 most recent notifications.",
        items: notifications,
      },
      disputes,
      referrals,
    };

    const filename = `trovaar-data-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    logger.info({ userId }, "Data export generated");

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Data export error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
