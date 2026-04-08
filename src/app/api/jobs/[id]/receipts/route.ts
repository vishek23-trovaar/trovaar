import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";

// GET — list receipts for a job (contractor or consumer of the job)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();

  // Check access — must be the consumer or the accepted contractor
  const job = await db.prepare(`
    SELECT j.consumer_id, b.contractor_id as accepted_contractor_id
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as { consumer_id: string; accepted_contractor_id: string | null } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isConsumer = payload.userId === job.consumer_id;
  const isContractor = payload.userId === job.accepted_contractor_id;
  if (!isConsumer && !isContractor && !payload.isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const receipts = await db.prepare(`
    SELECT r.*, u.name as contractor_name
    FROM job_receipts r
    JOIN users u ON u.id = r.contractor_id
    WHERE r.job_id = ?
    ORDER BY r.created_at DESC
  `).all(id);

  return NextResponse.json({ receipts });
}

// POST — contractor uploads a receipt/invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can upload receipts" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();

  // Verify this contractor has an accepted bid on the job
  const job = await db.prepare(`
    SELECT j.consumer_id, j.status, b.contractor_id as accepted_contractor_id
    FROM jobs j
    LEFT JOIN bids b ON b.job_id = j.id AND b.status = 'accepted'
    WHERE j.id = ?
  `).get(id) as { consumer_id: string; status: string; accepted_contractor_id: string | null } | undefined;

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.accepted_contractor_id !== payload.userId) {
    return NextResponse.json({ error: "You do not have an accepted bid on this job" }, { status: 403 });
  }
  if (!["accepted", "en_route", "arrived", "in_progress", "completed"].includes(job.status)) {
    return NextResponse.json({ error: "Cannot upload receipts for this job status" }, { status: 400 });
  }

  const body = await request.json();
  const { file_url, file_name, file_type, description, amount_cents, receipt_type } = body as {
    file_url: string;
    file_name: string;
    file_type?: string;
    description?: string;
    amount_cents?: number;
    receipt_type?: string;
  };

  if (!file_url || !file_name) {
    return NextResponse.json({ error: "file_url and file_name are required" }, { status: 400 });
  }

  const validTypes = ["receipt", "invoice", "estimate", "other"];
  const receiptType = validTypes.includes(receipt_type ?? "") ? receipt_type! : "receipt";
  const fileType = file_name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";

  const now = new Date().toISOString();
  const receiptId = randomUUID();

  db.prepare(`
    INSERT INTO job_receipts (id, job_id, contractor_id, file_url, file_name, file_type, description, amount_cents, receipt_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(receiptId, id, payload.userId, file_url, file_name, fileType, description?.trim() || null, amount_cents || null, receiptType, now);

  // Notify consumer
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, created_at)
    VALUES (?, ?, 'receipt_uploaded', 'Receipt Uploaded', 'Your contractor uploaded a new receipt or invoice for this job.', ?, ?)
  `).run(randomUUID(), job.consumer_id, id, now);

  const receipt = await db.prepare("SELECT * FROM job_receipts WHERE id = ?").get(receiptId);
  return NextResponse.json({ receipt }, { status: 201 });
}

// DELETE — contractor removes their own receipt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receipt_id } = await request.json();
  if (!receipt_id) return NextResponse.json({ error: "receipt_id required" }, { status: 400 });

  const db = getDb();
  await initializeDatabase();
  const receipt = await db.prepare("SELECT * FROM job_receipts WHERE id = ? AND job_id = ?").get(receipt_id, id) as {
    contractor_id: string;
  } | undefined;

  if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  if (receipt.contractor_id !== payload.userId && !payload.isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.prepare("DELETE FROM job_receipts WHERE id = ?").run(receipt_id);
  return NextResponse.json({ message: "Receipt deleted" });
}
