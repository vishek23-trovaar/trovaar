import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || !payload.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const db = getDb();
  await initializeDatabase();
  const pending = await db.prepare(`
    SELECT
      cp.user_id,
      u.name,
      u.email,
      cp.verification_status,
      cp.insurance_status,
      cp.business_established,
      cp.rating,
      cp.rating_count,
      cp.years_experience,
      u.created_at
    FROM contractor_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.verification_status = 'pending' OR cp.insurance_status = 'pending'
    ORDER BY u.created_at ASC
  `).all();

  return NextResponse.json({ contractors: pending });
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload || !payload.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { contractorId, type, action } = await request.json();

    if (!contractorId || !type || !action) {
      return NextResponse.json({ error: "contractorId, type, and action are required" }, { status: 400 });
    }
    if (!["verification", "insurance"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'verification' or 'insurance'" }, { status: 400 });
    }
    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const db = getDb();
  await initializeDatabase();
    const column = type === "verification" ? "verification_status" : "insurance_status";

    await db.prepare(`UPDATE contractor_profiles SET ${column} = ? WHERE user_id = ?`).run(action, contractorId);

    // Create in-app notification for contractor
    const { v4: uuidv4 } = await import("uuid");
    const label = type === "verification" ? "Verified ✓" : "Insured 🛡";
    const title = action === "approved" ? `${label} Badge Approved` : `${type.charAt(0).toUpperCase() + type.slice(1)} Request Rejected`;
    const message = action === "approved"
      ? `Congratulations! Your ${type} badge has been approved and is now visible on your profile.`
      : `Your ${type} request was not approved at this time. Contact support for more information.`;

    db.prepare(
      "INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)"
    ).run(uuidv4(), contractorId, `${type}_${action}`, title, message);

    const updatedProfile = await db.prepare("SELECT * FROM contractor_profiles WHERE user_id = ?").get(contractorId);
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
