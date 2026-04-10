"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

interface MaterialLine {
  description: string;
  quantity: string;
  unit_price: string;
}

interface EquipmentItem {
  name: string;
  status: "own" | "rent" | "purchase" | "borrow";
}

const EQUIPMENT_STATUS_OPTIONS: { value: EquipmentItem["status"]; label: string; color: string }[] = [
  { value: "own",      label: "I own it",          color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "rent",     label: "Renting",            color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "purchase", label: "Need to Purchase",   color: "text-orange-700 bg-orange-50 border-orange-200" },
  { value: "borrow",   label: "Need to Borrow",     color: "text-purple-700 bg-purple-50 border-purple-200" },
];

export default function SubmitBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<{ title: string; category?: string; description?: string; location?: string; photos?: string; ai_questions?: string; consumer_id?: string } | null>(null);

  // AI price estimate shown to contractor before bidding
  const [priceEstimate, setPriceEstimate] = useState<{ low: number; high: number; note: string } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Core bid fields
  const [price, setPrice] = useState("");
  const [laborPrice, setLaborPrice] = useState("");
  const [timelineDays, setTimelineDays] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [message, setMessage] = useState("");

  // Itemized materials
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [materials, setMaterials] = useState<MaterialLine[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  // Parts & supplies summary (always shown)
  const [partsSummary, setPartsSummary] = useState("");

  // Equipment list (always shown)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([
    { name: "", status: "own" },
  ]);

  // Portfolio gate — block bid form if fewer than 3 photos
  const [portfolioCount, setPortfolioCount] = useState<number | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  // Check portfolio count for the logged-in contractor
  useEffect(() => {
    if (!user || user.role !== "contractor") {
      setPortfolioLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/contractors/${user.id}/portfolio`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data.portfolio) ? data.portfolio : [];
          setPortfolioCount(items.length);
        } else {
          setPortfolioCount(0);
        }
      } catch {
        setPortfolioCount(0);
      } finally {
        setPortfolioLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then(async (d) => {
        const jobData = d.job;
        setJob(jobData);
        // Fetch AI price estimate for contractor guidance
        if (jobData?.category && jobData?.description) {
          setEstimateLoading(true);
          try {
            // Parse photos JSON if present
            let photos: string[] = [];
            try {
              if (jobData.photos) photos = JSON.parse(jobData.photos);
            } catch { /* ignore parse error */ }

            const res = await fetch("/api/ai/price-estimate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: jobData.category,
                title: jobData.title,
                description: jobData.description,
                location: jobData.location,
                photos,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setPriceEstimate(data.estimate);
            }
          } catch { /* silent — estimate is advisory only */ }
          finally { setEstimateLoading(false); }
        }
      });
  }, [id]);

  // Totals
  const materialsTotalCents = includeMaterials
    ? materials.reduce((sum, m) => {
        const qty = parseFloat(m.quantity) || 0;
        const up = parseFloat(m.unit_price) || 0;
        return sum + Math.round(qty * up * 100);
      }, 0)
    : 0;
  const laborCents = Math.round((parseFloat(laborPrice) || 0) * 100);
  const totalCents = includeMaterials
    ? laborCents + materialsTotalCents
    : Math.round((parseFloat(price) || 0) * 100);

  // Materials helpers
  function addMaterial() {
    setMaterials((prev) => [...prev, { description: "", quantity: "1", unit_price: "" }]);
  }
  function removeMaterial(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  }
  function updateMaterial(index: number, field: keyof MaterialLine, value: string) {
    setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  // Equipment helpers
  function addEquipment() {
    setEquipment((prev) => [...prev, { name: "", status: "own" }]);
  }
  function removeEquipment(index: number) {
    setEquipment((prev) => prev.filter((_, i) => i !== index));
  }
  function updateEquipment(index: number, field: keyof EquipmentItem, value: string) {
    setEquipment((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  // Equipment cost warnings
  const nonOwnedEquipment = equipment.filter((e) => e.name.trim() && e.status !== "own");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let finalPriceCents: number;
    let finalLaborCents: number | undefined;
    let materialsJson: string | undefined;

    if (includeMaterials) {
      if (!laborPrice || parseFloat(laborPrice) <= 0) {
        setError("Please enter a labor cost.");
        return;
      }
      const validMaterials = materials.filter(
        (m) => m.description.trim() && parseFloat(m.unit_price) > 0
      );
      finalLaborCents = laborCents;
      finalPriceCents = totalCents;
      if (validMaterials.length > 0) {
        materialsJson = JSON.stringify(
          validMaterials.map((m) => ({
            description: m.description.trim(),
            quantity: parseFloat(m.quantity) || 1,
            unit_price_cents: Math.round((parseFloat(m.unit_price) || 0) * 100),
            subtotal_cents: Math.round(
              (parseFloat(m.quantity) || 1) * (parseFloat(m.unit_price) || 0) * 100
            ),
            hd_search: `https://www.homedepot.com/s/${encodeURIComponent(m.description.trim())}`,
          }))
        );
      }
    } else {
      if (!price || parseFloat(price) <= 0) {
        setError("Please enter a bid price.");
        return;
      }
      finalPriceCents = Math.round(parseFloat(price) * 100);
    }

    // Serialize equipment — only include rows with a name
    const validEquipment = equipment.filter((e) => e.name.trim());
    const equipmentJson = validEquipment.length > 0 ? JSON.stringify(validEquipment) : undefined;

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: finalPriceCents,
          labor_cents: finalLaborCents,
          materials_json: materialsJson,
          parts_summary: partsSummary.trim() || undefined,
          equipment_json: equipmentJson,
          timeline_days: parseInt(timelineDays),
          availability_date: availabilityDate,
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bid");
      }

      router.push(`/jobs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Role guard: only contractors who don't own the job can bid
  if (user && user.role !== "contractor") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <Card className="p-8">
          <p className="text-lg font-semibold text-secondary mb-2">Contractors Only</p>
          <p className="text-sm text-muted mb-4">Only contractor accounts can submit bids on jobs.</p>
          <Button onClick={() => router.push(`/jobs/${id}`)}>Back to Job</Button>
        </Card>
      </div>
    );
  }

  if (user && job && user.id === job.consumer_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <Card className="p-8">
          <p className="text-lg font-semibold text-secondary mb-2">Cannot Bid on Your Own Job</p>
          <p className="text-sm text-muted mb-4">You cannot submit a bid on a job you created.</p>
          <Button onClick={() => router.push(`/jobs/${id}`)}>Back to Job</Button>
        </Card>
      </div>
    );
  }

  // Portfolio gate: require 3+ portfolio photos before bidding
  if (!portfolioLoading && portfolioCount !== null && portfolioCount < 3) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <Card className="p-8">
          <div className="text-4xl mb-4">📸</div>
          <p className="text-lg font-semibold text-secondary mb-2">Portfolio Required</p>
          <p className="text-sm text-muted mb-2">
            You need at least <strong>3 portfolio photos</strong> before you can bid on jobs.
          </p>
          <p className="text-sm text-muted mb-6">
            You currently have <strong>{portfolioCount}</strong> photo{portfolioCount !== 1 ? "s" : ""}. Upload examples of your past work to build trust with clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push("/contractor/profile?tab=portfolio")}>
              📷 Add Portfolio Photos
            </Button>
            <Button variant="outline" onClick={() => router.push(`/jobs/${id}`)}>
              Back to Job
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary mb-2">Submit Your Bid</h1>
      {job && <p className="text-muted mb-6">For: <strong>{job.title}</strong></p>}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-7">
          {error && (
            <div role="alert" aria-live="polite" className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}

          {/* ── AI Price Intelligence banner ── */}
          {(estimateLoading || priceEstimate) && (
            <div className={`rounded-xl border px-4 py-3 ${estimateLoading ? "border-border bg-surface animate-pulse" : "border-indigo-200 bg-indigo-50"}`}>
              {estimateLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <svg className="animate-spin w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing similar jobs to give you a market rate…
                </div>
              ) : priceEstimate ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-600 font-semibold text-sm">🤖 Market Rate Insight</span>
                    <span className="text-xs text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded-full">Only you see this</span>
                  </div>
                  <p className="text-indigo-900 font-semibold text-lg">
                    ${priceEstimate.low.toLocaleString()} – ${priceEstimate.high.toLocaleString()}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">{priceEstimate.note}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Pricing mode toggle ── */}
          <div>
            <span className="block text-sm font-medium text-secondary mb-3">Bid Type *</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIncludeMaterials(false)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  !includeMaterials
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/40"
                }`}
              >
                <div className="font-semibold mb-0.5">💰 Flat Rate</div>
                <div className="text-xs font-normal text-muted">Single all-in price (labor + materials combined)</div>
              </button>
              <button
                type="button"
                onClick={() => setIncludeMaterials(true)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  includeMaterials
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/40"
                }`}
              >
                <div className="font-semibold mb-0.5">🧾 Itemized</div>
                <div className="text-xs font-normal text-muted">Separate labor + materials line items</div>
              </button>
            </div>
          </div>

          {/* ── Flat rate ── */}
          {!includeMaterials && (
            <div>
              <label htmlFor="bid-price" className="block text-sm font-medium text-secondary mb-1.5">Total Price ($) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
                <input
                  id="bid-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required={!includeMaterials}
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
                />
              </div>
              <p className="text-xs text-muted mt-1">
                This is your all-in price. You keep 80% — Trovaar keeps 20%.
              </p>
            </div>
          )}

          {/* ── Itemized: labor + materials ── */}
          {includeMaterials && (
            <div className="space-y-5">
              {/* Labor */}
              <div>
                <label htmlFor="bid-labor" className="block text-sm font-medium text-secondary mb-1.5">Labor Cost ($) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
                  <input
                    id="bid-labor"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={laborPrice}
                    onChange={(e) => setLaborPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
                  />
                </div>
              </div>

              {/* Materials list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-secondary">Materials Estimate</label>
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Subject to change — client approval required
                  </span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 px-3 py-2 bg-surface text-xs font-semibold text-muted border-b border-border">
                    <span>Material / Item</span>
                    <span>Qty</span>
                    <span>Unit Cost</span>
                    <span />
                  </div>

                  {materials.map((m, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_80px_100px_32px] gap-2 px-3 py-2 border-b border-border last:border-0 items-center"
                    >
                      <input
                        type="text"
                        value={m.description}
                        onChange={(e) => updateMaterial(i, "description", e.target.value)}
                        placeholder="e.g. 1/2 copper pipe"
                        className="text-sm px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-white"
                      />
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={m.quantity}
                        onChange={(e) => updateMaterial(i, "quantity", e.target.value)}
                        className="text-sm px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white text-center"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={m.unit_price}
                          onChange={(e) => updateMaterial(i, "unit_price", e.target.value)}
                          placeholder="0.00"
                          className="text-sm pl-5 pr-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 bg-white w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMaterial(i)}
                        disabled={materials.length === 1}
                        className="text-muted hover:text-danger transition-colors disabled:opacity-30 cursor-pointer text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div className="px-3 py-2 bg-surface/60 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={addMaterial}
                      className="text-sm text-primary hover:underline cursor-pointer font-medium"
                    >
                      + Add material line
                    </button>
                    <a
                      href="https://www.homedepot.com/s/supplies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:underline"
                    >
                      🏠 Browse Home Depot
                    </a>
                  </div>
                </div>

                <p className="text-xs text-muted mt-1.5">
                  Material prices are estimates and subject to change. Any adjustments require client approval via a change order.
                </p>
              </div>

              {/* Total summary */}
              <div className="rounded-xl bg-surface border border-border p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Labor</span>
                  <span className="font-medium">${(laborCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Materials (est.)</span>
                  <span className="font-medium">${(materialsTotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-1.5 font-semibold text-secondary">
                  <span>Total Estimate</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted pt-1">
                  You keep <strong>${((totalCents * 0.8) / 100).toFixed(2)}</strong> (80%) — Trovaar fee: ${((totalCents * 0.2) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* ── Parts & Supplies Summary ── */}
          <div>
            <label htmlFor="bid-parts" className="block text-sm font-medium text-secondary mb-1.5">
              📦 Parts &amp; Supplies Needed
              <span className="ml-1.5 text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              id="bid-parts"
              value={partsSummary}
              onChange={(e) => setPartsSummary(e.target.value)}
              placeholder={`Briefly describe the parts or supplies required for this job.\n\nExample: Fiberglass mat, resin, gel coat (matching hull color), sandpaper (80–220 grit), acetone for prep. Will need to color-match the existing finish.`}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm"
            />
            <p className="text-xs text-muted mt-1">
              This gives the client a clear picture of what goes into the job before they accept your bid.
            </p>
          </div>

          {/* ── Equipment Needed ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-secondary">
                🔧 Equipment Needed
                <span className="ml-1.5 text-muted font-normal text-xs">(optional)</span>
              </label>
            </div>

            {nonOwnedEquipment.length > 0 && (
              <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ You have equipment you need to{" "}
                {nonOwnedEquipment.some((e) => e.status === "rent") && "rent"}
                {nonOwnedEquipment.some((e) => e.status === "rent") &&
                  nonOwnedEquipment.some((e) => e.status !== "rent") &&
                  " / "}
                {nonOwnedEquipment.some((e) => e.status === "purchase") && "purchase"}
                {nonOwnedEquipment.some((e) => e.status === "purchase") &&
                  nonOwnedEquipment.some((e) => e.status === "borrow") &&
                  " / "}
                {nonOwnedEquipment.some((e) => e.status === "borrow") && "borrow"}.
                {" "}Make sure any associated costs are reflected in your bid price.
              </div>
            )}

            <div className="rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_160px_32px] gap-2 px-3 py-2 bg-surface text-xs font-semibold text-muted border-b border-border">
                <span>Equipment / Tool</span>
                <span>Availability</span>
                <span />
              </div>

              {equipment.map((eq, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_160px_32px] gap-2 px-3 py-2 border-b border-border last:border-0 items-center"
                >
                  <input
                    type="text"
                    value={eq.name}
                    onChange={(e) => updateEquipment(i, "name", e.target.value)}
                    placeholder="e.g. angle grinder, orbital sander"
                    className="text-sm px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-white"
                  />
                  <select
                    value={eq.status}
                    onChange={(e) => updateEquipment(i, "status", e.target.value)}
                    className={`text-xs px-2 py-1.5 rounded border font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 ${
                      EQUIPMENT_STATUS_OPTIONS.find((o) => o.value === eq.status)?.color ?? ""
                    }`}
                  >
                    {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeEquipment(i)}
                    disabled={equipment.length === 1}
                    className="text-muted hover:text-danger transition-colors disabled:opacity-30 cursor-pointer text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="px-3 py-2 bg-surface/60">
                <button
                  type="button"
                  onClick={addEquipment}
                  className="text-sm text-primary hover:underline cursor-pointer font-medium"
                >
                  + Add equipment
                </button>
              </div>
            </div>

            <p className="text-xs text-muted mt-1.5">
              List any tools or equipment this job requires. Helps the client understand your readiness and any rental/purchase overhead built into the bid.
            </p>
          </div>

          {/* ── Timeline + Availability ── */}
          <Input
            id="bid-timeline"
            label="Estimated Timeline (days)"
            type="number"
            min="1"
            value={timelineDays}
            onChange={(e) => setTimelineDays(e.target.value)}
            placeholder="How many days to complete?"
            required
          />

          <Input
            id="bid-availability"
            label="Earliest Available Date"
            type="date"
            min={today}
            value={availabilityDate}
            onChange={(e) => setAvailabilityDate(e.target.value)}
            required
          />

          {/* ── Message ── */}
          <div>
            <label htmlFor="bid-message" className="block text-sm font-medium text-secondary mb-1.5">
              Message <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="bid-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, mention relevant experience, note anything about the job scope, or ask questions."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Submit Bid{includeMaterials && totalCents > 0 ? ` — $${(totalCents / 100).toFixed(2)}` : ""}
          </Button>
        </form>
      </Card>
    </div>
  );
}
