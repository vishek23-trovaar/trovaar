"use client";

import { useState, useEffect } from "react";

interface ProtectionReport {
  fair_low: number;
  fair_high: number;
  price_note: string;
  upsell_warnings: string[];
  questions: string[];
  fair_includes: string[];
}

interface Bid {
  price: number; // cents
  status: string;
}

interface Props {
  jobId: string;
  category: string;
  title: string;
  description: string;
  location: string;
  bids: Bid[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ConsumerProtectPanel({ category, title, description, location, bids }: Props) {
  const [report, setReport] = useState<ProtectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"price" | "upsells" | "questions">("price");

  useEffect(() => {
    if (!category) return;
    // Delay slightly so page load isn't blocked
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/consumer-protect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, title, description, location }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) {
            setReport({
              ...data.report,
              fair_includes: Array.isArray(data.report.fair_includes) ? data.report.fair_includes : [],
              upsell_warnings: Array.isArray(data.report.upsell_warnings) ? data.report.upsell_warnings : [],
              questions: Array.isArray(data.report.questions) ? data.report.questions : [],
            });
          }
        }
      } catch { /* silent fallback */ }
      finally { setLoading(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [category, title, description, location]);

  // Compute bid analysis
  const pendingBids = bids.filter((b) => b.status !== "rejected");
  const fairLowCents  = report ? report.fair_low  * 100 : null;
  const fairHighCents = report ? report.fair_high * 100 : null;

  function bidLabel(priceCents: number): { text: string; cls: string } | null {
    if (!fairLowCents || !fairHighCents) return null;
    if (priceCents <= fairHighCents) {
      return { text: "Fair range", cls: "text-success bg-emerald-50" };
    }
    const over = ((priceCents - fairHighCents) / fairHighCents) * 100;
    if (over <= 30) {
      return { text: `~${Math.round(over)}% above fair`, cls: "text-amber-700 bg-amber-50" };
    }
    return { text: `${Math.round(over)}% over fair ⚠️`, cls: "text-danger bg-red-50" };
  }

  const overBids = pendingBids.filter((b) => {
    if (!fairHighCents) return false;
    return b.price > fairHighCents * 1.3;
  });

  if (!loading && !report) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-indigo-50/80 transition-colors"
      >
        <span className="text-lg">🛡️</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-indigo-900">Price Protect</p>
          <p className="text-xs text-indigo-500">Know what&apos;s fair before you accept</p>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && overBids.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            {overBids.length} bid{overBids.length > 1 ? "s" : ""} over
          </span>
        )}
        <svg
          className={`w-4 h-4 text-indigo-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-indigo-100">
          {loading && !report ? (
            <div className="px-4 py-6 text-center">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-indigo-500">Analyzing fair market price…</p>
            </div>
          ) : report ? (
            <>
              {/* Tab nav */}
              <div className="flex border-b border-indigo-100">
                {(["price", "upsells", "questions"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "text-indigo-700 border-b-2 border-indigo-600 bg-white"
                        : "text-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    {tab === "price" ? "💰 Fair Price" : tab === "upsells" ? "⚠️ Watch Out" : "❓ Ask First"}
                  </button>
                ))}
              </div>

              <div className="px-4 py-4">

                {/* Price tab */}
                {activeTab === "price" && (
                  <div className="space-y-4">
                    {/* Fair price range */}
                    <div>
                      <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-2">Fair Market Range</p>
                      <div className="flex items-end justify-between mb-1.5">
                        <div>
                          <p className="text-xs text-muted">Low</p>
                          <p className="text-2xl font-bold text-success">${report.fair_low.toLocaleString()}</p>
                        </div>
                        <div className="flex-1 mx-3 pb-1">
                          <div className="h-2 rounded-full bg-gradient-to-r from-success via-primary to-amber-500" />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted">High</p>
                          <p className="text-2xl font-bold text-amber-600">${report.fair_high.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 leading-relaxed">
                        💡 {report.price_note}
                      </p>
                    </div>

                    {/* Bid comparison */}
                    {pendingBids.length > 0 && (
                      <div>
                        <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-2">Your Bids vs. Fair Range</p>
                        <div className="space-y-1.5">
                          {pendingBids.map((bid, i) => {
                            const label = bidLabel(bid.price);
                            return (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-secondary">{fmt(bid.price)}</span>
                                {label && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${label.cls}`}>
                                    {label.text}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {overBids.length > 0 && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                            <span className="text-base shrink-0">⚠️</span>
                            <p className="text-xs text-danger leading-relaxed">
                              <span className="font-semibold">{overBids.length} bid{overBids.length > 1 ? "s are" : " is"} significantly above the fair market range.</span>{" "}
                              Consider getting more bids or asking the contractor to itemize their quote.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* What's included */}
                    <div>
                      <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-2">A Fair Quote Should Include</p>
                      <ul className="space-y-1.5">
                        {report.fair_includes.map((item, i) => (
                          <li key={i} className="flex gap-2 text-xs text-secondary">
                            <span className="text-success shrink-0 mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Upsell warnings tab */}
                {activeTab === "upsells" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      These are common add-ons that service providers in this category sometimes push — they may not be necessary for your specific job.
                    </p>
                    <ul className="space-y-2.5">
                      {report.upsell_warnings.map((warning, i) => (
                        <li key={i} className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                          <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-900 leading-relaxed">{warning}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions tab */}
                {activeTab === "questions" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      Ask these before authorizing any work. A trustworthy contractor will answer all of them without hesitation.
                    </p>
                    <ul className="space-y-2.5">
                      {report.questions.map((q, i) => (
                        <li key={i} className="flex gap-2.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                          <span className="text-indigo-500 font-bold text-sm shrink-0">{i + 1}.</span>
                          <p className="text-xs text-indigo-900 leading-relaxed">{q}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted text-center pt-1">
                      🔒 Never authorize work or pay before you have written answers.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
