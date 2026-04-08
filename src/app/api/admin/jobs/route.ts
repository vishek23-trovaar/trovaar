import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { applyMarkup } from "@/lib/pricing";
import { logAdminAction } from "@/lib/auditLog";

const ALLOWED_SORT_COLS: Record<string, string> = {
  title: "j.title",
  created_at: "j.created_at",
  status: "j.status",
  bid_count: "bid_count",
  accepted_bid_price: "accepted_bid_price",
};

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const urgency = searchParams.get("urgency") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Sort params
  const sortParam = searchParams.get("sort") ?? "created_at";
  const dirParam = searchParams.get("dir") ?? "desc";
  const sortCol = ALLOWED_SORT_COLS[sortParam] ?? "j.created_at";
  const sortDir = dirParam === "asc" ? "ASC" : "DESC";
  const nullsLast = sortDir === "DESC" ? "NULLS LAST" : "NULLS FIRST";

  const db = getDb();
  await initializeDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("j.title LIKE ?");
    params.push(`%${search}%`);
  }
  if (status) {
    conditions.push("j.status = ?");
    params.push(status);
  }
  if (category) {
    conditions.push("j.category = ?");
    params.push(category);
  }
  if (urgency) {
    conditions.push("j.urgency = ?");
    params.push(urgency);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const jobs = await db.prepare(`
    SELECT
      j.id, j.title, j.category, j.status, j.location, j.urgency,
      j.created_at, j.updated_at, j.payment_status,
      u.name as consumer_name, u.id as consumer_id,
      (SELECT COUNT(*) FROM bids b WHERE b.job_id = j.id) as bid_count,
      (SELECT b2.price FROM bids b2 WHERE b2.job_id = j.id AND b2.status = 'accepted' LIMIT 1) as accepted_bid_price
    FROM jobs j
    JOIN users u ON u.id = j.consumer_id
    ${where}
    ORDER BY ${sortCol} ${sortDir} ${nullsLast}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  // Apply markup to accepted bid price shown to admin for context (admin sees contractor price separately)
  const jobsWithMarkup = jobs.map((job) => ({
    ...job,
    accepted_bid_contractor_price: job.accepted_bid_price,
    accepted_bid_client_price: job.accepted_bid_price != null
      ? applyMarkup(job.accepted_bid_price as number)
      : null,
  }));

  const total = (await db.prepare(`
    SELECT COUNT(*) as count FROM jobs j ${where}
  `).get(...params) as { count: number }).count;

  const pages = Math.ceil(total / limit);

  // Fetch distinct categories for filter dropdown
  const categories = (await db.prepare("SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL AND category != '' ORDER BY category ASC").all() as Array<{ category: string }>).map((r) => r.category);

  return NextResponse.json({ jobs: jobsWithMarkup, total, page, pages, limit, categories });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json() as {
    jobId: string;
    fields?: {
      title?: string;
      status?: string;
      urgency?: string;
      category?: string;
      location?: string;
    };
  };

  const { jobId, fields } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const existing = await db.prepare("SELECT id, title, status, urgency, category, location FROM jobs WHERE id = ?").get(jobId) as { id: string; title: string; status: string; urgency: string; category: string; location: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const vals: (string | number)[] = [];
  const f = fields ?? {};

  const VALID_STATUSES = ["posted", "bidding", "accepted", "in_progress", "completed", "cancelled"];
  const VALID_URGENCIES = ["low", "medium", "high", "emergency"];

  if (f.title !== undefined) {
    if (typeof f.title !== "string" || !f.title.trim()) {
      return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 });
    }
    updates.push("title = ?");
    vals.push(f.title.trim());
  }

  if (f.status !== undefined) {
    if (!VALID_STATUSES.includes(f.status)) {
      return NextResponse.json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    updates.push("status = ?");
    vals.push(f.status);
  }

  if (f.urgency !== undefined) {
    if (!VALID_URGENCIES.includes(f.urgency)) {
      return NextResponse.json({ error: `Urgency must be one of: ${VALID_URGENCIES.join(", ")}` }, { status: 400 });
    }
    updates.push("urgency = ?");
    vals.push(f.urgency);
  }

  if (f.category !== undefined) {
    if (typeof f.category !== "string") {
      return NextResponse.json({ error: "Category must be a string" }, { status: 400 });
    }
    updates.push("category = ?");
    vals.push(f.category.trim());
  }

  if (f.location !== undefined) {
    if (typeof f.location !== "string") {
      return NextResponse.json({ error: "Location must be a string" }, { status: 400 });
    }
    updates.push("location = ?");
    vals.push(f.location.trim());
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  vals.push(jobId);
  await db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).run(...vals);

  logAdminAction({
    action: "edit_job",
    entityType: "job",
    entityId: jobId,
    entityLabel: existing.title,
    oldValue: { title: existing.title, status: existing.status, urgency: existing.urgency, category: existing.category, location: existing.location },
    newValue: f as Record<string, unknown>,
    reversible: true,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId query param is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const existing = await db.prepare("SELECT id, title, category, status FROM jobs WHERE id = ?").get(jobId) as { id: string; title: string; category: string; status: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  logAdminAction({
    action: "delete_job",
    entityType: "job",
    entityId: jobId,
    entityLabel: existing.title,
    oldValue: { id: existing.id, title: existing.title, category: existing.category, status: existing.status },
    reversible: false,
  });

  await db.prepare("DELETE FROM jobs WHERE id = ?").run(jobId);

  return NextResponse.json({ success: true });
}
