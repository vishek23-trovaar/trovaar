import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

/** Haversine distance in miles between two lat/lng points */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Geocode a plain-text location string via OpenStreetMap Nominatim.
 * Returns [lat, lng] or null if not found.
 * We store results back to the DB so each location is only fetched once.
 */
async function geocodeLocation(location: string): Promise<[number, number] | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(location)}&format=json&limit=1`;

    const res = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent
        "User-Agent": "Trovaar/1.0 (trovaar.com)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.[0]) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

// GET /api/contractors/nearby?lat=X&lng=Y&miles=50
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng") || searchParams.get("lon");
  const miles = parseFloat(searchParams.get("miles") || searchParams.get("radius") || "50");
  const clientLat = parseFloat(lat ?? "");
  const clientLng = parseFloat(lng ?? "");
  const radiusMiles = miles;

  // If no client coords provided, return platform-wide active contractor count
  if (isNaN(clientLat) || isNaN(clientLng)) {
    const db = getDb();
  await initializeDatabase();
    const row = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'contractor'")
      .get() as { count: number };
    return NextResponse.json({ count: row.count, radiusMiles: null, fallback: true });
  }

  const db = getDb();
  await initializeDatabase();

  // Fetch all contractors with their stored coords and location text
  interface ContractorRow {
    id: string;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
  }
  const contractors = await db
    .prepare(
      "SELECT id, location, latitude, longitude FROM users WHERE role = 'contractor'"
    )
    .all() as ContractorRow[];

  let count = 0;

  // Geocode and cache in serial to respect Nominatim 1 req/sec limit
  for (const c of contractors) {
    let lat = c.latitude;
    let lng = c.longitude;

    // If we don't have coords yet, try to geocode their location text
    if ((lat === null || lng === null) && c.location?.trim()) {
      const coords = await geocodeLocation(c.location.trim());
      if (coords) {
        [lat, lng] = coords;
        // Cache back so we don't geocode again
        await db.prepare("UPDATE users SET latitude = ?, longitude = ? WHERE id = ?").run(
          lat,
          lng,
          c.id
        );
        // Nominatim rate limit: 1 req/sec
        await new Promise((r) => setTimeout(r, 1050));
      }
    }

    if (lat !== null && lng !== null) {
      const dist = haversine(clientLat, clientLng, lat, lng);
      if (dist <= radiusMiles) count++;
    }
  }

  return NextResponse.json({ count, radiusMiles, fallback: false });
}
