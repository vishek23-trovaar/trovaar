import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const user = await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.phone_verified, u.role,
           u.location, u.account_number, u.created_at, u.is_admin,
           u.email_verified, u.latitude, u.longitude
    FROM users u WHERE u.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "contractor") {
    // Contractor profile
    const profile = await db.prepare(`
      SELECT bio, years_experience, categories, profile_photo,
             rating, rating_count, verification_status, insurance_status,
             business_established, contractor_type, qualifications,
             is_suspended, strike_count, id_document_url, insurance_verified
      FROM contractor_profiles WHERE user_id = ?
    `).get(id) as Record<string, unknown> | undefined;

    // Stats - use contractor_profiles for counts, contractor_stats for response times
    const stats = await db.prepare(`
      SELECT cp.acceptance_count as accepted_bids,
             cp.cancellation_count, cp.no_show_count, cp.completion_count,
             cs.total_bids, cs.avg_response_minutes as avg_response_hours
      FROM contractor_profiles cp
      LEFT JOIN contractor_stats cs ON cs.contractor_id = cp.user_id
      WHERE cp.user_id = ?
    `).get(id) as Record<string, unknown> | undefined;

    // Earnings (contractor-side prices, platform keeps 20%)
    const earningsRow = await db.prepare(`
      SELECT COALESCE(SUM(b.price), 0) as total_earned_cents,
             COALESCE(ROUND(SUM(b.price * 0.20)), 0) as platform_revenue_cents,
             COUNT(b.id) as won_jobs
      FROM bids b WHERE b.contractor_id = ? AND b.status = 'accepted'
    `).get(id) as { total_earned_cents: number; platform_revenue_cents: number; won_jobs: number };

    // Average bid
    const avgBid = await db.prepare(`
      SELECT COALESCE(ROUND(AVG(price)), 0) as avg
      FROM bids WHERE contractor_id = ?
    `).get(id) as { avg: number };

    // Win rate
    const totalBids = (await db.prepare("SELECT COUNT(*) as c FROM bids WHERE contractor_id = ?").get(id) as { c: number }).c;
    const wonBids = earningsRow.won_jobs;
    const winRate = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;

    // Recent reviews (last 8)
    const reviews = await db.prepare(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name as reviewer_name, j.title as job_title
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      JOIN jobs j ON j.id = r.job_id
      WHERE r.contractor_id = ?
      ORDER BY r.created_at DESC LIMIT 8
    `).all(id) as Record<string, unknown>[];

    // Active jobs
    const activeJobs = await db.prepare(`
      SELECT j.id, j.title, j.category, j.status, j.location, j.created_at,
             b.price as bid_price
      FROM bids b
      JOIN jobs j ON j.id = b.job_id
      WHERE b.contractor_id = ? AND b.status = 'accepted'
        AND j.status NOT IN ('completed', 'cancelled')
      ORDER BY j.created_at DESC LIMIT 10
    `).all(id) as Record<string, unknown>[];

    // Completed jobs
    const completedJobs = await db.prepare(`
      SELECT j.id, j.title, j.category, j.status, j.created_at, b.price
      FROM bids b JOIN jobs j ON j.id = b.job_id
      WHERE b.contractor_id = ? AND j.status = 'completed'
      ORDER BY j.created_at DESC LIMIT 10
    `).all(id) as Record<string, unknown>[];

    // Strikes
    const strikes = await db.prepare(`
      SELECT id, reason, created_at FROM contractor_strikes
      WHERE contractor_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(id) as Record<string, unknown>[];

    // Suspension record
    const suspension = await db.prepare(`
      SELECT reason, created_at, suspended_until
      FROM contractor_suspensions WHERE contractor_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(id) as Record<string, unknown> | undefined;

    // Risk flags
    const flags: string[] = [];
    if ((profile?.is_suspended as number) === 1) flags.push("SUSPENDED");
    if ((profile?.verification_status as string) === "pending") flags.push("ID_PENDING");
    if ((profile?.insurance_status as string) === "pending") flags.push("INSURANCE_PENDING");
    if ((profile?.verification_status as string) !== "approved") flags.push("UNVERIFIED");
    if ((profile?.insurance_status as string) !== "approved") flags.push("UNINSURED");
    if ((profile?.strike_count as number) >= 2) flags.push("HIGH_STRIKES");
    else if ((profile?.strike_count as number) === 1) flags.push("HAS_STRIKE");
    if (earningsRow.won_jobs > 5 && (profile?.rating as number) < 3.5) flags.push("LOW_RATING");
    if ((stats?.no_show_count as number) > 0) flags.push("HAS_NO_SHOWS");

    return NextResponse.json({
      user, profile, stats,
      earnings: { ...earningsRow, avgBidCents: avgBid.avg, totalBids, wonBids, winRate },
      reviews, activeJobs, completedJobs, strikes, suspension, flags,
    });
  }

  // Client (consumer)
  const jobs = await db.prepare(`
    SELECT j.id, j.title, j.category, j.status, j.urgency, j.created_at, j.location,
           (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count,
           (SELECT price FROM bids WHERE job_id = j.id AND status = 'accepted' LIMIT 1) as accepted_price
    FROM jobs j WHERE j.consumer_id = ?
    ORDER BY j.created_at DESC LIMIT 20
  `).all(id) as Record<string, unknown>[];

  const spendRow = await db.prepare(`
    SELECT COALESCE(ROUND(SUM(b.price * 1.20)), 0) as total_spent_cents,
           COUNT(b.id) as completed_jobs
    FROM bids b JOIN jobs j ON j.id = b.job_id
    WHERE j.consumer_id = ? AND j.status = 'completed' AND b.status = 'accepted'
  `).get(id) as { total_spent_cents: number; completed_jobs: number };

  const activeCount = jobs.filter((j) => ["posted","bidding","accepted","in_progress"].includes(j.status as string)).length;
  const cancelledCount = jobs.filter((j) => j.status === "cancelled").length;

  const topCats = await db.prepare(`
    SELECT category, COUNT(*) as c FROM jobs WHERE consumer_id = ?
    GROUP BY category ORDER BY c DESC LIMIT 5
  `).all(id) as Array<{ category: string; c: number }>;

  const disputes = await db.prepare(`
    SELECT d.id, d.reason, d.status, d.created_at, j.title as job_title
    FROM disputes d JOIN jobs j ON j.id = d.job_id
    WHERE d.reporter_id = ?
    ORDER BY d.created_at DESC LIMIT 5
  `).all(id) as Record<string, unknown>[];

  const flags: string[] = [];
  if (!(user.phone_verified as number)) flags.push("PHONE_UNVERIFIED");
  if (cancelledCount > 3) flags.push("HIGH_CANCELLATIONS");
  if (disputes.length > 1) flags.push("MULTIPLE_DISPUTES");

  return NextResponse.json({
    user, jobs, disputes, topCats, flags,
    spend: { ...spendRow, totalJobs: jobs.length, activeJobs: activeCount, cancelledJobs: cancelledCount },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json() as {
    action: "suspend" | "unsuspend" | "approve_id" | "reject_id" | "approve_insurance"
      | "reject_insurance" | "add_strike" | "clear_strikes" | "send_notification";
    reason?: string;
    message?: string;
    title?: string;
  };

  const db = getDb();
  await initializeDatabase();
  const uid = crypto.randomUUID();
  const now = new Date().toISOString();

  switch (body.action) {
    case "suspend":
      await db.prepare("UPDATE contractor_profiles SET is_suspended = 1 WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO contractor_suspensions (id, contractor_id, reason, created_at) VALUES (?, ?, ?, ?)`).run(uid, id, body.reason ?? "Admin action", now);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'Account Suspended', ?, ?)`).run(uid + "n", id, body.reason ?? "Your account has been suspended. Contact support.", now);
      break;
    case "unsuspend":
      await db.prepare("UPDATE contractor_profiles SET is_suspended = 0 WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'Account Reinstated', 'Your account has been reinstated.', ?)`).run(uid, id, now);
      break;
    case "approve_id":
      await db.prepare("UPDATE contractor_profiles SET verification_status = 'approved' WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'ID Verified ✓', 'Your identity has been verified by the Trovaar team.', ?)`).run(uid, id, now);
      break;
    case "reject_id":
      await db.prepare("UPDATE contractor_profiles SET verification_status = 'rejected' WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'ID Verification Failed', ?, ?)`).run(uid, id, body.reason ?? "Your ID could not be verified. Please resubmit.", now);
      break;
    case "approve_insurance":
      await db.prepare("UPDATE contractor_profiles SET insurance_status = 'approved' WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'Insurance Verified ✓', 'Your insurance has been verified.', ?)`).run(uid, id, now);
      break;
    case "reject_insurance":
      await db.prepare("UPDATE contractor_profiles SET insurance_status = 'rejected' WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'Insurance Rejected', ?, ?)`).run(uid, id, body.reason ?? "Your insurance document was rejected. Please resubmit.", now);
      break;
    case "add_strike":
      await db.prepare(`INSERT INTO contractor_strikes (id, contractor_id, reason, created_at) VALUES (?, ?, ?, ?)`).run(uid, id, body.reason ?? "Admin strike", now);
      await db.prepare("UPDATE contractor_profiles SET strike_count = COALESCE(strike_count, 0) + 1 WHERE user_id = ?").run(id);
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', 'Warning Issued', ?, ?)`).run(uid + "n", id, body.reason ?? "A warning has been added to your account.", now);
      break;
    case "clear_strikes":
      await db.prepare("DELETE FROM contractor_strikes WHERE contractor_id = ?").run(id);
      await db.prepare("UPDATE contractor_profiles SET strike_count = 0 WHERE user_id = ?").run(id);
      break;
    case "send_notification":
      if (!body.title || !body.message) return NextResponse.json({ error: "title and message required" }, { status: 400 });
      await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?, ?, 'admin', ?, ?, ?)`).run(uid, id, body.title, body.message, now);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
