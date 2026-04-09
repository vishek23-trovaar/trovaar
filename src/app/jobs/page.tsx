"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS, CATEGORIES } from "@/lib/constants";
import { JobWithBidCount } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ConsumerSurgeBanner } from "@/components/insights/ConsumerSurgeBanner";
import { distanceMiles, formatDistance } from "@/lib/utils";

const JobMap = dynamic(() => import("@/components/map/JobMap"), { ssr: false });

type SortOption = "newest" | "closest" | "urgency" | "bids";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",  label: "Newest First"   },
  { value: "closest", label: "Closest to Me"  },
  { value: "urgency", label: "Most Urgent"    },
  { value: "bids",    label: "Most Bids"      },
];

const URGENCY_ORDER: Record<string, number> = { emergency: 0, high: 1, medium: 2, low: 3 };

const URGENCY_PILL: Record<string, string> = {
  low:       "bg-gray-100 text-gray-600",
  medium:    "bg-blue-100 text-blue-700",
  high:      "bg-amber-100 text-amber-700",
  emergency: "bg-red-100 text-red-700",
};

function BrowseJobsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const initialGroup = initialCategory
    ? (CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === initialCategory))?.label ?? null)
    : null;

  const [jobs, setJobs]                   = useState<JobWithBidCount[]>([]);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [activeGroup, setActiveGroup]     = useState<string | null>(initialGroup);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchInput, setSearchInput]     = useState("");
  const [loading, setLoading]             = useState(true);
  const [activeJobId, setActiveJobId]     = useState<string | null>(null);
  const [userLat, setUserLat]             = useState<number | undefined>();
  const [userLng, setUserLng]             = useState<number | undefined>();
  const [sortBy, setSortBy]               = useState<SortOption>("newest");
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  const listRef     = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserLat(pos.coords.latitude);
      setUserLng(pos.coords.longitude);
    });
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.set("category", categoryFilter);
      } else if (activeGroup) {
        const groupDef = CATEGORY_GROUPS.find((g) => g.label === activeGroup);
        if (groupDef) groupDef.categories.forEach((c) => params.append("category", c.value));
      }
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, activeGroup, searchQuery]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "urgency":
          return (URGENCY_ORDER[a.urgency] ?? 3) - (URGENCY_ORDER[b.urgency] ?? 3);
        case "bids":
          return b.bid_count - a.bid_count;
        case "closest": {
          if (userLat != null && userLng != null) {
            const da = a.latitude != null && a.longitude != null
              ? distanceMiles(userLat, userLng, a.latitude, a.longitude) : Infinity;
            const db = b.latitude != null && b.longitude != null
              ? distanceMiles(userLat, userLng, b.latitude, b.longitude) : Infinity;
            return da - db;
          }
          return 0;
        }
        default: return 0;
      }
    });
  }, [jobs, sortBy, userLat, userLng]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchQuery(value.trim()), 400);
  }

  function handleJobHover(id: string | null) {
    setActiveJobId(id);
    if (id) {
      const el = listRef.current?.querySelector(`[data-job-id="${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const GROUPS = [
    { key: "Home Services",               icon: "🏠", short: "Home"       },
    { key: "Automotive",                  icon: "🚗", short: "Auto"       },
    { key: "Outdoor & Landscaping",       icon: "🌿", short: "Outdoor"    },
    { key: "Commercial (Small Business)", icon: "🏢", short: "Commercial" },
    { key: "Moving & Hauling",            icon: "📦", short: "Moving"     },
  ];

  const hasFilter = !!categoryFilter || !!searchQuery;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-border px-3 sm:px-4 py-2.5 shrink-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">

          {/* Sidebar toggle — desktop only */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide list" : "Show list"}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface text-secondary transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="text-xs font-medium">{sidebarOpen ? "Hide" : "List"}</span>
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-[130px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search jobs…"
              className="w-full pl-9 pr-7 py-1.5 text-sm rounded-lg border border-border
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                bg-white text-secondary placeholder-muted"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary cursor-pointer text-lg leading-none"
              >×</button>
            )}
          </div>

          {/* Category group pills */}
          <div className="flex gap-1.5 flex-wrap">
            {GROUPS.map(({ key, icon, short }) => (
              <button
                key={key}
                onClick={() => {
                  if (activeGroup === key) { setActiveGroup(null); setCategoryFilter(""); }
                  else { setActiveGroup(key); setCategoryFilter(""); }
                }}
                className={
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all " +
                  (activeGroup === key
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white text-secondary border-border hover:border-secondary/40")
                }
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{short}</span>
              </button>
            ))}
          </div>

          {/* Count + Sort */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted hidden sm:block">
              {loading ? "Searching…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""}${hasFilter ? " found" : ""}`}
            </span>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-border
                  bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Subcategory chips */}
        {activeGroup && (
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_GROUPS.find((g) => g.label === activeGroup)?.categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(categoryFilter === cat.value ? "" : cat.value)}
                className={
                  "px-2.5 py-1 rounded-full text-xs border transition-all " +
                  (categoryFilter === cat.value
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted border-border hover:border-primary/40")
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Consumer surge banner */}
      {user?.role === "consumer" && (
        <div className="bg-white border-b border-border px-4 py-2 shrink-0">
          <ConsumerSurgeBanner />
        </div>
      )}

      {/* ── Body: map dominant, list sidebar ── */}
      {/* flex-col-reverse on mobile so map renders FIRST (top), list second (bottom) */}
      <div className="flex flex-col-reverse md:flex-row flex-1 min-h-0">

        {/* ── Sidebar: compact job list ── */}
        {sidebarOpen && (
          <div
            ref={listRef}
            className="w-full md:w-[300px] xl:w-[340px] shrink-0 overflow-y-auto
              bg-white border-t md:border-t-0 md:border-r border-border
              h-[36dvh] md:h-auto"
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-7 h-7 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : sortedJobs.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="font-medium text-secondary mb-1 text-sm">
                  {hasFilter ? "No jobs match your search" : "No open jobs right now"}
                </p>
                <p className="text-xs text-muted mb-3">
                  {hasFilter ? "Try broader keywords or clear filters." : "Check back soon or post a job!"}
                </p>
                {hasFilter && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setCategoryFilter(""); setActiveGroup(null); }}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedJobs.map((job) => {
                  const photos = (() => {
                    try { return JSON.parse(job.photos || "[]") as string[]; }
                    catch { return [] as string[]; }
                  })();
                  const catGroup = CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === job.category));
                  const catLabel = CATEGORIES.find((c) => c.value === job.category)?.label ?? job.category;
                  const dist = userLat != null && userLng != null && job.latitude != null && job.longitude != null
                    ? formatDistance(distanceMiles(userLat, userLng, job.latitude, job.longitude))
                    : null;
                  const isVideo = photos[0] && /\.(mp4|mov|webm|avi|mkv)$/i.test(photos[0]);

                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      data-job-id={job.id}
                      onMouseEnter={() => setActiveJobId(job.id)}
                      onMouseLeave={() => setActiveJobId(null)}
                      className={
                        "flex gap-3 p-3 hover:bg-surface/60 transition-all block " +
                        (activeJobId === job.id
                          ? "bg-primary/5 border-l-[3px] border-primary pl-[9px]"
                          : "border-l-[3px] border-transparent")
                      }
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface relative">
                        {photos[0] ? (
                          isVideo ? (
                            <>
                              <video src={photos[0]} className="w-full h-full object-cover" muted playsInline />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {catGroup?.icon ?? "🔧"}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-secondary line-clamp-2 leading-tight mb-1.5">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${URGENCY_PILL[job.urgency] ?? URGENCY_PILL.low}`}>
                            {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                          </span>
                          {dist && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              {dist}
                            </span>
                          )}
                          <span className="text-[10px] text-muted ml-auto">
                            {job.bid_count} bid{job.bid_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted mt-1 truncate">📍 {job.location}</p>
                        <p className="text-[10px] text-muted/70 truncate">{catLabel}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Map — dominant view ── */}
        <div className="flex-1 relative min-h-0 h-[64dvh] md:h-auto">
          <JobMap
            jobs={sortedJobs}
            activeJobId={activeJobId}
            onJobHover={handleJobHover}
            className="w-full h-full"
          />

          {/* Post Job button */}
          <div className="absolute top-3 right-3 z-[500]">
            <Link href="/jobs/new">
              <Button size="sm" className="shadow-lg">+ Post a Job</Button>
            </Link>
          </div>

          {/* Mobile: toggle list button */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-[500]
              flex items-center gap-2 bg-white shadow-xl rounded-full px-4 py-2.5
              text-sm font-semibold text-secondary border border-border/60 active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {sidebarOpen ? "Hide List" : `Show ${jobs.length} Jobs`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BrowseJobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BrowseJobsContent />
    </Suspense>
  );
}
