import nodemailer from "nodemailer";
import { emailLogger as logger } from "@/lib/logger";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
<div style="background:#1e293b;padding:32px 40px;">
  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Trovaar</h1>
  <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">${title}</p>
</div>
<div style="padding:32px 40px;">${body}</div>
<div style="background:#f8fafc;padding:16px 40px;text-align:center;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">© Trovaar Platform · <a href="${BASE_URL}" style="color:#94a3b8;">Visit site</a></p>
</div>
</div></body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">${text}</a>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Primary: Brevo API
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_FROM_NAME || "Trovaar",
          email: process.env.BREVO_FROM_EMAIL || "vishek23@gmail.com",
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }
    return;
  }

  // Fallback: Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("No email transport configured (BREVO_API_KEY or RESEND_API_KEY) — skipping email send");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Trovaar <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export async function sendNewBidEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  contractorName: string;
  bidPrice: number;
  jobId: string;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, contractorName, bidPrice, jobId } = params;
    const jobUrl = `${BASE_URL}/jobs/${jobId}`;
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${toName},</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 16px;"><strong>${contractorName}</strong> placed a bid of <strong>$${bidPrice}</strong> on your job <strong>${jobTitle}</strong>.</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 24px;">View and compare all bids to hire your contractor.</p>` +
      ctaButton("Review Bids", jobUrl);
    await sendEmail(toEmail, `💼 New bid on "${jobTitle}"`, emailWrapper("New bid received", body));
  } catch (err) {
    logger.error({ err }, "sendNewBidEmail failed");
  }
}

export async function sendBidAcceptedEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  clientName: string;
  price: number;
  availabilityDate: string;
  jobId: string;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, clientName, price, availabilityDate, jobId } = params;
    const jobUrl = `${BASE_URL}/jobs/${jobId}`;
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${toName},</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 16px;"><strong>${clientName}</strong> accepted your bid of <strong>$${price}</strong>. Scheduled for <strong>${availabilityDate}</strong>.</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 24px;">Head to the job page to coordinate details.</p>` +
      ctaButton("View Job", jobUrl);
    await sendEmail(toEmail, `🎉 Your bid was accepted — "${jobTitle}"`, emailWrapper("Bid accepted", body));
  } catch (err) {
    logger.error({ err }, "sendBidAcceptedEmail failed");
  }
}

export async function sendJobCompletedEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  role: "client" | "contractor";
  jobId: string;
  totalAmount: number;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, role, jobId, totalAmount } = params;
    const jobUrl = `${BASE_URL}/jobs/${jobId}`;
    const bodyText =
      role === "client"
        ? `<p style="font-size:15px;color:#475569;margin:0 0 24px;">Your job has been marked complete. Please take a moment to leave a review for your contractor.</p>`
        : `<p style="font-size:15px;color:#475569;margin:0 0 24px;">Great work! The job is complete and your earnings of <strong>$${totalAmount}</strong> are being processed.</p>`;
    const ctaText = role === "client" ? "Leave a Review" : "View Earnings";
    const ctaUrl = role === "client" ? `${jobUrl}#review` : `${BASE_URL}/dashboard/earnings`;
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${toName},</p>` +
      bodyText +
      ctaButton(ctaText, ctaUrl);
    await sendEmail(toEmail, `✅ Job completed — "${jobTitle}"`, emailWrapper("Job complete", body));
  } catch (err) {
    logger.error({ err }, "sendJobCompletedEmail failed");
  }
}

export async function sendDisputeOpenedEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  jobId: string;
  filedBy: string;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, filedBy } = params;
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${toName},</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 16px;">A dispute was opened for <strong>${jobTitle}</strong> by <strong>${filedBy}</strong>.</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 24px;">Our team will review the situation and reach out within 24 hours. Please do not attempt to contact the other party directly.</p>`;
    await sendEmail(toEmail, `⚠️ Dispute opened — "${jobTitle}"`, emailWrapper("Dispute opened", body));
  } catch (err) {
    logger.error({ err }, "sendDisputeOpenedEmail failed");
  }
}

export async function sendDisputeResolvedEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  resolution: string;
  refundAmount?: number;
  jobId: string;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, resolution, refundAmount } = params;
    const refundLine =
      refundAmount && refundAmount > 0
        ? `<p style="font-size:15px;color:#475569;margin:0 0 16px;">A refund of <strong>$${refundAmount}</strong> has been processed.</p>`
        : "";
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${toName},</p>` +
      `<p style="font-size:15px;color:#475569;margin:0 0 16px;">The dispute has been resolved. ${resolution}</p>` +
      refundLine;
    await sendEmail(toEmail, `✅ Dispute resolved — "${jobTitle}"`, emailWrapper("Dispute resolved", body));
  } catch (err) {
    logger.error({ err }, "sendDisputeResolvedEmail failed");
  }
}

export async function sendInvoiceEmail(params: {
  toEmail: string;
  toName: string;
  jobTitle: string;
  jobId: string;
  role: "client" | "contractor";
  lineItems: Array<{ label: string; amount: number }>;
  total: number;
}): Promise<void> {
  try {
    const { toEmail, toName, jobTitle, role, lineItems, total } = params;
    const rows = lineItems
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px 0;color:#475569;font-size:14px;border-bottom:1px solid #f1f5f9;">${item.label}</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;text-align:right;border-bottom:1px solid #f1f5f9;">$${item.amount.toFixed(2)}</td>
          </tr>`
      )
      .join("");
    const feeNote =
      role === "contractor"
        ? `<p style="font-size:13px;color:#94a3b8;margin:16px 0 0;">Platform fee (20%) has been deducted from your earnings.</p>`
        : "";
    const body =
      `<p style="font-size:16px;color:#1e293b;margin:0 0 16px;">Hi ${toName}, here is your invoice for <strong>${jobTitle}</strong>.</p>` +
      `<table style="width:100%;border-collapse:collapse;">` +
      rows +
      `<tr>
        <td style="padding:12px 0;color:#1e293b;font-size:15px;font-weight:700;">Total</td>
        <td style="padding:12px 0;color:#10b981;font-size:15px;font-weight:700;text-align:right;">$${total.toFixed(2)}</td>
      </tr>` +
      `</table>` +
      feeNote;
    await sendEmail(toEmail, `🧾 Invoice — "${jobTitle}"`, emailWrapper("Invoice", body));
  } catch (err) {
    logger.error({ err }, "sendInvoiceEmail failed");
  }
}

function buildVerificationHtml(name: string, code: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>Verify your email</title></head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr><td style="background:#2563eb;padding:32px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⚡ Trovaar</p>
          </td></tr>
          <tr><td style="padding:40px 40px 24px;">
            <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Verify your email</p>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;">Hi ${name}, enter the code below to confirm your email address.</p>
            <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Verification Code</p>
              <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.15em;color:#111827;font-family:'Courier New',monospace;">${code}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">This code expires in <strong>15 minutes</strong>. If you didn&apos;t create an account, you can ignore this email.</p>
          </td></tr>
          <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Trovaar &mdash; Get competitive bids from skilled pros</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
): Promise<void> {
  const subject = `${code} — Your Trovaar verification code`;
  const html = buildVerificationHtml(name, code);

  // Primary: Brevo API (300 emails/day free, great deliverability to all providers)
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_FROM_NAME || "Trovaar",
          email: process.env.BREVO_FROM_EMAIL || "vishek23@gmail.com",
        },
        to: [{ email: to, name }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }
    return;
  }

  // Fallback: Gmail SMTP
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({
      from: `"Trovaar" <${gmailUser}>`,
      to,
      subject,
      html,
    });
    return;
  }

  // Last resort: Resend API (only works if a verified domain is configured)
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("No email transport configured (set BREVO_API_KEY)");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Trovaar <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export async function sendEmergencyAlert(
  to: string,
  name: string,
  jobTitle: string,
  location: string,
  jobId: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
  const jobUrl = `${baseUrl}/jobs/${jobId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><title>Emergency Job Alert</title></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background:#f59e0b;padding:32px;text-align:center;">
                    <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⚡ Emergency Job Alert</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 40px 24px;">
                    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${name},</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">An emergency job just posted near you. Be the first to bid and earn a <strong>+25% emergency bonus</strong>!</p>
                    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#92400e;">${jobTitle}</p>
                      <p style="margin:0;font-size:14px;color:#b45309;">📍 ${location}</p>
                    </div>
                    <a href="${jobUrl}" style="display:block;background:#f59e0b;color:#ffffff;text-align:center;padding:14px 24px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;">View &amp; Bid Now →</a>
                    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Emergency jobs include a $100 client fee and a +25% bonus for winning contractors.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Trovaar &mdash; Get competitive bids from skilled pros</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const subject = `⚡ Emergency Job Near You: ${jobTitle}`;
  try {
    await sendEmail(to, subject, html);
  } catch (err) {
    logger.error({ err }, "sendEmergencyAlert failed");
  }
}
