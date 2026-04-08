"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import JobCard from "@/components/jobs/JobCard";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS } from "@/lib/constants";
import { JobWithBidCount } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ConsumerSurgeBanner } from "@/components/insights/ConsumerSurgeBanner";

const JobMap = dynamic(() => import("@/components/map/JobMap"), { ssr: false });

function BrowseJobsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const initialGroup = initialCategory
    ? (CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === initialCategory))?.label ?? null)
    : null;

  const [jobs, setJobs] = useState<JobWithBidCount[]>([]);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [activeGroup, setActiveGroup] = useState<string | null>(initialGroup);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [view, setView] = useState<"split" | "list">("split");
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const listRef = useRef<HTMLDivElement>(null);
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
        // Specific sub-category selected
        params.set("category", categoryFilter);
      } else if (activeGroup) {
        // Group selected but no sub-category — filter by all categories in the group
        const groupDef = CATEGORY_GROUPS.find((g) => g.label === activeGroup);
        if (groupDef) {
          groupDef.categories.forEach((c) => params.append("category", c.value));
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, activeGroup, searchQuery]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

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
    { key: "Commercial (Small Business)", icon: "🏢", short: "Commercial" },
  ];

  const hasFilter = !!categoryFilter || !!searchQuery;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* Top filter bar */}
      <div className="bg-white border-b border-border px-4 sm:px-6 py-3 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center gap-3">

          {/* Search input */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search jobs…"
              className="w-full pl-9 pr-7 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Main group pills */}
          <div className="flex gap-1.5">
            {GROUPS.map(({ key, icon, short }) => (
              <button
                key={key}
                onClick={() => {
                  if (activeGroup === key) { setActiveGroup(null); setCategoryFilter(""); }
                  else { setActiveGroup(key); setCategoryFilter(""); }
                }}
                className={
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all " +
                  (activeGroup === key
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white text-secondary border-border hover:border-secondary/40")
                }
              >
                <span>{icon}</span><span>{short}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted hidden sm:block">
              {loading ? "Searching…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""}${hasFilter ? " found" : ""}`}
            </span>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                onClick={() => setView("split")}
                className={"px-3 py-1.5 transition-colors " + (view === "split" ? "bg-secondary text-white" : "bg-white text-muted hover:bg-surface")}
              >
                🗺 Map
              </button>
              <button
                onClick={() => setView("list")}
                className={"px-3 py-1.5 transition-colors " + (view === "list" ? "bg-secondary text-white" : "bg-white text-muted hover:bg-surface")}
              >
                ☰ List
              </button>
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

      {/* Consumer surge demand signal */}
      {user?.role === "consumer" && (
        <div className="bg-white border-b border-border px-4 sm:px-6 py-2 shrink-0">
          <ConsumerSurgeBanner />
        </div>
      )}

      {/* Body */}
      {view === "split" ? (
        <div className="flex flex-1 min-h-0">

          {/* Left: scrollable job list */}
          <div
            ref={listRef}
            className="w-[360px] xl:w-[420px] shrink-0 overflow-y-auto bg-surface border-r border-border"
          >
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <p className="font-medium text-secondary mb-1">
                  {hasFilter ? "No jobs match your search" : "No open jobs right now"}
                </p>
                <p className="text-xs text-muted mb-4">
                  {hasFilter ? "Try different keywords or a broader category." : "Be the first to post!"}
                </p>
                {hasFilter && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setCategoryFilter(""); setActiveGroup(null); }}
                    className="text-sm text-primary hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    data-job-id={job.id}
                    onMouseEnter={() => setActiveJobId(job.id)}
                    onMouseLeave={() => setActiveJobId(null)}
                    className={
                      "rounded-xl transition-all " +
                      (activeJobId === job.id ? "ring-2 ring-primary shadow-lg scale-[1.01]" : "")
                    }
                  >
                    <JobCard job={job} userLat={userLat} userLng={userLng} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: interactive map */}
          <div className="flex-1 relative min-h-0">
            <JobMap
              jobs={jobs}
              activeJobId={activeJobId}
              onJobHover={handleJobHover}
              className="w-full h-full"
            />
            <div className="absolute top-4 right-4 z-[500]">
              <Link href="/jobs/new">
                <Button size="sm" className="shadow-lg">+ Post a Job</Button>
              </Link>
            </div>
          </div>
        </div>

      ) : (
        /* List-only view */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl font-semibold text-secondary mb-2">
                  {hasFilter ? "No jobs match your search" : "No open jobs right now"}
                </p>
                <p className="text-muted mb-6">
                  {hasFilter
                    ? "Try adjusting your search terms or clearing the filters."
                    : "Check back soon or post the first job yourself!"}
                </p>
                {hasFilter ? (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setCategoryFilter(""); setActiveGroup(null); }}
                    className="text-primary hover:underline cursor-pointer font-medium"
                  >
                    Clear all filters
                  </button>
                ) : (
                  <Link href="/jobs/new">
                    <Button>Post a Job</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobs.map((job) => <JobCard key={job.id} job={job} userLat={userLat} userLng={userLng} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrowseJobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <BrowseJobsContent />
    </Suspense>
  );
}
