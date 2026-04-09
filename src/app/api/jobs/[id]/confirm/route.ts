import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";
import { sendJobCompletedEmail, sendInvoiceEmail } from "@/lib/email";
import { notifyJobCompleted, notifyPaymentReleased } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { jobsLogger as logger } from "@/lib/logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const job = await db.prepare(`
    SELECT j.*, b.contractor_id as accepted_contractor_id
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as {
    id: string;
    consumer_id: string;
    status: string;
    payment_status: string;
    payment_intent_id: string | null;
    contractor_confirmed: number;
    consumer_confirmed: number;
    accepted_contractor_id: string | null;
    before_photo_url: string | null;
    after_photo_url: string | null;
  } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!["accepted", "en_route", "arrived", "in_progress"].includes(job.status)) {
    return NextResponse.json({ error: "Job is not in a confirmable state" }, { status: 400 });
  }

  const isConsumer = payload.userId === job.consumer_id;
  const isContractor = payload.userId === job.accepted_contractor_id;

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "Not authorized for this job" }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (isContractor && !job.contractor_confirmed) {
    // Contractor marks work complete — must have before/after photos
    const hasAfterPhoto = job.after_photo_url || (await db.prepare(
      "SELECT id FROM job_receipts WHERE job_id = ? AND receipt_type = 'after_photo' LIMIT 1"
    ).get(id));
    const hasBeforePhoto = job.before_photo_url || (await db.prepare(
      "SELECT id FROM job_receipts WHERE job_id = ? AND receipt_type = 'before_photo' LIMIT 1"
    ).get(id));

    if (!hasAfterPhoto) {
      return NextResponse.json(
        { error: "Before & after photos are required to mark job as complete. Please upload completion photos first." },
        { status: 400 }
      );
    }

    db.prepare(`UPDATE jobs SET contractor_confirmed = 1, status = 'in_progress', updated_at = ? WHERE id = ?`)
      .run(now, id);

    // Notify consumer — they must leave a review to release payment
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
      VALUES (?, ?, 'completion_request', 'Work complete — review to release payment', 'Your contractor has completed the job and uploaded photos. Leave a review and select a tip to release payment. You have 5 business days before auto-release.', ?, ?)
    `).run(randomUUID(), job.consumer_id, id, now);

    return NextResponse.json({ message: "Marked as complete — waiting for consumer review and confirmation" });
  }

  if (isConsumer && !job.consumer_confirmed) {
    // Consumer confirms — must have left a review first (mandatory)
    const hasReview = await db.prepare(
      "SELECT id FROM reviews WHERE job_id = ? AND reviewer_id = ? LIMIT 1"
    ).get(id, payload.userId);

    if (!hasReview) {
      return NextResponse.json(
        { error: "A review is required before releasing payment. Please leave a rating and review for this job first." },
        { status: 400 }
      );
    }

    // Wrap all completion DB operations in a transaction for atomicity
    await db.transaction(async (db) => {
      // Consumer confirms — complete the job and release payment
      await db.prepare(`
        UPDATE jobs SET consumer_confirmed = 1, status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?
      `).run(now, now, id);

      // Auto-create draft invoice from accepted bid data
      if (job.accepted_contractor_id) {
        const bidData = await db.prepare(
          "SELECT price, labor_cents, materials_json FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
        ).get(id) as { price: number; labor_cents: number | null; materials_json: string | null } | null;

        if (bidData) {
          const invYear = new Date().getFullYear();
          const lastInv = await db.prepare(
            "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1"
          ).get(`INV-${invYear}-%`) as { invoice_number: string } | undefined;

          let nextNum = 1;
          if (lastInv) {
            const parts = lastInv.invoice_number.split("-");
            nextNum = parseInt(parts[2], 10) + 1;
          }
          const invoiceNumber = `INV-${invYear}-${String(nextNum).padStart(4, "0")}`;

          const laborAmount = bidData.labor_cents ?? bidData.price;
          const materialsStr = bidData.materials_json ?? "[]";
          let materialsTotal = 0;
          try {
            const items = JSON.parse(materialsStr);
            materialsTotal = items.reduce((sum: number, item: { cost_cents?: number; total_cents?: number }) => {
              return sum + (item.cost_cents || item.total_cents || 0);
            }, 0);
          } catch { /* ignore */ }

          const subtotal = laborAmount + materialsTotal;
          const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT / 100);
          const total = subtotal + platformFee;
          const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          db.prepare(`
            INSERT INTO invoices (invoice_number, job_id, contractor_id, consumer_id, labor_cents, materials_json, subtotal_cents, platform_fee_cents, tax_cents, total_cents, status, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft', ?)
          `).run(invoiceNumber, id, job.accepted_contractor_id, job.consumer_id, laborAmount, materialsStr, subtotal, platformFee, total, dueDate);
        }
      }

      // Increment completion_count on contractor profile (Accountability System)
      if (job.accepted_contractor_id) {
        db.prepare("UPDATE contractor_profiles SET completion_count = completion_count + 1 WHERE user_id = ?")
          .run(job.accepted_contractor_id);
      }

      // Release completion bond
      await db.prepare(`UPDATE completion_bonds SET status = 'released', resolved_at = ? WHERE job_id = ?`).run(now, id);

      // Record neighborhood activity for social proof feed
      const jobFull = await db.prepare(`SELECT category, location FROM jobs WHERE id = ?`).get(id) as {
        category: string; location: string | null;
      } | undefined;
      if (jobFull) {
        const loc = jobFull.location || "";
        const zipMatch = loc.match(/\b(\d{5})\b/);
        const cityStateMatch = loc.match(/^([^,]+),\s*([A-Z]{2})/);
        const zip = zipMatch ? zipMatch[1] : null;
        const city = cityStateMatch ? cityStateMatch[1].trim() : null;
        const state = cityStateMatch ? cityStateMatch[2] : null;
        if (city || zip) {
          db.prepare(`
            INSERT INTO neighborhood_activity (id, job_id, contractor_id, category, city, state, zip_code, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(randomUUID(), id, job.accepted_contractor_id, jobFull.category, city, state, zip, now);
        }
      }

      // Auto-track earnings for 1099 tax records
      if (job.accepted_contractor_id) {
        const acceptedBidForTax = await db.prepare(
          "SELECT price FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
        ).get(id) as { price: number } | null;
        if (acceptedBidForTax) {
          const taxYear = new Date().getFullYear();
          const existingTax = await db.prepare(
            "SELECT id FROM tax_records WHERE contractor_id = ? AND tax_year = ?"
          ).get(job.accepted_contractor_id, taxYear);
          if (existingTax) {
            await db.prepare(`
              UPDATE tax_records
              SET total_earned_cents = total_earned_cents + ?, total_jobs = total_jobs + 1
              WHERE contractor_id = ? AND tax_year = ?
            `).run(acceptedBidForTax.price, job.accepted_contractor_id, taxYear);
          } else {
            db.prepare(`
              INSERT INTO tax_records (contractor_id, tax_year, total_earned_cents, total_jobs)
              VALUES (?, ?, ?, 1)
            `).run(job.accepted_contractor_id, taxYear, acceptedBidForTax.price);
          }
        }
      }
    });

    // Capture the held payment (escrow release) — async, outside transaction
    if (job.payment_intent_id) {
      try {
        await stripe.paymentIntents.capture(job.payment_intent_id);
      } catch (captureErr) {
        logger.error({ err: captureErr }, "Failed to capture payment intent");
        // Don't block job completion — webhook or manual retry can handle it
      }
    }

    try { trackEvent("job_completed", { userId: payload.userId, jobId: id, properties: { contractorId: job.accepted_contractor_id } }); } catch {}

    // Notify both parties about completion
    {
      const jobTitle = (await db.prepare("SELECT title FROM jobs WHERE id = ?").get(id) as { title: string } | undefined)?.title ?? "";
      // Notify consumer
      notifyJobCompleted(job.consumer_id, jobTitle, id);
      // Notify contractor
      if (job.accepted_contractor_id) {
        notifyJobCompleted(job.accepted_contractor_id, jobTitle, id);
        // Also notify about payment release
        const acceptedBid = await db.prepare(
          "SELECT price FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
        ).get(id) as { price: number } | null;
        if (acceptedBid) {
          notifyPaymentReleased(
            job.accepted_contractor_id,
            Math.round(acceptedBid.price / 100),
            jobTitle,
            id
          );
        }
      }
    }

    // Send completion emails to both parties
    try {
      const jobFull = await db.prepare("SELECT title FROM jobs WHERE id = ?").get(id) as { title: string } | undefined;
      const jobTitle = (jobFull?.title ?? "") as string;
      const consumer = await db.prepare("SELECT email, name FROM users WHERE id = ?").get(job.consumer_id) as { email: string; name: string } | null;
      // Find accepted bid contractor
      const contractorData = await db.prepare(`
        SELECT u.email, u.name, b.price FROM bids b
        JOIN users u ON u.id = b.contractor_id
        WHERE b.job_id = ? AND b.status = 'accepted' LIMIT 1
      `).get(id) as { email: string; name: string; price: number } | null;

      if (consumer) {
        const clientTotal = contractorData ? Math.round(contractorData.price * 1.2) : 0;
        await sendJobCompletedEmail({ toEmail: consumer.email, toName: consumer.name, jobTitle, role: "client", jobId: id, totalAmount: clientTotal / 100 });
        await sendInvoiceEmail({
          toEmail: consumer.email, toName: consumer.name, jobTitle,
          jobId: id, role: "client",
          lineItems: [
            { label: "Service fee", amount: contractorData ? Math.round(contractorData.price / 100) : 0 },
            { label: "Platform fee (20%)", amount: contractorData ? Math.round(contractorData.price * 0.2 / 100) : 0 },
          ],
          total: clientTotal / 100,
        });
      }
      if (contractorData) {
        const contractorNet = Math.round(contractorData.price / 100);
        await sendJobCompletedEmail({ toEmail: contractorData.email, toName: contractorData.name, jobTitle, role: "contractor", jobId: id, totalAmount: contractorNet });
        await sendInvoiceEmail({
          toEmail: contractorData.email, toName: contractorData.name, jobTitle,
          jobId: id, role: "contractor",
          lineItems: [
            { label: "Job payment", amount: Math.round(contractorData.price * 1.2 / 100) },
            { label: "Platform fee (20%)", amount: Math.round(contractorData.price * 0.2 / 100) },
          ],
          total: contractorNet,
        });
      }
    } catch { /* never block completion */ }

    return NextResponse.json({ message: "Job confirmed complete — payment will be released" });
  }

  return NextResponse.json({ message: "Already confirmed" });
}
