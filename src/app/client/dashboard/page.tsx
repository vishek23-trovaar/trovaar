"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { JobWithBidCount, JobStatus } from "@/types";
import { CATEGORY_GROUPS, PLATFORM_MARKUP } from "@/lib/constants";
import NearbyContractorsBanner from "@/components/dashboard/NearbyContractorsBanner";
import PhoneVerifyWidget from "@/components/auth/PhoneVerifyWidget";
import { ConsumerSurgeBanner } from "@/components/insights/ConsumerSurgeBanner";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    posted: "bg-blue-100 text-blue-700",
    bidding: "bg-indigo-100 text-indigo-700",
    accepted: "bg-purple-100 text-purple-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    posted: "Posted",
    bidding: "Bids In",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithBidCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [subBannerDismissed, setSubBannerDismissed] = useState(false);
  const [escrowAmounts, setEscrowAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    fetchJobs();
    // Check subscription status for the banner
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((data) => setHasSubscription(!!data.subscription))
      .catch(() => setHasSubscription(false));
  }, [user]);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs?status=posted,bidding,accepted,in_progress,completed&limit=50");
      if (res.ok) {
        const data = await res.json();
        const myJobs = data.jobs.filter((j: JobWithBidCount) => j.consumer_id === user?.id);
        setJobs(myJobs);
        // Fetch escrow amounts for active jobs
        const activeJobs = myJobs.filter((j: JobWithBidCount) => ["accepted", "in_progress"].includes(j.status));
        const amounts: Record<string, number> = {};
        await Promise.all(
          activeJobs.map(async (j: JobWithBidCount) => {
            try {
              const bidsRes = await fetch(`/api/jobs/${j.id}/bids`);
              if (bidsRes.ok) {
                const bidsData = await bidsRes.json();
                const accepted = bidsData.bids?.find((b: { status: string; price: number }) => b.status === "accepted");
                if (accepted) {
                  amounts[j.id] = Math.round(accepted.price * (1 + PLATFORM_MARKUP));
                }
              }
            } catch { /* silent */ }
          })
        );
        setEscrowAmounts(amounts);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalPosted = jobs.length;
  const activeBidsReceived = jobs.reduce((sum, j) => sum + j.bid_count, 0);
  const completed = jobs.filter((j) => j.status === "completed").length;
  const inProgress = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;

  const stats = [
    { label: "Total Posted", value: totalPosted, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Bids Received", value: activeBidsReceived, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Completed", value: completed, color: "text-green-600", bg: "bg-green-50" },
    { label: "In Progress", value: inProgress, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/client/jobs/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Post a Job
          </Link>
        </div>
      </div>

      {/* Phone verification banner */}
      <PhoneVerifyWidget />
      <PushNotificationPrompt />

      {/* Nearby contractors banner */}
      <NearbyContractorsBanner />

      {/* Home Health subscription banner — show if no subscription and not dismissed */}
      {hasSubscription === false && !subBannerDismissed && (
        <div className="mb-6 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">🏠</span>
            <p className="text-sm text-emerald-900 font-medium leading-snug">
              Keep your home healthy year-round —{" "}
              <Link href="/subscriptions" className="underline underline-offset-2 hover:text-emerald-700">
                View Home Care Plans →
              </Link>
            </p>
          </div>
          <button
            onClick={() => setSubBannerDismissed(true)}
            className="text-emerald-400 hover:text-emerald-600 transition-colors text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Referral Banner */}
      <Link
        href="/referrals"
        className="flex items-center justify-between gap-3 mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3.5 hover:bg-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🎁</span>
          <p className="text-sm text-indigo-900 font-medium leading-snug">
            Invite a friend &amp; earn <strong>$25</strong> when they complete their first job
          </p>
        </div>
        <span className="text-indigo-600 text-sm font-semibold shrink-0">Invite &amp; Earn →</span>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Surge Banner */}
      <div className="mb-6">
        <ConsumerSurgeBanner />
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Post your first job to get competitive bids from local professionals
          </p>
          <Link
            href="/client/jobs/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Post a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Category icon */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                  {getCategoryIcon(job.category)}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">{getCategoryLabel(job.category)}</p>
                      <p className="font-semibold text-gray-900 leading-tight">{job.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{job.location}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <UrgencyBadge urgency={job.urgency} />
                      <StatusBadge status={job.status as JobStatus} />
                    </div>
                  </div>

                  {/* Escrow indicator for accepted/in-progress jobs */}
                  {["accepted", "in_progress"].includes(job.status) && (
                    <div className="flex items-center gap-2 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-xs font-semibold text-emerald-700">
                        {escrowAmounts[job.id]
                          ? `$${(escrowAmounts[job.id] / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} protected in escrow`
                          : "Payment held in escrow"}
                      </span>
                      <span className="ml-auto text-[10px] text-emerald-500 font-medium hidden sm:inline">Trovaar Escrow</span>
                    </div>
                  )}

                  {/* Escrow released for completed jobs */}
                  {job.status === "completed" && (
                    <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <span className="text-sm">&#10003;</span>
                      <span className="text-xs font-medium text-green-700">Payment released to contractor</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600">
                        {job.bid_count} bid{job.bid_count !== 1 ? "s" : ""}
                      </span>
                      <span>{timeAgo(job.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === "in_progress" && (
                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Confirm &amp; Release Payment
                        </Link>
                      )}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {job.status === "in_progress" ? "Details →" : "View Bids →"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
