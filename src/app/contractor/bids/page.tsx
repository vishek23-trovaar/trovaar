"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { JobWithBidCount } from "@/types";
import { CATEGORY_GROUPS } from "@/lib/constants";

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
  return value;
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

function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    pending:   { bg: "bg-yellow-100 text-yellow-700", label: "Pending" },
    accepted:  { bg: "bg-green-100 text-green-700",   label: "Accepted ✓" },
    rejected:  { bg: "bg-red-100 text-red-700",       label: "Declined" },
    withdrawn: { bg: "bg-gray-100 text-gray-500",     label: "Withdrawn" },
  };
  const s = map[status] ?? { bg: "bg-gray-100 text-gray-600", label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
      {s.label}
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
  note: string;
  status: string;
  created_at: string;
}

export default function ContractorBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  const fetchBids = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/jobs?status=posted,bidding,accepted,in_progress,completed&limit=200");
      if (!res.ok) return;
      const data = await res.json();
      const allJobs: JobWithBidCount[] = data.jobs || [];

      const results: BidWithJob[] = [];
      await Promise.all(
        allJobs.map(async (job) => {
          try {
            const bidRes = await fetch(`/api/jobs/${job.id}/bids`);
            if (!bidRes.ok) return;
            const bidData = await bidRes.json();
            const myBid = bidData.bids?.find(
              (b: { contractor_id: string }) => b.contractor_id === user.id
            );
            if (myBid) {
              results.push({
                id: myBid.id,
                job_id: job.id,
                job_title: job.title,
                job_category: job.category,
                job_status: job.status,
                price: myBid.price,
                note: myBid.note || "",
                status: myBid.status,
                created_at: myBid.created_at,
              });
            }
          } catch { /* silent */ }
        })
      );
      // Sort newest first
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBids(results);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const filtered = filter === "all" ? bids : bids.filter((b) => b.status === filter);

  const counts = {
    all: bids.length,
    pending: bids.filter((b) => b.status === "pending").length,
    accepted: bids.filter((b) => b.status === "accepted").length,
    rejected: bids.filter((b) => b.status === "rejected").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bids</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all your submitted bids</p>
        </div>
        <Link
          href="/contractor/dashboard"
          className="text-sm text-primary hover:underline font-medium"
        >
          Browse Jobs →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: "all",      label: "Total Bids",   color: "text-gray-800" },
          { key: "pending",  label: "Pending",       color: "text-yellow-600" },
          { key: "accepted", label: "Accepted",      color: "text-green-600" },
          { key: "rejected", label: "Declined",      color: "text-red-600" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key as typeof filter)}
            className={`bg-white rounded-xl border p-4 text-center transition-all cursor-pointer ${
              filter === s.key ? "border-primary shadow-sm" : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <div className={`text-2xl font-bold ${s.color}`}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Bid list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">🏷</div>
          <p className="font-semibold text-gray-800">
            {filter === "all" ? "No bids submitted yet" : `No ${filter} bids`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === "all"
              ? "Browse available jobs and submit your first bid."
              : "Change the filter above to see other bids."}
          </p>
          {filter === "all" && (
            <Link
              href="/contractor/dashboard"
              className="inline-block mt-4 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Jobs
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((bid) => (
              <div key={bid.id} className="p-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                      {getCategoryIcon(bid.job_category)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{bid.job_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {getCategoryLabel(bid.job_category)} · Submitted {timeAgo(bid.created_at)}
                      </p>
                      {bid.note && (
                        <p className="text-xs text-gray-500 mt-1 italic truncate max-w-sm">
                          &ldquo;{bid.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <BidStatusBadge status={bid.status} />
                    <p className="text-sm font-bold text-gray-900">
                      ${(bid.price / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <Link
                      href={`/jobs/${bid.job_id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {bid.status === "accepted" ? "Open Job →" : "View →"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
