"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CATEGORY_GROUPS } from "@/lib/constants";
import ScrollReveal from "@/components/ui/ScrollReveal";

function getCategoryLabel(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    const cat = g.categories.find((c) => c.value === value);
    if (cat) return cat.label;
  }
  return value;
}

function getCategoryIcon(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.categories.some((c) => c.value === value)) return g.icon;
  }
  return "🔧";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface EarningRow {
  job_id: string;
  job_title: string;
  job_category: string;
  job_completed_at: string;
  net_cents: number; // cents — after platform fee deduction
}

export default function ContractorEarningsPage() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/earnings");
      if (!res.ok) return;
      const data = await res.json();
      const recentJobs = data.recentJobs || [];

      const rows: EarningRow[] = recentJobs.map(
        (j: { id: string; title: string; category: string; completed_at: string | null; bid_amount_cents: number; platform_fee_cents: number | null }) => ({
          job_id: j.id,
          job_title: j.title,
          job_category: j.category,
          job_completed_at: j.completed_at ?? "",
          net_cents: j.bid_amount_cents - (j.platform_fee_cents ?? Math.round(j.bid_amount_cents * 0.2)),
        })
      );

      rows.sort(
        (a, b) =>
          new Date(b.job_completed_at).getTime() - new Date(a.job_completed_at).getTime()
      );
      setEarnings(rows);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const totalCents = earnings.reduce((s, e) => s + e.net_cents, 0);
  const thisMonthCents = earnings
    .filter((e) => {
      const d = new Date(e.job_completed_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.net_cents, 0);

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your completed jobs and payout history</p>
      </div>

      {/* Summary cards */}
      <ScrollReveal delay={0}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-3xl font-bold text-green-600">{fmt(totalCents)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Earned (Net)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-3xl font-bold text-blue-600">{fmt(thisMonthCents)}</p>
          <p className="text-sm text-gray-500 mt-1">This Month (Net)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-3xl font-bold text-indigo-600">{earnings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Jobs Completed</p>
        </div>
      </div>
      </ScrollReveal>

      {/* Earnings list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : earnings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="font-semibold text-gray-800">No earnings yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Complete your first job to see your earnings here.
          </p>
          <Link
            href="/contractor/dashboard"
            className="inline-block mt-4 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <ScrollReveal delay={100}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Payment History</p>
            <p className="text-xs text-gray-400">{earnings.length} job{earnings.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {earnings.map((row) => (
              <div
                key={row.job_id}
                className="flex items-center justify-between p-4 gap-4 hover:bg-gray-50/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-xl shrink-0">
                    {getCategoryIcon(row.job_category)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{row.job_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getCategoryLabel(row.job_category)} · {formatDate(row.job_completed_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+{fmt(row.net_cents)}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <Link
                    href={`/jobs/${row.job_id}`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Total footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <p className="text-sm font-bold text-green-600">{fmt(totalCents)}</p>
          </div>
        </div>
        </ScrollReveal>
      )}
    </div>
  );
}
