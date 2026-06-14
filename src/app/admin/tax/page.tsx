"use client";

import { useState, useEffect } from "react";

interface ContractorTax {
  contractorId: string;
  name: string;
  email: string;
  grossEarnedCents: number;
  netEarnedCents: number;
  platformFeeCents: number;
  totalJobs: number;
  formGenerated: boolean;
  formGeneratedAt: string | null;
  taxName: string | null;
  taxAddress: string | null;
  einOrSsnLast4: string | null;
}

interface TaxSummary {
  totalContractors: number;
  totalEarningsCents: number;
  formsGenerated: number;
  formsPending: number;
}

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminTaxPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [contractors, setContractors] = useState<ContractorTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/tax?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setContractors(d.contractors || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  async function handleGenerate1099(contractorId: string) {
    setGeneratingId(contractorId);
    try {
      const res = await fetch("/api/admin/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, year }),
      });
      if (res.ok) {
        setContractors((prev) =>
          prev.map((c) =>
            c.contractorId === contractorId
              ? { ...c, formGenerated: true, formGeneratedAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to generate 1099:", err);
    } finally {
      setGeneratingId(null);
    }
  }

  function handleExportCSV() {
    if (contractors.length === 0) return;

    const headers = ["Name", "Email", "Tax Name", "Address", "SSN/EIN Last 4", "Gross Earnings", "Net Earnings", "Platform Fee", "Jobs", "1099 Generated"];
    const rows = contractors.map((c) => [
      c.name,
      c.email,
      c.taxName || "",
      c.taxAddress || "",
      c.einOrSsnLast4 || "",
      (c.grossEarnedCents / 100).toFixed(2),
      (c.netEarnedCents / 100).toFixed(2),
      (c.platformFeeCents / 100).toFixed(2),
      String(c.totalJobs),
      c.formGenerated ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `1099-contractors-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f7f8f8]">1099 Tax Management</h1>
          <p className="text-sm text-[#8a8f98] mt-1">Track contractor earnings and generate 1099-NEC forms</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[#23252a] rounded-lg px-3 py-2 text-sm font-medium bg-[#0f1011]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleExportCSV}
            disabled={contractors.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-5 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-[#8a8f98] font-medium uppercase tracking-wide">Contractors &ge; $600</p>
                <p className="text-2xl font-bold text-[#f7f8f8] mt-1">{summary.totalContractors}</p>
              </div>
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-5 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-[#8a8f98] font-medium uppercase tracking-wide">Total Gross Earnings</p>
                <p className="text-2xl font-bold text-[#f7f8f8] mt-1">{formatCents(summary.totalEarningsCents)}</p>
              </div>
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-5 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-[#8a8f98] font-medium uppercase tracking-wide">1099s Generated</p>
                <p className="text-2xl font-bold text-[#34d399] mt-1">{summary.formsGenerated}</p>
              </div>
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-5 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-[#8a8f98] font-medium uppercase tracking-wide">1099s Pending</p>
                <p className="text-2xl font-bold text-[#fbbf24] mt-1">{summary.formsPending}</p>
              </div>
            </div>
          )}

          {/* Contractors Table */}
          {contractors.length === 0 ? (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-12 text-center">
              <p className="text-[#8a8f98]">No contractors with earnings &ge; $600 for {year}</p>
            </div>
          ) : (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#010102] text-left">
                      <th className="px-5 py-3 font-medium text-[#8a8f98]">Contractor</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98] text-right">Gross Earned</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98] text-right">Net Earned</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98] text-right">Jobs</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98]">Tax Info</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98] text-center">1099 Status</th>
                      <th className="px-5 py-3 font-medium text-[#8a8f98] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23252a]">
                    {contractors.map((c) => (
                      <tr key={c.contractorId} className="hover:bg-[#141516]">
                        <td className="px-5 py-3">
                          <p className="font-medium text-[#f7f8f8]">{c.name}</p>
                          <p className="text-xs text-[#8a8f98]">{c.email}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{formatCents(c.grossEarnedCents)}</td>
                        <td className="px-5 py-3 text-right font-medium text-[#34d399]">{formatCents(c.netEarnedCents)}</td>
                        <td className="px-5 py-3 text-right">{c.totalJobs}</td>
                        <td className="px-5 py-3">
                          {c.taxName ? (
                            <div>
                              <p className="text-xs text-[#d0d6e0]">{c.taxName}</p>
                              {c.einOrSsnLast4 && <p className="text-xs text-[#8a8f98]">****{c.einOrSsnLast4}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-[#fbbf24] font-medium">Missing</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {c.formGenerated ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#27a644]/10 text-[#34d399] rounded-full text-xs font-medium">
                              Generated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fbbf24]/10 text-[#fbbf24] rounded-full text-xs font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {!c.formGenerated && (
                            <button
                              onClick={() => handleGenerate1099(c.contractorId)}
                              disabled={generatingId === c.contractorId}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {generatingId === c.contractorId ? "..." : "Generate 1099"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
