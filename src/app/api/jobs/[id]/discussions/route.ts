import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// Redact phone numbers, emails, social handles, payment apps
function redactContactInfo(text: string): { cleaned: string; wasRedacted: boolean } {
  let cleaned = text;
  let wasRedacted = false;

  // Phone numbers (various formats)
  const phoneRegex = /(\+?1?\s*[-.]?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  if (phoneRegex.test(cleaned)) {
    cleaned = cleaned.replace(phoneRegex, "[phone removed]");
    wasRedacted = true;
  }

  // Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(cleaned)) {
    cleaned = cleaned.replace(emailRegex, "[email removed]");
    wasRedacted = true;
  }

  // Social/payment handles (@username patterns)
  const handleRegex = /@[a-zA-Z0-9_]{3,}/g;
  if (handleRegex.test(cleaned)) {
    cleaned = cleaned.replace(handleRegex, "[handle removed]");
    wasRedacted = true;
  }

  // Common payment/contact apps
  const appPatterns = /\b(venmo|cashapp|cash\s*app|zelle|paypal|whatsapp|telegram|signal|facebook|instagram|snapchat)\b[\s:]*\S*/gi;
  if (appPatterns.test(cleaned)) {
    cleaned = cleaned.replace(appPatterns, "[contact removed]");
    wasRedacted = true;
  }

  return { cleaned, wasRedacted };
}

interface DbDiscussion {
  id: string;
  job_id: string;
  user_id: string;
  user_role: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

interface DbJob {
  id: string;
  consumer_id: string;
  status: string;
}

// GET /api/jobs/[id]/discussions — fetch all discussions for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  await initializeDatabase();
  const db = getDb();

  // Verify job exists
  const job = await db.prepare("SELECT id, consumer_id, status FROM jobs WHERE id = ?").get(jobId) as DbJob | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Fetch all discussions with anonymized identity
  const rows = await db.prepare(`
    SELECT d.id, d.job_id, d.user_id, d.user_role, d.parent_id, d.content, d.created_at
    FROM job_discussions d
    WHERE d.job_id = ?
    ORDER BY d.created_at ASC
  `).all(jobId) as DbDiscussion[];

  // Build anonymous labels for contractors
  const contractorMap = new Map<string, number>();
  let contractorCount = 0;

  const discussions = rows.map((row) => {
    const isOwner = row.user_id === job.consumer_id;
    const isCurrentUser = row.user_id === payload.userId;

    let displayName: string;
    if (isOwner) {
      displayName = "Homeowner";
    } else {
      if (!contractorMap.has(row.user_id)) {
        contractorCount++;
        contractorMap.set(row.user_id, contractorCount);
      }
      displayName = `Contractor #${contractorMap.get(row.user_id)}`;
    }

    return {
      id: row.id,
      parent_id: row.parent_id,
      content: row.content,
      display_name: displayName,
      user_role: row.user_role,
      is_mine: isCurrentUser,
      is_owner: isOwner,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ discussions });
}

// POST /api/jobs/[id]/discussions — post a question or reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  await initializeDatabase();
  const db = getDb();

  // Verify job exists and is in a state that allows discussion
  const job = await db.prepare("SELECT id, consumer_id, status FROM jobs WHERE id = ?").get(jobId) as DbJob | undefined;
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!["posted", "bidding", "accepted"].includes(job.status)) {
    return NextResponse.json({ error: "Discussions are closed for this job" }, { status: 400 });
  }

  const body = await request.json();
  const rawContent: string = (body.content || "").trim();
  const parentId: string | null = body.parent_id || null;

  if (!rawContent || rawContent.length === 0) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }
  if (rawContent.length > 1000) {
    return NextResponse.json({ error: "Message must be 1000 characters or fewer" }, { status: 400 });
  }

  // Redact contact info
  const { cleaned, wasRedacted } = redactContactInfo(rawContent);

  // Verify parent exists if replying
  if (parentId) {
    const parent = await db.prepare(
      "SELECT id FROM job_discussions WHERE id = ? AND job_id = ?"
    ).get(parentId, jobId);
    if (!parent) {
      return NextResponse.json({ error: "Parent discussion not found" }, { status: 404 });
    }
  }

  const id = uuidv4();
  const isOwner = job.consumer_id === payload.userId;

  await db.prepare(`
    INSERT INTO job_discussions (id, job_id, user_id, user_role, parent_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `).run(id, jobId, payload.userId, isOwner ? "consumer" : "contractor", parentId, cleaned);

  return NextResponse.json({
    discussion: {
      id,
      parent_id: parentId,
      content: cleaned,
      display_name: isOwner ? "Homeowner" : "Contractor",
      user_role: isOwner ? "consumer" : "contractor",
      is_mine: true,
      is_owner: isOwner,
      created_at: new Date().toISOString(),
    },
    wasRedacted,
  }, { status: 201 });
}
