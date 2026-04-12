import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get the client's IP from headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Use ip-api.com (free, no key needed, allows server-side calls)
    const url = ip && ip !== "127.0.0.1" && ip !== "::1"
      ? `http://ip-api.com/json/${ip}?fields=city,regionName,country,status`
      : `http://ip-api.com/json/?fields=city,regionName,country,status`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "IP geolocation failed" }, { status: 502 });
    }

    const data = await res.json();
    if (data.status !== "success" || !data.city) {
      return NextResponse.json({ error: "Could not determine location from IP" }, { status: 404 });
    }

    const location = data.regionName
      ? `${data.city}, ${data.regionName}`
      : data.city;

    return NextResponse.json({ location });
  } catch {
    return NextResponse.json({ error: "IP geolocation request failed" }, { status: 502 });
  }
}
