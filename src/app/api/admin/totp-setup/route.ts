/**
 * GET /api/admin/totp-setup
 *
 * Returns a new TOTP secret + otpauth:// URI so the admin can scan it with
 * Google Authenticator / Authy.  Once scanned, set ADMIN_TOTP_SECRET=<secret>
 * in your environment variables and restart the server.
 *
 * This endpoint is intentionally open (no admin cookie required) because it is
 * only useful during *initial* setup — before MFA is active — and the secret it
 * generates has no effect until it is manually added to the environment.
 *
 * In production, remove or disable this endpoint after setup is complete.
 */
import { NextResponse } from "next/server";
import { generateSecret } from "otplib";

export async function GET() {
  if (process.env.ADMIN_TOTP_SECRET) {
    // MFA is already configured — don't expose a new secret.
    return NextResponse.json(
      { error: "MFA is already configured. Remove ADMIN_TOTP_SECRET from env to reconfigure." },
      { status: 409 }
    );
  }

  const secret = generateSecret({ length: 20 }); // 160-bit secret (RFC 4226 §4)
  const issuer = encodeURIComponent("Trovaar Admin");
  const account = encodeURIComponent("admin");
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return NextResponse.json({
    secret,
    otpauthUrl,
    instructions: [
      "1. Open Google Authenticator, Authy, or any TOTP app.",
      "2. Scan the QR code or manually enter the secret above.",
      "3. Add ADMIN_TOTP_SECRET=" + secret + " to your .env.local (or production secrets).",
      "4. Restart the server.",
      "5. Delete or disable this /api/admin/totp-setup endpoint in production.",
    ],
  });
}
