import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import logger from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getAuthPayload(request.headers);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "contractor" || payload.userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, business_established } = await request.json();
    if (!type || !["verification", "insurance"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'verification' or 'insurance'" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const column = type === "verification" ? "verification_status" : "insurance_status";

    // Check current status — don't allow re-requesting if already pending or approved
    const profile = await db.prepare(`SELECT ${column} FROM contractor_profiles WHERE user_id = ?`).get(id) as Record<string, string> | undefined;
    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }
    if (profile[column] === "approved") {
      return NextResponse.json({ error: `Already approved for ${type}` }, { status: 400 });
    }
    if (profile[column] === "pending") {
      return NextResponse.json({ error: `${type} request already pending review` }, { status: 400 });
    }

    // Update status to pending
    if (business_established && Number.isInteger(business_established)) {
      await db.prepare(
        `UPDATE contractor_profiles SET ${column} = 'pending', business_established = ? WHERE user_id = ?`
      ).run(business_established, id);
    } else {
      await db.prepare(`UPDATE contractor_profiles SET ${column} = 'pending' WHERE user_id = ?`).run(id);
    }

    const updatedProfile = await db.prepare("SELECT * FROM contractor_profiles WHERE user_id = ?").get(id);
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    logger.error({ err: error }, "Verification request error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
