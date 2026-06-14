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
import ScrollReveal from "@/components/ui/ScrollReveal";

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
    emergency: "bg-[#f87171]/10 text-[#f87171]",
    high: "bg-[#fb923c]/10 text-[#fb923c]",
    medium: "bg-[#fbbf24]/10 text-[#fbbf24]",
    low: "bg-[#27a644]/10 text-[#34d399]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[urgency] || "bg-[#141516] text-[#8a8f98]"}`}>
      {urgency}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    posted: "bg-[#3B82F6]/10 text-[#60A5FA]",
    bidding: "bg-[#6366f1]/10 text-[#818cf8]",
    accepted: "bg-[#a78bfa]/10 text-[#c4b5fd]",
    in_progress: "bg-[#fbbf24]/10 text-[#fbbf24]",
    completed: "bg-[#27a644]/10 text-[#34d399]",
    cancelled: "bg-[#141516] text-[#8a8f98]",
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-[#141516] text-[#8a8f98]"}`}>
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
  const activeBidsReceived = jobs.reduce((sum, j) => sum + (Number(j.bid_count) || 0), 0);
  const completed = jobs.filter((j) => j.status === "completed").length;
  const inProgress = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;

  const stats = [
    { label: "Total Posted", value: totalPosted, color: "text-[#60A5FA]", bg: "bg-[#3B82F6]/10" },
    { label: "Active Bids Received", value: activeBidsReceived, color: "text-[#818cf8]", bg: "bg-[#6366f1]/10" },
    { label: "Completed", value: completed, color: "text-[#34d399]", bg: "bg-[#27a644]/10" },
    { label: "In Progress", value: inProgress, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Midnight hero band (see DESIGN.md) */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8 sm:py-8 mb-6 text-white"
        style={{ backgroundColor: "#0f1011", border: "1px solid #23252a" }}
      >
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-3 text-xs backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="text-slate-200">Live marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">My Jobs</h1>
            <p className="text-slate-300 text-sm mt-1.5">Track your posts, bids, and completed work.</p>
          </div>
          <Link
            href="/client/jobs/new"
            className="inline-flex items-center px-6 py-3 bg-white text-blue-700 text-sm font-bold rounded-full shadow-lg shadow-blue-900/30 hover:shadow-xl hover:bg-blue-50 transition-all"
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
        <div className="mb-6 flex items-center justify-between gap-3 bg-[#27a644]/10 border border-[#27a644]/30 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">🏠</span>
            <p className="text-sm text-[#34d399] font-medium leading-snug">
              Keep your home healthy year-round —{" "}
              <Link href="/subscriptions" className="underline underline-offset-2 hover:text-[#6ee7b7]">
                View Home Care Plans →
              </Link>
            </p>
          </div>
          <button
            onClick={() => setSubBannerDismissed(true)}
            className="text-[#34d399] hover:text-[#6ee7b7] transition-colors text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Referral Banner */}
      <Link
        href="/referrals"
        className="flex items-center justify-between gap-3 mb-6 bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-xl px-5 py-3.5 hover:bg-[#6366f1]/20 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🎁</span>
          <p className="text-sm text-[#818cf8] font-medium leading-snug">
            Invite a friend &amp; earn <strong>$25</strong> when they complete their first job
          </p>
        </div>
        <span className="text-[#818cf8] text-sm font-semibold shrink-0">Invite &amp; Earn →</span>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i * 80}>
            <div className={`${stat.bg} rounded-2xl p-4 text-center border border-[#23252a] backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[#8a8f98] mt-1">{stat.label}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Surge Banner */}
      <ScrollReveal delay={100}>
        <div className="mb-6">
          <ConsumerSurgeBanner />
        </div>
      </ScrollReveal>

      {/* Jobs list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        /* Empty state */
        <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-[#f7f8f8] mb-2">No jobs yet</h2>
          <p className="text-[#8a8f98] text-sm mb-8 max-w-sm mx-auto">
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
          {jobs.map((job, i) => (
            <ScrollReveal key={job.id} delay={i * 60}>
            <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start gap-4">
                {/* Category icon */}
                <div className="w-10 h-10 rounded-lg bg-[#141516] flex items-center justify-center text-xl shrink-0">
                  {getCategoryIcon(job.category)}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-[#8a8f98] font-medium mb-0.5">{getCategoryLabel(job.category)}</p>
                      <p className="font-semibold text-[#f7f8f8] leading-tight">{job.title}</p>
                      <p className="text-sm text-[#8a8f98] mt-0.5">{job.location}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <UrgencyBadge urgency={job.urgency} />
                      <StatusBadge status={job.status as JobStatus} />
                    </div>
                  </div>

                  {/* Escrow indicator for accepted/in-progress jobs */}
                  {["accepted", "in_progress"].includes(job.status) && (
                    <div className="flex items-center gap-2 mt-2 bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-[#34d399] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-xs font-semibold text-[#34d399]">
                        {escrowAmounts[job.id]
                          ? `$${(escrowAmounts[job.id] / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} protected in escrow`
                          : "Payment held in escrow"}
                      </span>
                      <span className="ml-auto text-[10px] text-[#34d399] font-medium hidden sm:inline">Trovaar Escrow</span>
                    </div>
                  )}

                  {/* Escrow released for completed jobs */}
                  {job.status === "completed" && (
                    <div className="flex items-center gap-2 mt-2 bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg px-3 py-2">
                      <span className="text-sm text-[#34d399]">&#10003;</span>
                      <span className="text-xs font-medium text-[#34d399]">Payment released to contractor</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-sm text-[#8a8f98]">
                      <span className="inline-flex items-center gap-1 bg-[#141516] px-2 py-0.5 rounded-full text-xs font-medium text-[#8a8f98]">
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
                        className="text-sm font-medium text-[#60A5FA] hover:text-[#93c5fd] hover:underline"
                      >
                        {job.status === "in_progress" ? "Details →" : "View Bids →"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
