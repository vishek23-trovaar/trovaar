import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface PortfolioPhoto {
  url: string;
  caption: string | null;
  project_type: string | null;
  uploaded_at: string;
}

function parsePortfolioPhotos(raw: string | null): PortfolioPhoto[] {
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await initializeDatabase();

    const row = await db
      .prepare("SELECT portfolio_photos FROM contractor_profiles WHERE user_id = ?")
      .get(id) as { portfolio_photos: string } | undefined;

    const photos = parsePortfolioPhotos(row?.portfolio_photos ?? null);
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can manage portfolios" }, { status: 403 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "You can only update your own portfolio" }, { status: 403 });
  }

  try {
    const { photo_url, caption, project_type } = await request.json();

    if (!photo_url || typeof photo_url !== "string" || !photo_url.trim()) {
      return NextResponse.json({ error: "photo_url is required" }, { status: 400 });
    }

    const validProjectTypes = ["before_after", "completed_work", "in_progress", "team_equipment"];
    if (project_type && !validProjectTypes.includes(project_type)) {
      return NextResponse.json({ error: "Invalid project_type" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    const row = await db
      .prepare("SELECT portfolio_photos FROM contractor_profiles WHERE user_id = ?")
      .get(id) as { portfolio_photos: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    const photos = parsePortfolioPhotos(row.portfolio_photos);

    const newPhoto: PortfolioPhoto = {
      url: photo_url.trim(),
      caption: caption?.trim() || null,
      project_type: project_type || null,
      uploaded_at: new Date().toISOString(),
    };

    photos.push(newPhoto);

    await db
      .prepare("UPDATE contractor_profiles SET portfolio_photos = ? WHERE user_id = ?")
      .run(JSON.stringify(photos), id);

    return NextResponse.json({ photos }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "contractor") {
    return NextResponse.json({ error: "Only contractors can manage portfolios" }, { status: 403 });
  }

  const { id } = await params;
  if (payload.userId !== id) {
    return NextResponse.json({ error: "You can only update your own portfolio" }, { status: 403 });
  }

  try {
    const { photo_url } = await request.json();

    if (!photo_url || typeof photo_url !== "string") {
      return NextResponse.json({ error: "photo_url is required" }, { status: 400 });
    }

    const db = getDb();
    await initializeDatabase();

    const row = await db
      .prepare("SELECT portfolio_photos FROM contractor_profiles WHERE user_id = ?")
      .get(id) as { portfolio_photos: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    const photos = parsePortfolioPhotos(row.portfolio_photos);
    const filtered = photos.filter((p) => p.url !== photo_url);

    if (filtered.length === photos.length) {
      return NextResponse.json({ error: "Photo not found in portfolio" }, { status: 404 });
    }

    await db
      .prepare("UPDATE contractor_profiles SET portfolio_photos = ? WHERE user_id = ?")
      .run(JSON.stringify(filtered), id);

    return NextResponse.json({ photos: filtered });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
