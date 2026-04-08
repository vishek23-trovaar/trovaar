import { getDb, initializeDatabase } from "@/lib/db";
import { randomUUID } from "crypto";

export type StrikeType = "no_show" | "cancellation" | "no_response" | "misconduct";

export interface StrikeResult {
  strikesInWindow: number;
  suspended: boolean;
  suspendedUntil: string | null; // ISO string or null = permanent
}

export async function issueStrike(
  contractorId: string,
  strikeType: StrikeType,
  jobId?: string,
  notes?: string
): Promise<StrikeResult> {
  const db = getDb();
  await initializeDatabase();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

  // Insert strike
  await db.prepare(`
    INSERT INTO contractor_strikes (id, contractor_id, job_id, strike_type, notes, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), contractorId, jobId ?? null, strikeType, notes ?? null, now, expiresAt);

  // Update strike_count on profile
  await db.prepare(`
    UPDATE contractor_profiles SET strike_count = strike_count + 1 WHERE user_id = ?
  `).run(contractorId);

  // Count active (non-expired) strikes in the last 60 days
  const { count: strikesInWindow } = await db.prepare(`
    SELECT COUNT(*) as count FROM contractor_strikes
    WHERE contractor_id = ?
      AND expires_at > ?
  `).get(contractorId, now) as { count: number };

  let suspended = false;
  let suspendedUntil: string | null = null;

  // Strike threshold enforcement
  if (strikesInWindow >= 3) {
    // 3+ strikes = permanent ban (manual review)
    suspendedUntil = null;
    suspended = true;
  } else if (strikesInWindow === 2) {
    // 2 strikes = 14-day suspension
    suspendedUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    suspended = true;
  }

  if (suspended) {
    await db.prepare(`
      INSERT INTO contractor_suspensions (id, contractor_id, reason, suspended_until, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), contractorId, `Auto-suspended: ${strikesInWindow} strikes in 60 days`, suspendedUntil, now);

    await db.prepare(`
      UPDATE contractor_profiles SET is_suspended = 1, suspended_until = ? WHERE user_id = ?
    `).run(suspendedUntil, contractorId);
  }

  return { strikesInWindow, suspended, suspendedUntil };
}

export async function checkSuspension(contractorId: string): Promise<{ suspended: boolean; until: string | null }> {
  const db = getDb();
  await initializeDatabase();
  const now = new Date().toISOString();

  const profile = await db.prepare(`
    SELECT is_suspended, suspended_until FROM contractor_profiles WHERE user_id = ?
  `).get(contractorId) as { is_suspended: number; suspended_until: string | null } | undefined;

  if (!profile?.is_suspended) return { suspended: false, until: null };

  // Check if suspension has expired
  if (profile.suspended_until && profile.suspended_until < now) {
    // Lift suspension
    await db.prepare(`
      UPDATE contractor_profiles SET is_suspended = 0, suspended_until = NULL WHERE user_id = ?
    `).run(contractorId);
    return { suspended: false, until: null };
  }

  return { suspended: true, until: profile.suspended_until };
}

export async function getContractorStats(contractorId: string) {
  const db = getDb();
  await initializeDatabase();

  const profile = await db.prepare(`
    SELECT cancellation_count, no_show_count, acceptance_count, completion_count, strike_count, is_suspended, suspended_until
    FROM contractor_profiles WHERE user_id = ?
  `).get(contractorId) as {
    cancellation_count: number;
    no_show_count: number;
    acceptance_count: number;
    completion_count: number;
    strike_count: number;
    is_suspended: number;
    suspended_until: string | null;
  } | undefined;

  if (!profile) return null;

  const completionRate = profile.acceptance_count > 0
    ? Math.round((profile.completion_count / profile.acceptance_count) * 100)
    : null;

  const now = new Date().toISOString();
  const activeStrikes = await db.prepare(`
    SELECT COUNT(*) as count FROM contractor_strikes
    WHERE contractor_id = ? AND expires_at > ?
  `).get(contractorId, now) as { count: number };

  return {
    ...profile,
    completionRate,
    activeStrikes: activeStrikes.count,
  };
}
