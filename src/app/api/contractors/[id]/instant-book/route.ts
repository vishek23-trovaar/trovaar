import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface InstantBookRow {
  instant_book_enabled: number;
  instant_book_price: number | null;
  instant_book_categories: string;
  instant_book_hours: string;
}

// GET /api/contractors/[id]/instant-book — read instant book settings for a contractor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const row = await db.prepare(
    `SELECT instant_book_enabled, instant_book_price, instant_book_categories, instant_book_hours
     FROM contractor_profiles WHERE user_id = ?`
  ).get(id) as InstantBookRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  let categories: string[] = [];
  try { categories = JSON.parse(row.instant_book_categories || "[]"); } catch { /* silent */ }

  let hours: Record<string, { start: string; end: string }> = {};
  try { hours = JSON.parse(row.instant_book_hours || "{}"); } catch { /* silent */ }

  return NextResponse.json({
    enabled: !!row.instant_book_enabled,
    price: row.instant_book_price ?? null,
    categories,
    hours,
  });
}

// POST /api/contractors/[id]/instant-book — toggle instant book settings (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can update instant book settings" }, { status: 403 });
  }

  const body = await request.json() as {
    enabled?: boolean;
    price?: number;
    categories?: string[];
    hours?: Record<string, { start: string; end: string }>;
  };

  const db = getDb();
  await initializeDatabase();

  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.enabled !== undefined) {
    updates.push("instant_book_enabled = ?");
    vals.push(body.enabled ? 1 : 0);
  }
  if (body.price !== undefined) {
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "Price must be a non-negative number (in cents)" }, { status: 400 });
    }
    updates.push("instant_book_price = ?");
    vals.push(body.price);
  }
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories)) {
      return NextResponse.json({ error: "Categories must be an array" }, { status: 400 });
    }
    updates.push("instant_book_categories = ?");
    vals.push(JSON.stringify(body.categories));
  }
  if (body.hours !== undefined) {
    updates.push("instant_book_hours = ?");
    vals.push(JSON.stringify(body.hours));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  vals.push(id);
  await db.prepare(
    `UPDATE contractor_profiles SET ${updates.join(", ")} WHERE user_id = ?`
  ).run(...vals);

  // Re-read and return
  const row = await db.prepare(
    `SELECT instant_book_enabled, instant_book_price, instant_book_categories, instant_book_hours
     FROM contractor_profiles WHERE user_id = ?`
  ).get(id) as InstantBookRow | undefined;

  let categories: string[] = [];
  try { categories = JSON.parse(row?.instant_book_categories || "[]"); } catch { /* silent */ }

  let hours: Record<string, { start: string; end: string }> = {};
  try { hours = JSON.parse(row?.instant_book_hours || "{}"); } catch { /* silent */ }

  return NextResponse.json({
    enabled: row ? !!row.instant_book_enabled : false,
    price: row?.instant_book_price ?? null,
    categories,
    hours,
  });
}
