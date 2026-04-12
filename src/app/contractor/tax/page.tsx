"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface TaxData {
  year: number;
  totalEarnedCents: number;
  netEarningsCents: number;
  platformFeeCents: number;
  totalJobs: number;
  monthlyBreakdown: Array<{ month: number; earned_cents: number; jobs: number }>;
  threshold1099: number;
  meetsThreshold: boolean;
  formGenerated: boolean;
  formGeneratedAt: string | null;
  taxInfo: {
    name: string | null;
    email: string | null;
    address: string | null;
    einOrSsnLast4: string | null;
  } | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ContractorTaxPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tax info form
  const [taxName, setTaxName] = useState("");
  const [taxEmail, setTaxEmail] = useState("");
  const [taxAddress, setTaxAddress] = useState("");
  const [taxLast4, setTaxLast4] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/contractor/tax?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.taxInfo) {
          setTaxName(d.taxInfo.name || "");
          setTaxEmail(d.taxInfo.email || "");
          setTaxAddress(d.taxInfo.address || "");
          setTaxLast4(d.taxInfo.einOrSsnLast4 || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  async function handleSaveTaxInfo() {
    setSaving(true);
    try {
      await fetch("/api/contractor/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          name: taxName,
          email: taxEmail,
          address: taxAddress,
          einOrSsnLast4: taxLast4,
        }),
      });
    } catch (err) {
      console.error("Failed to save tax info:", err);
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contractor/dashboard" className="text-sm text-blue-600 hover:text-blue-800 mb-1 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">Tax Center</h1>
          <p className="text-sm text-gray-500 mt-1">Track your earnings and 1099 tax information</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <ScrollReveal delay={0}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCents(data.totalEarnedCents)}</p>
              <p className="text-xs text-gray-400 mt-1">Gross before fees</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Net Earnings</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCents(data.netEarningsCents)}</p>
              <p className="text-xs text-gray-400 mt-1">After platform fees</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Jobs Completed</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{data.totalJobs}</p>
              <p className="text-xs text-gray-400 mt-1">Platform fee: {formatCents(data.platformFeeCents)}</p>
            </div>
          </div>
          </ScrollReveal>

          {/* 1099 Status */}
          <ScrollReveal delay={100}>
          <div className={`rounded-2xl border p-5 ${data.meetsThreshold ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{data.meetsThreshold ? "\u26A0\uFE0F" : "\u2705"}</span>
              <div>
                <p className="font-semibold text-gray-900">
                  {data.meetsThreshold
                    ? "1099-NEC Required"
                    : "Below 1099 Threshold"
                  }
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {data.meetsThreshold
                    ? `Your net earnings of ${formatCents(data.netEarningsCents)} exceed the $600 threshold. A 1099-NEC form will be generated for your tax filing.`
                    : `Your net earnings of ${formatCents(data.netEarningsCents)} are below the $600 threshold. No 1099-NEC is required at this time.`
                  }
                </p>
                {data.formGenerated && (
                  <p className="text-sm text-emerald-700 font-medium mt-2">
                    1099-NEC generated on {new Date(data.formGeneratedAt!).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          </ScrollReveal>

          {/* Monthly Breakdown */}
          <ScrollReveal delay={200}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 font-medium text-gray-500">Month</th>
                    <th className="px-5 py-3 font-medium text-gray-500 text-right">Earnings</th>
                    <th className="px-5 py-3 font-medium text-gray-500 text-right">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.monthlyBreakdown.map((m) => (
                    <tr key={m.month} className={m.earned_cents > 0 ? "" : "text-gray-300"}>
                      <td className="px-5 py-3">{MONTH_NAMES[m.month - 1]}</td>
                      <td className="px-5 py-3 text-right font-medium">{m.earned_cents > 0 ? formatCents(m.earned_cents) : "--"}</td>
                      <td className="px-5 py-3 text-right">{m.jobs > 0 ? m.jobs : "--"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-5 py-3">Total</td>
                    <td className="px-5 py-3 text-right">{formatCents(data.totalEarnedCents)}</td>
                    <td className="px-5 py-3 text-right">{data.totalJobs}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          </ScrollReveal>

          {/* Tax Information Form */}
          <ScrollReveal delay={300}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Tax Information</h2>
            <p className="text-sm text-gray-500 mb-4">
              This information is used for generating your 1099-NEC form. Please keep it up to date.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Full legal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={taxEmail}
                  onChange={(e) => setTaxEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email address"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                <input
                  type="text"
                  value={taxAddress}
                  onChange={(e) => setTaxAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Street, City, State, ZIP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last 4 of SSN or EIN</label>
                <input
                  type="text"
                  value={taxLast4}
                  onChange={(e) => setTaxLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="XXXX"
                  maxLength={4}
                />
              </div>
            </div>
            <button
              onClick={handleSaveTaxInfo}
              disabled={saving}
              className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Tax Info"}
            </button>
          </div>
          </ScrollReveal>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Failed to load tax data</div>
      )}
    </div>
  );
}
