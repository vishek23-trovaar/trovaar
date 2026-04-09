import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { generateReferralCode } from "@/lib/referral";
import { generateAccountNumber } from "@/lib/accountNumber";
import { UserRole } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { authLogger as logger } from "@/lib/logger";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, { maxRequests: 5, windowMs: 60 * 60 * 1000, keyPrefix: "auth-signup" });
  if (rl) return rl;

  try {
    const { email, password, name, role, phone, location, referralCode } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Email, password, name, and role are required" }, { status: 400 });
    }
    if (!["consumer", "contractor"].includes(role)) {
      return NextResponse.json({ error: "Role must be consumer or contractor" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    const rawPhone = normalizePhone(phone);
    if (!rawPhone) {
      return NextResponse.json({ error: "Please enter a valid phone number (at least 7 digits)" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const id = uuidv4();
    const password_hash = await hashPassword(password);
    const myReferralCode = generateReferralCode(id, name);

    // Generate phone-based account number from the normalized phone
    let accountNumber: string | null = null;
    try { accountNumber = generateAccountNumber(id, rawPhone); } catch { /* digits already validated */ }

    // Check phone uniqueness before insert
    const phoneConflict = await db.prepare("SELECT id FROM users WHERE phone = ?").get(rawPhone);
    if (phoneConflict) {
      return NextResponse.json({ error: "That phone number is already registered." }, { status: 409 });
    }

    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, referral_code, account_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, email, password_hash, name, role, rawPhone, location || null, 0, myReferralCode, accountNumber);

    if (role === "contractor") {
      db.prepare("INSERT INTO contractor_profiles (user_id, categories) VALUES (?, ?)").run(id, "[]");
    }

    // Process referral code if provided
    if (referralCode && referralCode.trim()) {
      try {
        const referrer = await db.prepare(
          "SELECT id, role FROM users WHERE referral_code = ? AND id != ?"
        ).get(referralCode.trim().toUpperCase(), id) as { id: string; role: string } | undefined;

        if (referrer) {
          // Record who referred this new user
          await db.prepare("UPDATE users SET referred_by = ? WHERE id = ?").run(referrer.id, id);

          // Credit $10 to the new user (signup bonus)
          await db.prepare(
            "UPDATE users SET credit_balance_cents = credit_balance_cents + 1000 WHERE id = ?"
          ).run(id);

          // Create signup_bonus reward record (already credited to referred user)
          db.prepare(
            "INSERT INTO referral_rewards (id, referrer_id, referred_id, reward_type, reward_cents, status) VALUES (?, ?, ?, 'signup_bonus', 1000, 'credited')"
          ).run(uuidv4(), referrer.id, id);

          // Create pending first_job_bonus for the referrer ($25 — activates when referred user's first job completes)
          db.prepare(
            "INSERT INTO referral_rewards (id, referrer_id, referred_id, reward_type, reward_cents, status) VALUES (?, ?, ?, 'first_job_bonus', 2500, 'pending')"
          ).run(uuidv4(), referrer.id, id);
        }
      } catch (err) {
        logger.error({ err }, "Referral processing error (non-fatal)");
      }
    }

    // Generate and store verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = uuidv4();
    await db.prepare(
      "INSERT INTO verification_codes (id, user_id, code, expires_at) VALUES (?, ?, ?, datetime('now', '+15 minutes'))"
    ).run(codeId, id, code);

    // Send verification email (non-blocking — don't fail signup if email fails)
    sendVerificationEmail(email, name, code).catch((err) => {
      logger.error({ err }, "Failed to send verification email");
      if (process.env.NODE_ENV !== "production") {
        logger.debug({ code, email }, "DEV MODE — Verification code");
      }
    });

    const token = signToken({
      userId: id,
      email,
      role: role as UserRole,
      emailVerified: false,
      isAdmin: false,
      tokenVersion: 0,
    });

    try { trackEvent("user_signup", { userId: id, properties: { role, email } }); } catch {}

    const response = NextResponse.json({ user: { id, email, name, role }, token }, { status: 201 });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, "Signup error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
