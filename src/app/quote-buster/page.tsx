"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { CATEGORY_GROUPS } from "@/lib/constants";

interface QuoteBustResult {
  originalQuote: number;
  estimatedFairLow: number;
  estimatedFairHigh: number;
  savingsLow: number;
  savingsHigh: number;
  savingsPercentLow: number;
  savingsPercentHigh: number;
  breakdown: string;
  tips: string[];
}

export default function QuoteBusterPage() {
  const [category, setCategory] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [description, setDescription] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quotePreview, setQuotePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteBustResult | null>(null);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or PDF file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB");
      return;
    }

    setQuoteFile(file);
    setError("");

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setQuotePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setQuotePreview(null); // PDF — no preview
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const amount = parseFloat(quoteAmount.replace(/[,$]/g, ""));
    if (!category) { setError("Please select a service category"); return; }
    if (!amount || amount <= 0) { setError("Please enter a valid quote amount"); return; }
    if (!quoteFile) { setError("Please upload a photo or PDF of your quote"); return; }

    setLoading(true);
    let quoteImageUrl: string | undefined;

    try {
      // Upload the quote document first
      setUploading(true);
      const formData = new FormData();
      formData.append("file", quoteFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Failed to upload quote document");
      const { url } = await uploadRes.json();
      quoteImageUrl = url;
      setUploading(false);

      // Now analyze it
      const res = await fetch("/api/ai/quote-bust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, quoteAmount: amount, description, zipCode, quoteImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze quote");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  function buildPostJobUrl() {
    const params = new URLSearchParams({ template: "1" });
    if (category) params.set("category", category);
    if (description) params.set("description", description);
    if (result) {
      params.set("budget_range", `${formatCurrency(result.estimatedFairLow)} – ${formatCurrency(result.estimatedFairHigh)}`);
    }
    if (zipCode) params.set("location", zipCode);
    return `/jobs/new?${params.toString()}`;
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white py-16 sm:py-20"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1d4ed8 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-sm">
            <span className="text-xl">💰</span>
            <span className="text-slate-200">Free price comparison tool</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Quote Buster
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
            Got a quote from a big company? Find out how much you could save
            with a skilled local pro on Trovaar.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Form */}
          <ScrollReveal delay={100}>
          <div>
            <h2 className="text-xl font-bold text-secondary mb-1">Enter your quote</h2>
            <p className="text-sm text-muted mb-6">Upload the actual quote document and we&apos;ll compare it against real local pro rates.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
              )}

              {/* Quote Document Upload */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Upload your quote <span className="text-danger">*</span>
                </label>
                <p className="text-xs text-muted mb-3">
                  Upload a photo or PDF of the actual quote you received. No word-of-mouth — we need the real document.
                </p>
                {!quoteFile ? (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-secondary">Click to upload quote</span>
                    <span className="text-xs text-muted">JPG, PNG, or PDF — max 20MB</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    {quotePreview ? (
                      <div className="relative">
                        <img src={quotePreview} alt="Quote preview" className="w-full max-h-48 object-contain bg-slate-50" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 text-xs font-bold">PDF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary truncate">{quoteFile.name}</p>
                          <p className="text-xs text-muted">{(quoteFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-white">
                      <span className="text-xs text-muted truncate">{quoteFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setQuoteFile(null); setQuotePreview(null); }}
                        className="text-xs text-danger hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-secondary mb-1.5">Service Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary transition-colors"
                >
                  <option value="">Select a category...</option>
                  {CATEGORY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={`${group.icon} ${group.label}`}>
                      {group.categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Quote Amount */}
              <div>
                <label htmlFor="quoteAmount" className="block text-sm font-medium text-secondary mb-1.5">Quote Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
                  <input
                    id="quoteAmount"
                    type="text"
                    inputMode="decimal"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="e.g. 2,500"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted transition-colors"
                  />
                </div>
              </div>

              {/* Description (optional) */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-secondary mb-1.5">
                  Describe the work <span className="text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. Replace water heater, 50-gallon tank, includes removal of old unit"
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted transition-colors resize-none"
                />
              </div>

              {/* ZIP Code (optional) */}
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-secondary mb-1.5">
                  ZIP Code <span className="text-muted font-normal">(optional — for regional pricing)</span>
                </label>
                <input
                  id="zipCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 90210"
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted transition-colors"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {uploading ? "Uploading document..." : loading ? "Analyzing your quote..." : "Bust My Quote"}
              </Button>
            </form>
          </div>

          </ScrollReveal>

          {/* Results */}
          <ScrollReveal delay={200} direction="right">
          <div>
            {!result && !loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16 px-6">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-secondary mb-2">See your potential savings</h3>
                  <p className="text-sm text-muted max-w-xs mx-auto">
                    Upload the actual quote you received from a big company and we&apos;ll
                    analyze it against real local pro rates.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted">{uploading ? "Uploading your quote..." : "AI is reading your quote and comparing market rates..."}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                {/* Savings headline */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center shadow-sm">
                  <p className="text-sm font-medium text-green-700 mb-1">You could save up to</p>
                  <p className="text-4xl sm:text-5xl font-extrabold text-green-600 mb-1">
                    {formatCurrency(result.savingsHigh)}
                  </p>
                  {result.savingsPercentHigh > 0 && (
                    <p className="text-lg font-bold text-green-500">
                      That&apos;s {result.savingsPercentLow}–{result.savingsPercentHigh}% less
                    </p>
                  )}
                </div>

                {/* Price comparison bar */}
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-semibold text-secondary mb-4">Price Comparison</h3>

                  {/* Their quote */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted">Big company quote</span>
                      <span className="font-bold text-red-500">{formatCurrency(result.originalQuote)}</span>
                    </div>
                    <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  {/* Fair range */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted">Local pro estimate</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(result.estimatedFairLow)} – {formatCurrency(result.estimatedFairHigh)}
                      </span>
                    </div>
                    <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.round((result.estimatedFairHigh / result.originalQuote) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-slate-50 border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-secondary mb-2">Why the difference?</h3>
                  <p className="text-sm text-muted leading-relaxed">{result.breakdown}</p>
                </div>

                {/* Tips */}
                {result.tips.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-blue-800 mb-3">Pro tips</h3>
                    <ul className="space-y-2">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                          <span className="text-blue-400 mt-0.5">✓</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 text-center text-white">
                  <h3 className="text-lg font-bold mb-2">Ready to save?</h3>
                  <p className="text-sm text-blue-100 mb-4">
                    Post your job on Trovaar and let verified local pros compete for your business.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href={buildPostJobUrl()}>
                      <Button variant="white" size="lg" className="w-full sm:w-auto">
                        Post a Job — It&apos;s Free
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
