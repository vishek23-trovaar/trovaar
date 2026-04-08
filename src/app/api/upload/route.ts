import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthPayload } from "@/lib/auth";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";
import { uploadFile } from "@/lib/s3";

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
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, filename, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
