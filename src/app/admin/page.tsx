"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalConsumers: number;
  totalContractors: number;
  totalJobs: number;
  totalBids: number;
  totalRevenue: number;
  jobsByStatus: Record<string, number>;
  recentSignups: number;
  topCategories: Array<{ category: string; count: number }>;
  // Legacy fields from existing stats route
  activeJobs: number;
  completedJobs: number;
  acceptedBids: number;
  markupRevenueCents: number;
  newUsersLast30: number;
  recentJobs: RecentJob[];
  recentBids: RecentBid[];
}

interface RecentJob {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  location: string;
  consumer_name: string;
}

interface RecentBid {
  id: string;
  contractor_price: number;
  client_price: number;
  markup_cents: number;
  status: string;
  created_at: string;
  job_title: string;
  contractor_name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    posted: "bg-blue-100 text-blue-700",
    bidding: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    accepted: "bg-emerald-100 text-emerald-700",
    pending: "bg-slate-100 text-slate-600",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Jobs by Status Bar Chart ───────────────────────────────────────────────────
function JobsStatusChart({ jobsByStatus }: { jobsByStatus: Record<string, number> }) {
  const data = [
    { name: "Posted", count: jobsByStatus.posted ?? 0, fill: "#3b82f6" },
    { name: "Bidding", count: jobsByStatus.bidding ?? 0, fill: "#6366f1" },
    { name: "Accepted", count: jobsByStatus.accepted ?? 0, fill: "#10b981" },
    { name: "In Progress", count: jobsByStatus.in_progress ?? 0, fill: "#f59e0b" },
    { name: "Completed", count: jobsByStatus.completed ?? 0, fill: "#22c55e" },
    { name: "Cancelled", count: jobsByStatus.cancelled ?? 0, fill: "#ef4444" },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="count" name="Jobs" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) {
          console.error("Admin stats failed:", r.status);
          if (r.status === 403) window.location.href = "/admin/login";
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        console.log("Admin stats loaded:", d);
        setStats(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Stats fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-700 rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400">Failed to load stats.</div>
    );
  }

  const STAT_CARDS = [
    {
      icon: "👥",
      label: "Total Users (Consumers)",
      value: (stats.totalConsumers ?? 0).toLocaleString(),
      sub: `+${stats.recentSignups ?? 0} signups this week`,
      border: "border-blue-200",
    },
    {
      icon: "🔧",
      label: "Contractors",
      value: (stats.totalContractors ?? 0).toLocaleString(),
      sub: `${stats.totalContractors ?? 0} registered`,
      border: "border-indigo-200",
    },
    {
      icon: "📋",
      label: "Total Jobs",
      value: (stats.totalJobs ?? 0).toLocaleString(),
      sub: `${stats.activeJobs ?? 0} active · ${stats.completedJobs ?? 0} completed`,
      border: "border-amber-200",
    },
    {
      icon: "💰",
      label: "Platform Revenue",
      value: fmt(stats.markupRevenueCents ?? 0),
      sub: `20% markup · ${stats.acceptedBids ?? 0} accepted bids`,
      border: "border-emerald-200",
    },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Platform overview — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards — 4 column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm hover:shadow-lg transition-all duration-300`}
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="text-2xl font-bold text-slate-800">{card.value}</div>
            <div className="text-sm font-medium text-slate-600 mt-0.5">{card.label}</div>
            <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Jobs by status — CSS bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-5">Jobs by Status</h2>
          <JobsStatusChart jobsByStatus={stats.jobsByStatus ?? {}} />
        </div>

        {/* Top 5 categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-5">Top Job Categories</h2>
          {(stats.topCategories ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topCategories.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {cat.category.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent bids with markup view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Recent Bids — Markup View</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Contractor sees their price · Client sees marked-up price · Platform keeps the difference
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Job</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Contractor</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Contractor Sees</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Client Sees</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-emerald-600">Platform Cut</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recentBids ?? []).map((b) => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-700 max-w-[180px] truncate">{b.job_title}</td>
                  <td className="px-6 py-3 text-slate-600">{b.contractor_name}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-700">{fmt(b.contractor_price)}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-700">{fmt(b.client_price)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-emerald-600">{fmt(b.markup_cents)}</td>
                  <td className="px-6 py-3 text-center">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Jobs</h2>
          <Link
            href="/admin/jobs"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Title</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Client</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Location</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Posted</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recentJobs ?? []).map((j) => (
                <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      href={`/jobs/${j.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {j.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{j.consumer_name}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{j.location}</td>
                  <td className="px-6 py-3 text-center">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400 text-xs">
                    {fmtDate(j.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
