import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";

function getCategoryLabel(value: string): string {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// GET /api/neighborhood?lat=...&lng=...&miles=25&limit=20
// Requires auth. Returns anonymized grouped neighborhood activity.
// Falls back to platform-wide stats if no lat/lng provided.
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const db = getDb();
  await initializeDatabase();

  const hasCoordsParam = !isNaN(lat) && !isNaN(lng);

  if (!hasCoordsParam) {
    // Platform-wide stats — last 30 days
    interface ActivityRow {
      category: string;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      count: number;
      last_completed: string;
    }

    const rows = await db.prepare(`
      SELECT
        na.category,
        na.city,
        na.state,
        na.zip_code,
        COUNT(*) as count,
        MAX(na.completed_at) as last_completed
      FROM neighborhood_activity na
      WHERE na.completed_at >= datetime('now', '-30 days')
      GROUP BY na.category, na.city, na.state, na.zip_code
      ORDER BY count DESC, last_completed DESC
      LIMIT ?
    `).all(limit) as ActivityRow[];

    const totalThisWeek = (await db.prepare(`
      SELECT COUNT(*) as count FROM neighborhood_activity
      WHERE completed_at >= datetime('now', '-7 days')
    `).get() as { count: number }).count;

    const topCategoryRow = await db.prepare(`
      SELECT category, COUNT(*) as cnt
      FROM neighborhood_activity
      WHERE completed_at >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY cnt DESC
      LIMIT 1
    `).get() as { category: string; cnt: number } | undefined;

    // Popular categories (top 6) in last 30 days
    const popularCategories = await db.prepare(`
      SELECT category, COUNT(*) as count
      FROM neighborhood_activity
      WHERE completed_at >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY count DESC
      LIMIT 6
    `).all() as { category: string; count: number }[];

    // Trending contractors — top performers platform-wide in last 30 days
    const trendingContractors = await db.prepare(`
      SELECT
        na.contractor_id,
        u.name,
        cp.profile_photo,
        cp.rating,
        cp.rating_count,
        cp.headline,
        COUNT(*) as jobs_completed,
        STRING_AGG(DISTINCT na.category, ',') as recent_categories
      FROM neighborhood_activity na
      JOIN users u ON u.id = na.contractor_id
      LEFT JOIN contractor_profiles cp ON cp.user_id = na.contractor_id
      WHERE na.completed_at >= datetime('now', '-30 days')
        AND na.contractor_id IS NOT NULL
      GROUP BY na.contractor_id, u.name, cp.profile_photo, cp.rating, cp.rating_count, cp.headline
      HAVING COUNT(*) >= 1
      ORDER BY cp.rating DESC, jobs_completed DESC
      LIMIT 6
    `).all() as {
      contractor_id: string;
      name: string;
      profile_photo: string | null;
      rating: number;
      rating_count: number;
      headline: string | null;
      jobs_completed: number;
      recent_categories: string | null;
    }[];

    const nearby = rows.map((r) => ({
      category: r.category,
      category_label: getCategoryLabel(r.category),
      city: r.city,
      state: r.state,
      zip: r.zip_code,
      count: r.count,
      last_completed: r.last_completed,
    }));

    return NextResponse.json({
      nearby,
      summary: {
        total_this_week: totalThisWeek,
        top_category: topCategoryRow?.category ?? null,
      },
      popular_categories: popularCategories.map((c) => ({
        category: c.category,
        category_label: getCategoryLabel(c.category),
        count: c.count,
      })),
      trending_contractors: trendingContractors.map((c) => ({
        id: c.contractor_id,
        name: c.name,
        profile_photo: c.profile_photo,
        rating: c.rating,
        rating_count: c.rating_count,
        headline: c.headline,
        jobs_completed: c.jobs_completed,
        recent_categories: (c.recent_categories || "").split(",").filter(Boolean).map((cat) => getCategoryLabel(cat)),
      })),
      platform_wide: true,
    });
  }

  // Location-based query: bounding box filter using job lat/lng
  const miles = Math.min(200, Math.max(1, parseFloat(searchParams.get("miles") ?? "25")));
  const latDelta = miles / 69.0;
  const lngDelta = miles / (69.0 * Math.cos((lat * Math.PI) / 180));

  interface ActivityRow {
    category: string;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    count: number;
    last_completed: string;
  }

  const rows = await db.prepare(`
    SELECT
      na.category,
      na.city,
      na.state,
      na.zip_code,
      COUNT(*) as count,
      MAX(na.completed_at) as last_completed
    FROM neighborhood_activity na
    JOIN jobs j ON j.id = na.job_id
    WHERE na.completed_at >= datetime('now', '-30 days')
      AND j.latitude BETWEEN ? AND ?
      AND j.longitude BETWEEN ? AND ?
    GROUP BY na.category, na.city, na.state, na.zip_code
    ORDER BY count DESC, last_completed DESC
    LIMIT ?
  `).all(
    lat - latDelta, lat + latDelta,
    lng - lngDelta, lng + lngDelta,
    limit
  ) as ActivityRow[];

  const totalThisWeek = (await db.prepare(`
    SELECT COUNT(*) as count
    FROM neighborhood_activity na
    JOIN jobs j ON j.id = na.job_id
    WHERE na.completed_at >= datetime('now', '-7 days')
      AND j.latitude BETWEEN ? AND ?
      AND j.longitude BETWEEN ? AND ?
  `).get(
    lat - latDelta, lat + latDelta,
    lng - lngDelta, lng + lngDelta
  ) as { count: number }).count;

  const topCategoryRow = await db.prepare(`
    SELECT na.category, COUNT(*) as cnt
    FROM neighborhood_activity na
    JOIN jobs j ON j.id = na.job_id
    WHERE na.completed_at >= datetime('now', '-30 days')
      AND j.latitude BETWEEN ? AND ?
      AND j.longitude BETWEEN ? AND ?
    GROUP BY na.category
    ORDER BY cnt DESC
    LIMIT 1
  `).get(
    lat - latDelta, lat + latDelta,
    lng - lngDelta, lng + lngDelta
  ) as { category: string; cnt: number } | undefined;

  // Popular categories nearby
  const popularCategories = await db.prepare(`
    SELECT na.category, COUNT(*) as count
    FROM neighborhood_activity na
    JOIN jobs j ON j.id = na.job_id
    WHERE na.completed_at >= datetime('now', '-30 days')
      AND j.latitude BETWEEN ? AND ?
      AND j.longitude BETWEEN ? AND ?
    GROUP BY na.category
    ORDER BY count DESC
    LIMIT 6
  `).all(
    lat - latDelta, lat + latDelta,
    lng - lngDelta, lng + lngDelta
  ) as { category: string; count: number }[];

  // Trending contractors nearby
  const trendingContractors = await db.prepare(`
    SELECT
      na.contractor_id,
      u.name,
      cp.profile_photo,
      cp.rating,
      cp.rating_count,
      cp.headline,
      COUNT(*) as jobs_completed,
      STRING_AGG(DISTINCT na.category, ',') as recent_categories
    FROM neighborhood_activity na
    JOIN jobs j ON j.id = na.job_id
    JOIN users u ON u.id = na.contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = na.contractor_id
    WHERE na.completed_at >= datetime('now', '-30 days')
      AND na.contractor_id IS NOT NULL
      AND j.latitude BETWEEN ? AND ?
      AND j.longitude BETWEEN ? AND ?
    GROUP BY na.contractor_id, u.name, cp.profile_photo, cp.rating, cp.rating_count, cp.headline
    HAVING COUNT(*) >= 1
    ORDER BY cp.rating DESC, jobs_completed DESC
    LIMIT 6
  `).all(
    lat - latDelta, lat + latDelta,
    lng - lngDelta, lng + lngDelta
  ) as {
    contractor_id: string;
    name: string;
    profile_photo: string | null;
    rating: number;
    rating_count: number;
    headline: string | null;
    jobs_completed: number;
    recent_categories: string | null;
  }[];

  const nearby = rows.map((r) => ({
    category: r.category,
    category_label: getCategoryLabel(r.category),
    city: r.city,
    state: r.state,
    zip: r.zip_code,
    count: r.count,
    last_completed: r.last_completed,
  }));

  return NextResponse.json({
    nearby,
    summary: {
      total_this_week: totalThisWeek,
      top_category: topCategoryRow?.category ?? null,
    },
    popular_categories: popularCategories.map((c) => ({
      category: c.category,
      category_label: getCategoryLabel(c.category),
      count: c.count,
    })),
    trending_contractors: trendingContractors.map((c) => ({
      id: c.contractor_id,
      name: c.name,
      profile_photo: c.profile_photo,
      rating: c.rating,
      rating_count: c.rating_count,
      headline: c.headline,
      jobs_completed: c.jobs_completed,
      recent_categories: (c.recent_categories || "").split(",").filter(Boolean).map((cat) => getCategoryLabel(cat)),
    })),
    platform_wide: false,
  });
}
