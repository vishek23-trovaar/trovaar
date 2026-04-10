import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthPayload } from "@/lib/auth";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";
import { uploadFile } from "@/lib/s3";
import logger from "@/lib/logger";

// Allow up to 100MB uploads (Next.js default is 4MB)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    const isAllowed = file.type.startsWith("image/") || file.type.startsWith("video/") || ALLOWED_FILE_TYPES.includes(file.type);
    if (!isAllowed) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, filename, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    logger.error({ err: error }, "Upload error");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
