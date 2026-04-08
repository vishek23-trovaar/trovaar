import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

// POST /api/contractors/[id]/id-document — save uploaded ID document URL and mark pending
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = getAuthPayload(request.headers);
  if (!payload || payload.userId !== id || payload.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { document_url, license_number, license_state } = await request.json();

  if (!document_url) {
    return NextResponse.json({ error: "document_url required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Save the document and mark verification as pending
  db.prepare(`
    UPDATE contractor_profiles
    SET
      id_document_url = ?,
      id_verified = 0,
      license_number = COALESCE(?, license_number),
      license_state = COALESCE(?, license_state),
      verification_status = CASE
        WHEN verification_status = 'none' THEN 'pending'
        ELSE verification_status
      END
    WHERE user_id = ?
  `).run(document_url, license_number || null, license_state || null, id);

  return NextResponse.json({ success: true, message: "ID document submitted for review" });
}
