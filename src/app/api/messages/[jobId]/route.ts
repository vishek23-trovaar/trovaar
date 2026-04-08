import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface DbJob {
  id: string;
  consumer_id: string;
  status: string;
}

interface DbBid {
  contractor_id: string;
  status: string;
}

interface DbMessage {
  id: string;
  job_id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string | null;
  content: string;
  read: number;
  created_at: string;
}

// GET /api/messages/[jobId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const db = getDb();
  await initializeDatabase();

  // Fetch job and verify access
  const job = await db.prepare("SELECT id, consumer_id, status FROM jobs WHERE id = ?").get(jobId) as DbJob | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isConsumer = job.consumer_id === payload.userId;

  // Check accepted contractor
  const acceptedBid = await db.prepare(
    "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted'"
  ).get(jobId) as DbBid | undefined;
  const isContractor = acceptedBid?.contractor_id === payload.userId;

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Fetch messages
  const messages = await db.prepare(`
    SELECT m.id, m.job_id, m.sender_id, u.name as sender_name, m.receiver_id,
           m.content, m.read, m.created_at
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.job_id = ?
    ORDER BY m.created_at ASC
  `).all(jobId) as DbMessage[];

  // Mark messages as read where receiver_id = current user
  await db.prepare(
    "UPDATE messages SET read = 1 WHERE job_id = ? AND receiver_id = ? AND read = 0"
  ).run(jobId, payload.userId);

  const result = messages.map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    content: m.content,
    read: m.read,
    created_at: m.created_at,
    is_mine: m.sender_id === payload.userId,
  }));

  return NextResponse.json({ messages: result });
}

// POST /api/messages/[jobId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const db = getDb();
  await initializeDatabase();

  // Fetch job
  const job = await db.prepare("SELECT id, consumer_id, status FROM jobs WHERE id = ?").get(jobId) as DbJob | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Validate job has accepted bid
  const acceptedBid = await db.prepare(
    "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted'"
  ).get(jobId) as DbBid | undefined;

  if (!acceptedBid) {
    return NextResponse.json({ error: "No accepted bid for this job" }, { status: 400 });
  }

  const isConsumer = job.consumer_id === payload.userId;
  const isContractor = acceptedBid.contractor_id === payload.userId;

  if (!isConsumer && !isContractor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Determine receiver
  const receiverId = isConsumer ? acceptedBid.contractor_id : job.consumer_id;

  // Validate content
  const body = await request.json();
  const content: string = (body.content || "").trim();

  if (!content || content.length === 0) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "Message must be 1000 characters or fewer" }, { status: 400 });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, job_id, sender_id, receiver_id, content, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(id, jobId, payload.userId, receiverId, content, now);

  // Send notification to receiver
  try {
    const senderUser = await db.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId) as { name: string } | undefined;
    const senderName = senderUser?.name || "Someone";
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, job_id, read, created_at)
      VALUES (?, ?, 'new_message', ?, ?, ?, 0, ?)
    `).run(uuidv4(), receiverId, `New message from ${senderName}`, content.slice(0, 80), jobId, now);
  } catch { /* silent — notification is non-critical */ }

  const created = {
    id,
    sender_id: payload.userId,
    content,
    read: 0,
    created_at: now,
    is_mine: true,
  };

  return NextResponse.json({ message: created }, { status: 201 });
}
