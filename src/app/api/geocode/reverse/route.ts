import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "Accept-Language": "en-US,en",
          "User-Agent": "Trovaar/1.0 (https://trovaar.com)",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = await res.json();
    const addr = data.address ?? {};
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "";
    const state = addr.state || addr.region || "";

    let location = "";
    if (city && state) {
      location = `${city}, ${state}`;
    } else if (state) {
      location = state;
    } else if (addr.country) {
      location = addr.country;
    }

    return NextResponse.json({ location, raw: addr });
  } catch {
    return NextResponse.json({ error: "Geocoding request failed or timed out" }, { status: 502 });
  }
}
