"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface MaterialLine {
  description: string;
  quantity: string;
  unit_price: string;
}

export default function NewChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [materials, setMaterials] = useState<MaterialLine[]>([{ description: "", quantity: "1", unit_price: "" }]);
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const materialsTotalCents = includeMaterials
    ? materials.reduce((sum, m) => {
        const qty = parseFloat(m.quantity) || 0;
        const up = parseFloat(m.unit_price) || 0;
        return sum + Math.round(qty * up * 100);
      }, 0)
    : 0;

  const additionalCostCents = includeMaterials
    ? materialsTotalCents
    : Math.round((parseFloat(additionalCost) || 0) * 100);

  function addMaterial() {
    setMaterials((prev) => [...prev, { description: "", quantity: "1", unit_price: "" }]);
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMaterial(index: number, field: keyof MaterialLine, value: string) {
    setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setLoading(true);
    try {
      let materialsJson: string | undefined;
      if (includeMaterials) {
        const valid = materials.filter((m) => m.description.trim() && parseFloat(m.unit_price) > 0);
        if (valid.length > 0) {
          materialsJson = JSON.stringify(valid.map((m) => ({
            description: m.description.trim(),
            quantity: parseFloat(m.quantity) || 1,
            unit_price_cents: Math.round((parseFloat(m.unit_price) || 0) * 100),
            subtotal_cents: Math.round((parseFloat(m.quantity) || 1) * (parseFloat(m.unit_price) || 0) * 100),
            hd_search: `https://www.homedepot.com/s/${encodeURIComponent(m.description.trim())}`,
          })));
        }
      }

      const res = await fetch(`/api/jobs/${id}/change-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          additional_cost_cents: additionalCostCents,
          materials_json: materialsJson,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit change order");
      }

      router.push(`/jobs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <ScrollReveal>
      <Link href={`/jobs/${id}`} className="text-sm text-muted hover:text-secondary flex items-center gap-1 mb-4">
        ← Back to job
      </Link>
      <h1 className="text-2xl font-bold text-secondary mb-1">Submit Change Order</h1>
      <p className="text-muted mb-8 text-sm">
        Use a change order when additional work or materials are required beyond the original bid. The consumer must approve before you proceed.
      </p>
      </ScrollReveal>

      <ScrollReveal delay={100}>
      <Card className="p-6 space-y-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
        {error && <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ <strong>Important:</strong> Work requiring this change order must <strong>not</strong> proceed until the consumer approves it.
          Submitting means you've identified new scope, not that you've already done the work.
        </div>

        <Input
          label="Change Order Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Additional wall damage behind tile"
          required
        />

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what was discovered, why additional work/materials are needed, and how it affects the job."
            rows={4}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
          />
        </div>

        {/* Cost type toggle */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Additional Cost</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button type="button" onClick={() => setIncludeMaterials(false)}
              className={`py-2 px-3 rounded-lg border-2 text-sm transition-all ${!includeMaterials ? "border-primary bg-primary/5 text-primary" : "border-border text-muted"}`}>
              Flat Amount
            </button>
            <button type="button" onClick={() => setIncludeMaterials(true)}
              className={`py-2 px-3 rounded-lg border-2 text-sm transition-all ${includeMaterials ? "border-primary bg-primary/5 text-primary" : "border-border text-muted"}`}>
              Materials List
            </button>
          </div>

          {!includeMaterials && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={additionalCost}
                onChange={(e) => setAdditionalCost(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>
          )}

          {includeMaterials && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_70px_100px_28px] gap-2 px-3 py-2 bg-surface text-xs font-semibold text-muted border-b border-border">
                <span>Item</span><span>Qty</span><span>Unit Cost</span><span />
              </div>
              {materials.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_28px] gap-2 px-3 py-2 border-b border-border last:border-0 items-center">
                  <input type="text" value={m.description} onChange={(e) => updateMaterial(i, "description", e.target.value)}
                    placeholder="Material description"
                    className="text-sm px-2 py-1.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <input type="number" min="1" step="0.5" value={m.quantity} onChange={(e) => updateMaterial(i, "quantity", e.target.value)}
                    className="text-sm px-2 py-1.5 rounded border border-border bg-white text-center focus:outline-none" />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                    <input type="number" min="0" step="0.01" value={m.unit_price} onChange={(e) => updateMaterial(i, "unit_price", e.target.value)}
                      placeholder="0.00"
                      className="text-sm pl-5 pr-2 py-1.5 rounded border border-border bg-white w-full focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => removeMaterial(i)} disabled={materials.length === 1}
                    className="text-muted hover:text-danger disabled:opacity-30 cursor-pointer text-lg leading-none">×</button>
                </div>
              ))}
              <div className="px-3 py-2 bg-surface/60">
                <button type="button" onClick={addMaterial} className="text-sm text-primary hover:underline cursor-pointer font-medium">
                  + Add material
                </button>
                <a href="https://www.homedepot.com" target="_blank" rel="noopener noreferrer"
                  className="ml-4 text-xs text-orange-600 hover:underline">🏠 Browse Home Depot</a>
              </div>
              {materialsTotalCents > 0 && (
                <div className="px-3 py-2 border-t border-border bg-surface text-sm font-semibold flex justify-between">
                  <span>Materials Total</span>
                  <span>${(materialsTotalCents / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {additionalCostCents > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            This change order adds <strong>${(additionalCostCents / 100).toFixed(2)}</strong> to the job total. Consumer approval is required.
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg" onClick={handleSubmit}>
          Submit Change Order for Approval
        </Button>
      </Card>
      </ScrollReveal>
    </div>
  );
}
