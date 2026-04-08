"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const CATEGORY_EMOJIS: Record<string, string> = {
  plumbing: "🔧",
  electrical: "⚡",
  hvac: "❄️",
  roofing: "🏠",
  flooring: "🪵",
  painting: "🎨",
  handyman: "🛠️",
  carpentry: "🪚",
  landscaping: "🌿",
  tree_service: "🌳",
  auto_repair: "🚗",
  cleaning: "🧹",
  moving: "📦",
  pest_control: "🐜",
  pool_spa: "🏊",
  appliance_repair: "🔌",
  security_systems: "🔒",
  smart_home: "📱",
  locksmith: "🔑",
  dog_walking: "🐕",
  photography: "📷",
  personal_training: "💪",
  default: "🔨",
};

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? CATEGORY_EMOJIS.default;
}

interface NearbyItem {
  category: string;
  category_label: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  count: number;
  last_completed: string;
}

interface NeighborhoodData {
  nearby: NearbyItem[];
  summary: {
    total_this_week: number;
    top_category: string | null;
  };
  platform_wide: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function NeighborhoodFeedPage() {
  const [data, setData] = useState<NeighborhoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (lat !== undefined && lng !== undefined) {
        params.set("lat", lat.toString());
        params.set("lng", lng.toString());
        params.set("miles", "25");
      }
      const res = await fetch(`/api/neighborhood?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const json = await res.json() as NeighborhoodData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchFeed();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchFeed(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationDenied(true);
        fetchFeed();
      },
      { timeout: 8000 }
    );
  }, [fetchFeed]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/client/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-3"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Neighborhood Activity</h1>
          <p className="text-sm text-gray-500 mt-1">See what services are trending near you</p>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-sm text-emerald-800">
          <span className="shrink-0 mt-0.5">🔒</span>
          <span>Activity is anonymized — no personal details are shown.</span>
        </div>

        {/* Location fallback notice */}
        {locationDenied && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
            <span className="shrink-0 mt-0.5">📍</span>
            <span>Location access was denied — showing platform-wide activity instead.</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Loading nearby activity...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
            <button
              onClick={() => fetchFeed()}
              className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                  🏘️
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {data.summary.total_this_week} jobs completed{" "}
                    {data.platform_wide ? "platform-wide" : "near you"} this week
                  </p>
                  {data.summary.top_category && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Most popular: {getCategoryEmoji(data.summary.top_category)}{" "}
                      {data.nearby.find((n) => n.category === data.summary.top_category)?.category_label ??
                        data.summary.top_category}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Feed items */}
            {data.nearby.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <p className="text-4xl mb-3">🏘️</p>
                <p className="font-semibold text-gray-700">No recent activity found</p>
                <p className="text-sm text-gray-500 mt-1">Check back soon as jobs are completed in your area.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  {data.platform_wide ? "Recent platform activity (last 30 days)" : "Near you — last 30 days"}
                </p>
                {data.nearby.map((item, idx) => {
                  const location = [item.city, item.state].filter(Boolean).join(", ") || item.zip || "Unknown area";
                  const emoji = getCategoryEmoji(item.category);
                  return (
                    <div
                      key={`${item.category}-${item.city}-${item.zip}-${idx}`}
                      className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl shrink-0">
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.count} {item.category_label} job{item.count !== 1 ? "s" : ""} completed in{" "}
                          {location}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Last completed {formatTimeAgo(item.last_completed)}
                          {item.zip ? ` · ZIP ${item.zip}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        {item.count}×
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
