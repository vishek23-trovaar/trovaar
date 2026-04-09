import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit-api";
import { authLogger as logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, { maxRequests: 3, windowMs: 60 * 60 * 1000, keyPrefix: "auth-forgot" });
  if (rl) return rl;

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();

    // Ensure password_reset_tokens table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);
    `);

    const user = await db.prepare("SELECT id, email, name FROM users WHERE email = ?").get(email.toLowerCase().trim()) as
      | { id: string; email: string; name: string }
      | undefined;

    // Always return 200 to avoid leaking whether email exists
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const tokenId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Invalidate any existing tokens for this user
      await db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0").run(user.id);

      // Store the new token
      db.prepare(
        "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
      ).run(tokenId, user.id, token, expiresAt);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trovaar.com";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // Send email via Resend REST API
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Trovaar <noreply@trovaar.com>",
          to: [user.email],
          subject: "Reset your Trovaar password",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#0f172a;margin-bottom:8px">Reset your password</h2>
              <p style="color:#64748b;margin-bottom:24px">
                Hi ${user.name}, we received a request to reset your Trovaar password.
                Click the button below to create a new password. This link expires in 1 hour.
              </p>
              <a href="${resetUrl}"
                style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
                Reset Password
              </a>
              <p style="color:#94a3b8;font-size:13px;margin-top:24px">
                If you didn&apos;t request this, you can safely ignore this email.
                Your password won&apos;t change until you click the link above.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
              <p style="color:#94a3b8;font-size:12px">Trovaar &mdash; Competitive Bids from Skilled Pros</p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Forgot password error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
