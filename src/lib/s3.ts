import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

let _client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!process.env.AWS_S3_BUCKET) return null;
  if (_client) return _client;
  _client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    } : undefined,
  });
  return _client;
}

/**
 * Upload a buffer to storage.
 * Priority: S3 → Vercel Blob → Local filesystem (dev only)
 * Returns a public URL.
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = originalName.split(".").pop() || "jpg";
  const key = `uploads/${uuidv4()}.${ext}`;

  // Option 1: AWS S3
  const s3 = getS3Client();
  if (s3 && process.env.AWS_S3_BUCKET) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    }));
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
  }

  // Option 2: Vercel Blob (works on Vercel serverless)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, buffer, {
      access: "public",
      contentType: mimeType,
    });
    return blob.url;
  }

  // Option 3: Local fallback (dev only — Vercel filesystem is read-only)
  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${uuidv4()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}
