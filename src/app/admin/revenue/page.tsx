"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface KPIs {
  totalRevAllTime: number;
  totalRevLast30: number;
  totalRevLast7: number;
  avgBidCents: number;
  conversionRate: number;
}

interface TimePoint {
  day: string;
  signups: number;
  jobs: number;
  revenue: number;
}

interface RevByCat {
  category: string;
  jobs: number;
  revenue_cents: number;
  avg_bid_cents: number;
}

function fmtUSD(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`bg-[#0f1011] rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all duration-300 ${color}`}>
      <p className="text-xs font-medium text-[#8a8f98] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#d0d6e0] mt-1">{value}</p>
      <p className="text-xs text-[#8a8f98] mt-1">{sub}</p>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [timeSeries, setTimeSeries] = useState<TimePoint[]>([]);
  const [revByCat, setRevByCat] = useState<RevByCat[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");

  useEffect(() => {
    setLoading(true);
    const param = range === "all" ? "" : `?days=${range}`;
    fetch(`/api/admin/analytics${param}`)
      .then((r) => r.json())
      .then((d) => {
        setTimeSeries(d.timeSeries ?? []);
        setRevByCat(d.revByCat ?? []);
        setKpis(d.kpis ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#23252a] border-t-slate-700 rounded-full" />
      </div>
    );
  }

  const catChartData = revByCat.map((c) => ({
    name: c.category.replace(/_/g, " "),
    revenue: Math.round(c.revenue_cents / 100),
    jobs: c.jobs,
    avgBid: Math.round(c.avg_bid_cents / 100),
  }));

  return (
    <div className="p-8 max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#d0d6e0]">Revenue & Analytics</h1>
        <p className="text-[#8a8f98] text-sm mt-1">Platform earnings, growth trends, and bid pricing data</p>
      </div>

      {/* Date range picker */}
      <div className="flex gap-2">
        {([
          { value: "7" as const, label: "7d" },
          { value: "30" as const, label: "30d" },
          { value: "90" as const, label: "90d" },
          { value: "all" as const, label: "All Time" },
        ]).map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              range === r.value
                ? "bg-[#0f1011] text-white border-[#23252a]"
                : "bg-[#0f1011] text-[#8a8f98] border-[#23252a] hover:border-[#23252a]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="All-Time Revenue" value={fmtUSD(kpis?.totalRevAllTime ?? 0)} sub="20% markup captured" color="border-[#27a644]/30" />
        <KpiCard label="Last 30 Days" value={fmtUSD(kpis?.totalRevLast30 ?? 0)} sub="Rolling 30-day window" color="border-[#3B82F6]/30" />
        <KpiCard label="Last 7 Days" value={fmtUSD(kpis?.totalRevLast7 ?? 0)} sub="This week's earnings" color="border-[#3B82F6]/30" />
        <KpiCard label="Avg Accepted Bid" value={fmtUSD(kpis?.avgBidCents ?? 0)} sub={`${kpis?.conversionRate ?? 0}% bid conversion`} color="border-[#fbbf24]/30" />
      </div>

      {/* Revenue trend — line chart */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm">
        <h2 className="font-semibold text-[#d0d6e0] mb-1">Daily Platform Revenue</h2>
        <p className="text-xs text-[#8a8f98] mb-5">20% markup captured per accepted bid</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} labelStyle={{ color: "#334155" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={false} name="Revenue ($)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Growth chart — signups + jobs */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm">
        <h2 className="font-semibold text-[#d0d6e0] mb-1">Platform Growth</h2>
        <p className="text-xs text-[#8a8f98] mb-5">New users vs new jobs posted per day</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={timeSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="signups" name="New Users" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="jobs" name="Jobs Posted" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by category */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm">
        <h2 className="font-semibold text-[#d0d6e0] mb-1">Revenue by Category</h2>
        <p className="text-xs text-[#8a8f98] mb-5">Top 10 categories by platform earnings (all time)</p>
        {catChartData.length === 0 ? (
          <p className="text-[#8a8f98] text-sm py-8 text-center">No accepted bids yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={catChartData} layout="vertical" margin={{ top: 5, right: 40, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} width={95} />
              <Tooltip formatter={(v, name) => [name === "revenue" ? `$${Number(v)}` : v, name === "revenue" ? "Revenue" : "Jobs"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category detail table */}
      {catChartData.length > 0 && (
        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#23252a]">
            <h2 className="font-semibold text-[#d0d6e0]">Category Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#23252a] bg-[#010102]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#8a8f98]">Category</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-[#8a8f98]">Jobs Won</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-[#8a8f98]">Avg Bid (contractor)</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-[#34d399]">Platform Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revByCat.map((c) => (
                  <tr key={c.category} className="border-b border-[#23252a] hover:bg-[#141516] transition-colors">
                    <td className="px-6 py-3 text-[#d0d6e0] capitalize font-medium">{c.category.replace(/_/g, " ")}</td>
                    <td className="px-6 py-3 text-right text-[#8a8f98]">{c.jobs}</td>
                    <td className="px-6 py-3 text-right text-[#8a8f98]">{fmtUSD(c.avg_bid_cents)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-[#34d399]">{fmtUSD(c.revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
