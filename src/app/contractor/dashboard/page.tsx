"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { JobWithBidCount } from "@/types";
import { CATEGORY_GROUPS } from "@/lib/constants";
import PhoneVerifyWidget from "@/components/auth/PhoneVerifyWidget";
import { SurgeBanner } from "@/components/insights/SurgeBanner";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import dynamic from "next/dynamic";
import ScrollReveal from "@/components/ui/ScrollReveal";

const JobMap = dynamic(() => import("@/components/map/JobMap"), { ssr: false });

type Tab = "browse" | "my_bids";
type BrowseView = "list" | "map";

function getCategoryIcon(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.categories.some((c) => c.value === value)) return g.icon;
  }
  return "🔧";
}

function getCategoryLabel(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    const cat = g.categories.find((c) => c.value === value);
    if (cat) return cat.label;
  }
  // Fallback: format raw value like "general_handyman" → "General Handyman"
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    emergency: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[urgency] || "bg-gray-100 text-gray-600"}`}>
      {urgency}
    </span>
  );
}

function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

interface BidWithJob {
  id: string;
  job_id: string;
  job_title: string;
  job_category: string;
  job_status: string;
  price: number;
  status: string;
  created_at: string;
}

interface ContractorStats {
  rating: number;
  total_bids: number;
  accepted_bids: number;
  avg_response_hours: number | null;
}

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [browseView, setBrowseView] = useState<BrowseView>("list");

  // Browse Jobs state
  const [jobs, setJobs] = useState<JobWithBidCount[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // My Bids state
  const [myBids, setMyBids] = useState<BidWithJob[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsFetched, setBidsFetched] = useState(false);

  // Stats state
  const [stats, setStats] = useState<ContractorStats | null>(null);
  const [profile, setProfile] = useState<{ rating: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === "my_bids" && !bidsFetched) {
      fetchMyBids();
    }
  }, [activeTab, bidsFetched]);

  async function fetchStats() {
    if (!user) return;
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch(`/api/contractors/${user.id}`),
        fetch(`/api/contractors/${user.id}/stats`),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
      }
    } catch { /* silent */ }
  }

  async function fetchJobs() {
    try {
      const url = categoryFilter
        ? `/api/jobs?status=posted,bidding&category=${categoryFilter}`
        : "/api/jobs?status=posted,bidding";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  }

  async function fetchMyBids() {
    if (!user) return;
    setBidsLoading(true);
    try {
      // Get all jobs the contractor has bid on
      const res = await fetch("/api/jobs?status=posted,bidding,accepted,in_progress,completed&limit=100");
      if (!res.ok) return;
      const data = await res.json();
      const allJobs: JobWithBidCount[] = data.jobs || [];

      const bidResults: BidWithJob[] = [];
      for (const job of allJobs) {
        try {
          const bidRes = await fetch(`/api/jobs/${job.id}/bids`);
          if (!bidRes.ok) continue;
          const bidData = await bidRes.json();
          const myBid = bidData.bids?.find((b: { contractor_id: string }) => b.contractor_id === user.id);
          if (myBid) {
            bidResults.push({
              id: myBid.id,
              job_id: job.id,
              job_title: job.title,
              job_category: job.category,
              job_status: job.status,
              price: myBid.price,
              status: myBid.status,
              created_at: myBid.created_at,
            });
          }
        } catch { /* silent */ }
      }
      setMyBids(bidResults);
      setBidsFetched(true);
    } catch (err) {
      console.error("Failed to fetch bids:", err);
    } finally {
      setBidsLoading(false);
    }
  }

  // Filter jobs by search
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !search || job.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || job.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Refetch when category filter changes
  useEffect(() => {
    if (activeTab === "browse") {
      setJobsLoading(true);
      fetchJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  function formatResponseTime(hours: number | null): string {
    if (hours === null) return "—";
    if (hours < 1) return "< 1 hr";
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <PhoneVerifyWidget />
      <PushNotificationPrompt />

      {/* Quick Actions */}
      <ScrollReveal delay={0}>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link
          href="/contractor/calendar"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
            📅
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Calendar</p>
            <p className="text-xs text-gray-500">Schedule & availability</p>
          </div>
        </Link>
        <Link
          href="/contractor/invoices"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">
            📄
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Invoices</p>
            <p className="text-xs text-gray-500">Billing & payments</p>
          </div>
        </Link>
        <Link
          href="/contractor/clients"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl">
            👥
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">My Clients</p>
            <p className="text-xs text-gray-500">CRM & history</p>
          </div>
        </Link>
      </div>
      </ScrollReveal>

      {/* Stats bar */}
      <ScrollReveal delay={100}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-xl font-bold text-amber-600">
            {profile?.rating && profile.rating > 0 ? `${profile.rating.toFixed(1)} ⭐` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rating</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-xl font-bold text-indigo-600">{stats?.total_bids ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Bids Submitted</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-xl font-bold text-green-600">{stats?.accepted_bids ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Jobs Won</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-xl font-bold text-blue-600">{formatResponseTime(stats?.avg_response_hours ?? null)}</p>
          <p className="text-xs text-gray-500 mt-1">Avg Response</p>
        </div>
      </div>
      </ScrollReveal>

      {/* Surge Banner */}
      <SurgeBanner />

      {/* Referral Banner */}
      <ScrollReveal delay={200}>
      <Link
        href="/referrals"
        className="flex items-center justify-between gap-3 mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3.5 hover:bg-indigo-100 hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🎁</span>
          <p className="text-sm text-indigo-900 font-medium leading-snug">
            Invite a friend &amp; earn <strong>$25</strong> when they complete their first job
          </p>
        </div>
        <span className="text-indigo-600 text-sm font-semibold shrink-0">Invite &amp; Earn →</span>
      </Link>
      </ScrollReveal>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "browse" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Browse Jobs
        </button>
        <button
          onClick={() => setActiveTab("my_bids")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "my_bids" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Bids
        </button>
      </div>

      {/* Browse Jobs tab */}
      {activeTab === "browse" && (
        <div>
          {/* Search/filter bar */}
          <div className="flex gap-3 mb-4 flex-col sm:flex-row">
            <input
              type="text"
              placeholder="Search jobs by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Categories</option>
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* List / Map view toggle */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} available
            </p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setBrowseView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  browseView === "list"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </button>
              <button
                onClick={() => setBrowseView("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  browseView === "map"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Map
              </button>
            </div>
          </div>

          {jobsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : browseView === "map" ? (
            /* ---- Map View ---- */
            filteredJobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="font-semibold text-gray-800">No jobs to show on the map</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Map legend */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-xs font-medium text-gray-500">Urgency:</span>
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Emergency
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Medium
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> Low
                  </span>
                </div>
                <JobMap
                  jobs={filteredJobs}
                  center={[25.7617, -80.1918]}
                  zoom={11}
                  className="w-full h-[500px]"
                />
              </div>
            )
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-gray-800">No jobs found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            /* ---- List View ---- */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredJobs.map((job) => {
                const photos = (() => { try { return JSON.parse(job.photos || "[]"); } catch { return []; } })();
                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                    {/* Thumbnail */}
                    {photos.length > 0 ? (
                      <img src={photos[0]} alt="" className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-4xl">
                        {getCategoryIcon(job.category)}
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 font-medium">{getCategoryIcon(job.category)} {getCategoryLabel(job.category)}</p>
                          <p className="font-semibold text-gray-900 leading-tight truncate">{job.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{job.location}</p>
                          {(job as unknown as { consumer_name?: string }).consumer_name && (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                              <span className="font-medium text-gray-700">
                                {(job as unknown as { consumer_name: string }).consumer_name}
                              </span>
                              {(job as unknown as { consumer_rating?: number | null }).consumer_rating != null && (job as unknown as { consumer_rating: number }).consumer_rating > 0 ? (
                                <span className="text-amber-500 font-medium">
                                  ⭐ {(job as unknown as { consumer_rating: number }).consumer_rating.toFixed(1)}
                                  <span className="text-gray-400 font-normal ml-0.5">
                                    ({(job as unknown as { consumer_rating_count: number }).consumer_rating_count} {(job as unknown as { consumer_rating_count: number }).consumer_rating_count === 1 ? "job" : "jobs"})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-gray-400">New client</span>
                              )}
                            </p>
                          )}
                        </div>
                        <UrgencyBadge urgency={job.urgency} />
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{timeAgo(job.created_at)}</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {job.bid_count} bid{job.bid_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View Job →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Bids tab */}
      {activeTab === "my_bids" && (
        <div>
          {bidsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myBids.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="text-4xl mb-3">🏷</div>
              <p className="font-semibold text-gray-800">No bids yet</p>
              <p className="text-sm text-gray-500 mt-1">Browse available jobs and submit your first bid.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {myBids.map((bid) => (
                  <div key={bid.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                          {getCategoryIcon(bid.job_category)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{bid.job_title}</p>
                          <p className="text-xs text-gray-400">{getCategoryLabel(bid.job_category)} · {timeAgo(bid.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold text-gray-900">
                            ${(bid.price / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400">your bid</p>
                        </div>
                        <BidStatusBadge status={bid.status} />
                        <Link
                          href={`/jobs/${bid.job_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                    {/* Escrow indicators */}
                    {bid.status === "accepted" && ["accepted", "in_progress"].includes(bid.job_status) && (
                      <div className="mt-2 ml-12 flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 w-fit">
                        🔒 Payment secured in escrow
                      </div>
                    )}
                    {bid.status === "accepted" && bid.job_status === "completed" && (
                      <div className="mt-2 ml-12 flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5 w-fit">
                        ✅ Payment released
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
