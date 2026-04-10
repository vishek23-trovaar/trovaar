"use client";

import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Receipt {
  id: string;
  job_id: string;
  contractor_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  description: string | null;
  amount_cents: number | null;
  receipt_type: string;
  created_at: string;
  contractor_name: string;
}

interface Props {
  jobId: string;
  isContractor: boolean;
  canUpload: boolean; // contractor with accepted bid and job is active
}

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  receipt: "🧾 Receipt",
  invoice: "📄 Invoice",
  estimate: "📋 Estimate",
  other: "📎 Document",
};

export function ReceiptsPanel({ jobId, isContractor, canUpload }: Props) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptType, setReceiptType] = useState("receipt");
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReceipts();
  }, [jobId]);

  async function fetchReceipts() {
    try {
      const res = await fetch(`/api/jobs/${jobId}/receipts`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError("Please select a file."); return; }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { setError("File too large (max 10MB)."); return; }

    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) { setError("Only image files and PDFs are accepted."); return; }

    setUploading(true);
    try {
      // Upload file via existing upload API
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        throw new Error(d.error || "Upload failed");
      }
      const { url } = await uploadRes.json();

      // Save receipt record
      const res = await fetch(`/api/jobs/${jobId}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: url,
          file_name: file.name,
          file_type: file.type === "application/pdf" ? "pdf" : "image",
          description: description.trim() || undefined,
          amount_cents: amount ? Math.round(parseFloat(amount) * 100) : undefined,
          receipt_type: receiptType,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save receipt");
      }

      setSuccess("Receipt uploaded successfully.");
      setDescription("");
      setAmount("");
      setReceiptType("receipt");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
      await fetchReceipts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(receiptId: string) {
    if (!confirm("Delete this receipt?")) return;
    try {
      await fetch(`/api/jobs/${jobId}/receipts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: receiptId }),
      });
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    } catch { /* silent */ }
  }

  const totalCents = receipts.reduce((sum, r) => sum + (r.amount_cents || 0), 0);

  if (loading) return <div className="py-6 text-center text-muted text-sm">Loading receipts…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-secondary">Receipts &amp; Invoices</h3>
          {receipts.length > 0 && totalCents > 0 && (
            <p className="text-xs text-muted mt-0.5">
              {receipts.length} document{receipts.length !== 1 ? "s" : ""} · Total: <strong className="text-secondary">${(totalCents / 100).toFixed(2)}</strong>
            </p>
          )}
        </div>
        {canUpload && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Upload
          </Button>
        )}
      </div>

      {/* Upload form */}
      {canUpload && showForm && (
        <Card className="p-4 border-2 border-primary/20 bg-primary/5">
          <p className="text-sm font-semibold text-secondary mb-3">Upload Receipt or Invoice</p>
          {error && <p className="text-danger text-xs mb-2 bg-red-50 rounded p-2">{error}</p>}
          <form onSubmit={handleUpload} className="space-y-3">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Document Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(RECEIPT_TYPE_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setReceiptType(val)}
                    className={`text-xs py-1.5 px-2 rounded-lg border-2 transition-all cursor-pointer ${
                      receiptType === val
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-border text-muted hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* File picker */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">File *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                required
                className="block w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              <p className="text-xs text-muted mt-1">Any image format or PDF · max 10MB</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. PVC pipe and fittings from Home Depot"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Amount (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={uploading} size="sm">
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(""); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg border border-green-200">
          ✅ {success}
        </div>
      )}

      {/* Receipt list */}
      {receipts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-muted text-sm">No receipts uploaded yet.</p>
          {canUpload && (
            <p className="text-xs text-muted mt-1">Upload receipts and invoices to document job expenses.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface hover:bg-white transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 text-xl">
                {receipt.file_type === "pdf" ? "📄" : "🖼️"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-secondary">
                        {RECEIPT_TYPE_LABELS[receipt.receipt_type] ?? "📎 Document"}
                      </span>
                      {receipt.amount_cents && receipt.amount_cents > 0 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          ${(receipt.amount_cents / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {receipt.description && (
                      <p className="text-xs text-muted mt-0.5 truncate">{receipt.description}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(receipt.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                      {!isContractor && ` · by ${receipt.contractor_name}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={receipt.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      View
                    </a>
                    {isContractor && (
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        className="text-xs text-muted hover:text-danger px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete receipt"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
