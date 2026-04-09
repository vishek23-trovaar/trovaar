"use client";

import { useState, useEffect } from "react";

interface PriceEstimate {
  low: number;
  high: number;
  note: string;
}

interface Props {
  category: string;
  title: string;
  description: string;
  location: string;
  photos?: string[];
}

export function AiPriceEstimate({ category, title, description, location, photos }: Props) {
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!category || !description?.trim()) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/price-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, title, description, location, photos }),
        });
        if (res.ok) {
          const data = await res.json();
          setEstimate(data.estimate);
        }
      } catch { /* silent fallback */ }
      finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [category, title, description, location, photos]);

  if (!loading && !estimate) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-emerald-50/80 transition-colors"
      >
        <span className="text-lg">💰</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-emerald-900">AI Price Estimate</p>
          <p className="text-xs text-emerald-500">What this job typically costs</p>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        )}
        <svg
          className={`w-4 h-4 text-emerald-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-emerald-100">
          {loading && !estimate ? (
            <div className="px-4 py-6 text-center">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-emerald-500">Estimating fair price range...</p>
            </div>
          ) : estimate ? (
            <div className="px-4 py-4 space-y-4">
              {/* Price range bar */}
              <div>
                <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide mb-2">Estimated Range</p>
                <div className="flex items-end justify-between mb-1.5">
                  <div>
                    <p className="text-xs text-muted">Low</p>
                    <p className="text-2xl font-bold text-success">${estimate.low.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 mx-3 pb-1">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-amber-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">High</p>
                    <p className="text-2xl font-bold text-amber-600">${estimate.high.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              {estimate.note && (
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 leading-relaxed">
                  {estimate.note}
                </p>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-muted text-center leading-snug">
                AI estimate based on typical US rates. Actual prices may vary by location, materials, and job complexity.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
