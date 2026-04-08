import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { scanMessage, redactContactInfo } from "@/lib/messageScanner";
import { sanitizeText } from "@/lib/sanitize";
import { notifyNewMessage } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const db = getDb();
  await initializeDatabase();

  // Verify user is the consumer or an accepted contractor for this job
  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as {
    consumer_id: string;
  } | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isConsumer = job.consumer_id === payload.userId;
  const isContractor = payload.role === "contractor";

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const messages = await db.prepare(`
    SELECT m.id, m.job_id, m.sender_id, m.content, m.read, m.flagged, m.flag_reasons,
           m.created_at, u.name as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.job_id = ?
    ORDER BY m.created_at ASC
  `).all(jobId);

  // Mark messages as read for this user
  await db.prepare(
    "UPDATE messages SET read = 1 WHERE job_id = ? AND sender_id != ? AND read = 0"
  ).run(jobId, payload.userId);

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, { maxRequests: 60, windowMs: 60 * 1000, keyPrefix: "messages" });
  if (rl) return rl;

  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }
  if (content.trim().length > 1000) {
    return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 });
  }

  const sanitizedContent = sanitizeText(content);

  const db = getDb();
  await initializeDatabase();

  // Verify user is involved in this job
  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as {
    consumer_id: string;
    status: string;
  } | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isConsumer = job.consumer_id === payload.userId;
  const isContractor = payload.role === "contractor";

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const trimmedContent = sanitizedContent.trim();

  // Apply redaction BEFORE scanning — silently replace contact info
  const { redacted: redactedContent, wasRedacted } = redactContactInfo(trimmedContent);

  // Scan the redacted content for any remaining flags (some keyword patterns may still apply)
  const scan = scanMessage(redactedContent);
  const id = uuidv4();

  db.prepare(
    "INSERT INTO messages (id, job_id, sender_id, content, flagged, flag_reasons, was_redacted, redacted_original) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    jobId,
    payload.userId,
    redactedContent,
    scan.flagged ? 1 : 0,
    scan.flagged ? JSON.stringify(scan.reasons) : null,
    wasRedacted ? 1 : 0,
    wasRedacted ? trimmedContent : null
  );

  // Create notification for the other party
  const otherUserId = isConsumer
    ? (await db.prepare(
        "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted' LIMIT 1"
      ).get(jobId) as { contractor_id: string } | undefined)?.contractor_id
    : job.consumer_id;

  if (otherUserId) {
    const senderUser = await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | null;
    const jobForNotif = await db.prepare("SELECT title FROM jobs WHERE id = ?").get(jobId) as { title: string } | null;
    notifyNewMessage(
      otherUserId,
      senderUser?.name ?? "Someone",
      jobForNotif?.title ?? "a job",
      jobId
    );
  }

  const message = await db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(id);

  return NextResponse.json({ message, was_redacted: wasRedacted }, { status: 201 });
}
