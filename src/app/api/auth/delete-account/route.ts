import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { authLogger as logger } from "@/lib/logger";

export async function DELETE(request: NextRequest) {
  try {
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    await initializeDatabase();

    const userId = payload.userId;

    // Prevent deletion if there are active/in-progress jobs
    const activeJobs = db.prepare(
      `SELECT COUNT(*) as count FROM jobs
       WHERE (consumer_id = ? OR contractor_id = ?)
       AND status IN ('open', 'in_progress', 'accepted')`
    ).get(userId, userId) as unknown as { count: number } | undefined;

    if ((activeJobs?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with active or in-progress jobs. Please complete or cancel them first." },
        { status: 400 }
      );
    }

    // Delete in dependency order
    db.prepare("DELETE FROM verification_codes WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM bids WHERE contractor_id = ?").run(userId);
    db.prepare("DELETE FROM reviews WHERE reviewer_id = ? OR reviewee_id = ?").run(userId, userId);
    db.prepare("DELETE FROM referral_rewards WHERE referrer_id = ? OR referred_id = ?").run(userId, userId);
    db.prepare("DELETE FROM contractor_profiles WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM jobs WHERE consumer_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    logger.info({ userId }, "Account deleted");

    const response = NextResponse.json({ success: true });
    response.cookies.delete("token");
    return response;
  } catch (error) {
    logger.error({ err: error }, "Delete account error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
