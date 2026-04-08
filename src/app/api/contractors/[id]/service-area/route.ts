import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// GET /api/contractors/[id]/service-area
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await initializeDatabase();

  const profile = await db.prepare(`
    SELECT service_zip_codes, service_radius_miles
    FROM contractor_profiles
    WHERE user_id = ?
  `).get(id) as { service_zip_codes: string | null; service_radius_miles: number } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    service_zip_codes: profile.service_zip_codes ? JSON.parse(profile.service_zip_codes) : [],
    service_radius_miles: profile.service_radius_miles ?? 25,
  });
}

// PUT /api/contractors/[id]/service-area
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.userId !== id || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { service_zip_codes, service_radius_miles } = await request.json();

  const zipArray: string[] = Array.isArray(service_zip_codes)
    ? service_zip_codes.map((z: string) => z.trim()).filter(Boolean).slice(0, 20)
    : [];

  const radius = Math.min(Math.max(parseInt(service_radius_miles) || 25, 5), 100);

  const db = getDb();
  await initializeDatabase();
  await db.prepare(`
    UPDATE contractor_profiles
    SET service_zip_codes = ?, service_radius_miles = ?
    WHERE user_id = ?
  `).run(JSON.stringify(zipArray), radius, id);

  return NextResponse.json({ success: true, service_zip_codes: zipArray, service_radius_miles: radius });
}
