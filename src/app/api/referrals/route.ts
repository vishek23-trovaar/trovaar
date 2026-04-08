import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/referrals — Return user's referral code, total referrals, total earned, pending rewards
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
  await initializeDatabase();

    const user = await db.prepare(
      "SELECT referral_code, credit_balance_cents FROM users WHERE id = ?"
    ).get(payload.userId) as { referral_code: string; credit_balance_cents: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count total referrals (users who have referred_by = this user's id)
    const totalReferred = await db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE referred_by = ?"
    ).get(payload.userId) as { count: number };

    // Get all referral rewards for this user as referrer
    const rewards = await db.prepare(
      "SELECT * FROM referral_rewards WHERE referrer_id = ? ORDER BY created_at DESC"
    ).all(payload.userId) as Array<{
      id: string;
      referrer_id: string;
      referred_id: string;
      reward_type: string;
      reward_cents: number;
      status: string;
      created_at: string;
    }>;

    const totalEarnedCents = rewards
      .filter((r) => r.status === "credited")
      .reduce((sum, r) => sum + r.reward_cents, 0);

    const pendingRewards = rewards.filter((r) => r.status === "pending");

    // Get referral details with names
    const referrals = await db.prepare(`
      SELECT u.id, u.name, u.created_at,
        (SELECT COUNT(*) FROM jobs WHERE consumer_id = u.id AND status = 'completed') +
        (SELECT COUNT(*) FROM bids b JOIN jobs j ON b.job_id = j.id WHERE b.contractor_id = u.id AND j.status = 'completed') as completed_jobs
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).all(payload.userId) as Array<{
      id: string;
      name: string;
      created_at: string;
      completed_jobs: number;
    }>;

    // Build referral list with statuses
    const referralList = referrals.map((ref) => {
      const reward = rewards.find((r) => r.referred_id === ref.id && r.reward_type === "first_job_bonus");
      return {
        id: ref.id,
        name: ref.name,
        joinedAt: ref.created_at,
        completedFirstJob: ref.completed_jobs > 0,
        rewardStatus: reward?.status || (ref.completed_jobs > 0 ? "credited" : "pending"),
      };
    });

    return NextResponse.json({
      referralCode: user.referral_code,
      creditBalanceCents: user.credit_balance_cents,
      totalReferred: totalReferred.count,
      totalEarnedCents,
      pendingRewardsCents: pendingRewards.reduce((sum, r) => sum + r.reward_cents, 0),
      referrals: referralList,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/referrals — Apply a referral code (typically called during or after signup)
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { referralCode } = await request.json();

    if (!referralCode?.trim()) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Check if user already has a referrer
    const currentUser = await db.prepare(
      "SELECT referred_by FROM users WHERE id = ?"
    ).get(payload.userId) as { referred_by: string | null } | undefined;

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (currentUser.referred_by) {
      return NextResponse.json({ error: "You have already used a referral code" }, { status: 409 });
    }

    // Find the referrer
    const referrer = await db.prepare(
      "SELECT id, name FROM users WHERE referral_code = ? AND id != ?"
    ).get(referralCode.trim().toUpperCase(), payload.userId) as { id: string; name: string } | undefined;

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Link the referral
    await db.prepare("UPDATE users SET referred_by = ? WHERE id = ?").run(referrer.id, payload.userId);

    // Credit $10 to the new user (signup bonus)
    await db.prepare(
      "UPDATE users SET credit_balance_cents = credit_balance_cents + 1000 WHERE id = ?"
    ).run(payload.userId);

    // Create signup_bonus reward record (already credited)
    await db.prepare(
      "INSERT INTO referral_rewards (id, referrer_id, referred_id, reward_type, reward_cents, status) VALUES (?, ?, ?, 'signup_bonus', 1000, 'credited')"
    ).run(uuidv4(), referrer.id, payload.userId);

    // Create pending first_job_bonus for the referrer ($25)
    await db.prepare(
      "INSERT INTO referral_rewards (id, referrer_id, referred_id, reward_type, reward_cents, status) VALUES (?, ?, ?, 'first_job_bonus', 2500, 'pending')"
    ).run(uuidv4(), referrer.id, payload.userId);

    return NextResponse.json({
      message: "Referral code applied! You received a $10 credit.",
      creditCents: 1000,
      referrerName: referrer.name,
    }, { status: 201 });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
