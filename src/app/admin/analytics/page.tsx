"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { generateCSV, downloadCSV } from "@/lib/csvExport";

// ── Types ─────────────────────────────────────────────────────

interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface AnalyticsData {
  funnel: {
    jobsPosted: number;
    jobsWithBids: number;
    jobsAccepted: number;
    jobsCompleted: number;
    jobsPaid: number;
  };
  revenue: {
    totalAllTime: number;
    totalLast30: number;
    totalLast7: number;
    avgPerJob: number;
    timeSeries: Array<{ day: string; revenue: number }>;
    byCategory: Array<{ category: string; revenue_cents: number; jobs: number }>;
  };
  userGrowth: {
    totalUsers: number;
    activeUsers: number;
    retentionRate: number;
    timeSeries: Array<{ day: string; consumers: number; contractors: number }>;
  };
  ltv: {
    customerLTV: number;
    churnRate: number;
    repeatClientRate: number;
    contractorUtilization: number;
    totalClients: number;
    totalContractors: number;
    activeContractors: number;
    repeatClients: number;
  };
  timeStats: {
    avgTimeToFirstBidHours: number;
    avgTimeToAcceptedHours: number;
    avgTimeToCompletedHours: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────

function fmtUSD(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round(hours / 24 * 10) / 10}d`;
}

// ── Components ────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function TimeStatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center hover:shadow-lg transition-all duration-300">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{unit}</p>
    </div>
  );
}

function ExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
      </svg>
      {label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/funnel")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics data"); setLoading(false); });
  }, []);

  const exportFunnel = useCallback(() => {
    if (!data) return;
    const rows = [
      { stage: "Posted", count: data.funnel.jobsPosted },
      { stage: "Got Bids", count: data.funnel.jobsWithBids },
      { stage: "Accepted", count: data.funnel.jobsAccepted },
      { stage: "Completed", count: data.funnel.jobsCompleted },
      { stage: "Paid", count: data.funnel.jobsPaid },
    ];
    const csv = generateCSV(rows, [
      { key: "stage", label: "Stage" },
      { key: "count", label: "Count" },
    ]);
    downloadCSV(csv, "job-funnel.csv");
  }, [data]);

  const exportRevenue = useCallback(() => {
    if (!data) return;
    const csv = generateCSV(data.revenue.timeSeries, [
      { key: "day", label: "Date" },
      { key: "revenue", label: "Revenue ($)" },
    ]);
    downloadCSV(csv, "revenue-trend.csv");
  }, [data]);

  const exportUserGrowth = useCallback(() => {
    if (!data) return;
    const csv = generateCSV(data.userGrowth.timeSeries, [
      { key: "day", label: "Date" },
      { key: "consumers", label: "Consumer Signups" },
      { key: "contractors", label: "Contractor Signups" },
    ]);
    downloadCSV(csv, "user-growth.csv");
  }, [data]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error ?? "No data available"}</div>
      </div>
    );
  }

  // Build funnel steps
  const funnelSteps: FunnelStep[] = [
    { label: "Posted", count: data.funnel.jobsPosted, pct: 100, color: "#3b82f6" },
    {
      label: "Got Bids",
      count: data.funnel.jobsWithBids,
      pct: data.funnel.jobsPosted ? Math.round((data.funnel.jobsWithBids / data.funnel.jobsPosted) * 100) : 0,
      color: "#6366f1",
    },
    {
      label: "Accepted",
      count: data.funnel.jobsAccepted,
      pct: data.funnel.jobsPosted ? Math.round((data.funnel.jobsAccepted / data.funnel.jobsPosted) * 100) : 0,
      color: "#8b5cf6",
    },
    {
      label: "Completed",
      count: data.funnel.jobsCompleted,
      pct: data.funnel.jobsPosted ? Math.round((data.funnel.jobsCompleted / data.funnel.jobsPosted) * 100) : 0,
      color: "#22c55e",
    },
    {
      label: "Paid",
      count: data.funnel.jobsPaid,
      pct: data.funnel.jobsPosted ? Math.round((data.funnel.jobsPaid / data.funnel.jobsPosted) * 100) : 0,
      color: "#10b981",
    },
  ];

  // Drop-off rates between stages
  const dropOffs = funnelSteps.slice(1).map((step, i) => {
    const prev = funnelSteps[i].count;
    const dropOff = prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : 0;
    return dropOff;
  });

  // Revenue by category chart data
  const catData = data.revenue.byCategory.map(c => ({
    name: c.category.replace(/_/g, " "),
    revenue: Math.round(c.revenue_cents / 100),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Platform performance and insights</p>
      </div>

      {/* ── Section A: Job Funnel ──────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Job Conversion Funnel</h2>
            <p className="text-xs text-slate-400 mt-0.5">Posted → Got Bids → Accepted → Completed → Paid</p>
          </div>
          <ExportButton onClick={exportFunnel} label="Export CSV" />
        </div>
        {data.funnel.jobsPosted === 0 ? (
          <p className="text-slate-400 text-sm py-4">No job data yet.</p>
        ) : (
          <div className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <p className="text-xs text-slate-600 font-medium">{step.label}</p>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                      style={{
                        width: `${Math.max(step.pct, step.count > 0 ? 5 : 0)}%`,
                        background: `linear-gradient(90deg, ${step.color}, ${step.color}dd)`,
                      }}
                    >
                      {step.pct > 10 && (
                        <span className="text-white text-xs font-semibold whitespace-nowrap">
                          {step.count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-sm font-semibold text-slate-700">{step.pct}%</span>
                    {step.pct <= 10 && step.count > 0 && (
                      <span className="text-xs text-slate-400 ml-1">({step.count})</span>
                    )}
                  </div>
                </div>
                {i < dropOffs.length && dropOffs[i] > 0 && (
                  <div className="ml-28 mt-0.5 mb-1">
                    <span className="text-[10px] text-red-400 font-medium">
                      {dropOffs[i]}% drop-off
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section B: Revenue Metrics ─────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="All-Time Revenue" value={fmtUSD(data.revenue.totalAllTime)} sub="Platform earnings" />
        <KpiCard label="Last 30 Days" value={fmtUSD(data.revenue.totalLast30)} sub="Rolling 30-day window" />
        <KpiCard label="Last 7 Days" value={fmtUSD(data.revenue.totalLast7)} sub="This week" />
        <KpiCard label="Avg Revenue / Job" value={fmtUSD(data.revenue.avgPerJob)} sub="Per accepted bid" />
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800">Daily Revenue (Last 30 Days)</h2>
            <p className="text-xs text-slate-400 mt-0.5">20% platform markup per accepted bid</p>
          </div>
          <ExportButton onClick={exportRevenue} label="Export CSV" />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.revenue.timeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
              labelStyle={{ color: "#334155" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Category */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-1">Revenue by Category</h2>
        <p className="text-xs text-slate-400 mb-5">Platform earnings by job category</p>
        {catData.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No accepted bids yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(catData.length * 50, 150)}>
            <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 40, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} width={95} />
              <Tooltip
                formatter={(v) => [`$${Number(v)}`, "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section C: User Growth ─────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={data.userGrowth.totalUsers.toLocaleString()} sub="All registered users" />
        <KpiCard label="Active Users (30d)" value={data.userGrowth.activeUsers.toLocaleString()} sub="Posted or bid in 30d" />
        <KpiCard label="Retention Rate" value={`${data.userGrowth.retentionRate}%`} sub="30d+ users active in 7d" />
        <KpiCard label="Total Clients" value={data.ltv.totalClients.toLocaleString()} sub={`${data.ltv.totalContractors} contractors`} />
      </div>

      {/* User Growth Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800">Signups Per Day (Last 30 Days)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Consumer vs Contractor registrations</p>
          </div>
          <ExportButton onClick={exportUserGrowth} label="Export CSV" />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.userGrowth.timeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradConsumers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradContractors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="consumers" stroke="#6366f1" strokeWidth={2} fill="url(#gradConsumers)" name="Consumers" />
            <Area type="monotone" dataKey="contractors" stroke="#f59e0b" strokeWidth={2} fill="url(#gradContractors)" name="Contractors" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section D: LTV & Churn Metrics ─────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">LTV & Engagement</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Avg Customer LTV"
            value={fmtUSD(data.ltv.customerLTV)}
            sub="Revenue / clients w/ completed jobs"
          />
          <KpiCard
            label="Churn Rate"
            value={`${data.ltv.churnRate}%`}
            sub="Inactive 30+ days"
          />
          <KpiCard
            label="Repeat Client Rate"
            value={`${data.ltv.repeatClientRate}%`}
            sub={`${data.ltv.repeatClients} of ${data.ltv.totalClients} clients`}
          />
          <KpiCard
            label="Contractor Utilization"
            value={`${data.ltv.contractorUtilization}%`}
            sub={`${data.ltv.activeContractors} of ${data.ltv.totalContractors} contractors`}
          />
        </div>
      </div>

      {/* ── Section E: Time-to-Completion Stats ────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Time-to-Completion</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimeStatCard
            label="Post to First Bid"
            value={fmtTime(data.timeStats.avgTimeToFirstBidHours)}
            unit={data.timeStats.avgTimeToFirstBidHours < 48 ? "average hours" : "average days"}
          />
          <TimeStatCard
            label="Post to Bid Accepted"
            value={fmtTime(data.timeStats.avgTimeToAcceptedHours)}
            unit={data.timeStats.avgTimeToAcceptedHours < 48 ? "average hours" : "average days"}
          />
          <TimeStatCard
            label="Accepted to Completed"
            value={fmtTime(data.timeStats.avgTimeToCompletedHours)}
            unit={data.timeStats.avgTimeToCompletedHours < 48 ? "average hours" : "average days"}
          />
        </div>
      </div>
    </div>
  );
}
