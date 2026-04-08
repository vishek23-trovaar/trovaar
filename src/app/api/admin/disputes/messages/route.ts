import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/disputes/messages?jobId=xxx — fetch messages for a job (admin only)
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const messages = await db.prepare(`
    SELECT m.id, m.sender_id, m.content, m.created_at,
      u.name as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.job_id = ?
    ORDER BY m.created_at ASC
  `).all(jobId) as Array<Record<string, unknown>>;

  return NextResponse.json({ messages });
}
