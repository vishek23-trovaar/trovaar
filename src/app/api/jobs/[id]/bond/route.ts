import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { randomUUID } from "crypto";

// GET — check bond status for a job
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();
  const bond = await db.prepare(`SELECT * FROM completion_bonds WHERE job_id = ?`).get(id);
  return NextResponse.json({ bond: bond ?? null });
}

// POST — create bond when bid is accepted (called automatically)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractorId, amountCents = 1000 } = await request.json() as { contractorId: string; amountCents?: number };

  const db = getDb();
  await initializeDatabase();

  // Check contractor's job count — only require bond if < 10 completed jobs
  const profile = await db.prepare(`SELECT completion_count FROM contractor_profiles WHERE user_id = ?`)
    .get(contractorId) as { completion_count: number } | undefined;

  const requiresBond = (profile?.completion_count ?? 0) < 10;
  if (!requiresBond) return NextResponse.json({ bond: null, required: false });

  // Don't double-create
  const existing = await db.prepare(`SELECT * FROM completion_bonds WHERE job_id = ?`).get(id);
  if (existing) return NextResponse.json({ bond: existing });

  const now = new Date().toISOString();
  const bondId = randomUUID();
  await db.prepare(`
    INSERT INTO completion_bonds (id, job_id, contractor_id, amount_cents, status, created_at)
    VALUES (?, ?, ?, ?, 'held', ?)
  `).run(bondId, id, contractorId, amountCents, now);

  return NextResponse.json({ bond: { id: bondId, job_id: id, contractor_id: contractorId, amount_cents: amountCents, status: "held" } });
}
