import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/users/avatar — Upload/update user avatar
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await initializeDatabase();

  try {
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "avatar file required" }, { status: 400 });
    }

    // Convert to base64 data URL for simple storage
    // In production, this would upload to S3/Cloudflare R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Update user's avatar
    db.prepare(`
      UPDATE users SET avatar_url = ? WHERE id = ?
    `).run(dataUrl, payload.userId);

    // Also update contractor profile photo if contractor
    if (payload.role === "contractor") {
      db.prepare(`
        UPDATE contractor_profiles SET profile_photo = ? WHERE user_id = ?
      `).run(dataUrl, payload.userId);
    }

    return NextResponse.json({ success: true, avatar_url: dataUrl });
  } catch (err) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
