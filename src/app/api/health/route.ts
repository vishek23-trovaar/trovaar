import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
  await initializeDatabase();
    await db.prepare("SELECT 1").get();
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      { status: "error", message },
      { status: 503 }
    );
  }
}
