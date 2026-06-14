"use client";

import { useState } from "react";

interface AdminJob {
  id: string;
  title: string;
  status: string;
  urgency: string;
  category: string;
  location: string;
}

interface Props {
  job: AdminJob;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: "posted", label: "Posted" },
  { value: "bidding", label: "Bidding" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

export default function EditJobModal({ job, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(job.title ?? "");
  const [status, setStatus] = useState(job.status ?? "posted");
  const [urgency, setUrgency] = useState(job.urgency ?? "medium");
  const [category, setCategory] = useState(job.category ?? "");
  const [location, setLocation] = useState(job.location ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          fields: { title, status, urgency, category, location },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-[#0f1011] h-full shadow-2xl flex flex-col"
        style={{ width: 420 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252a]">
          <h2 className="text-base font-semibold text-[#d0d6e0]">Edit Job</h2>
          <button
            onClick={onClose}
            className="text-[#8a8f98] hover:text-[#d0d6e0] transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Job title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-[#141516] text-[#f7f8f8]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-[#141516] text-[#f7f8f8]"
            >
              {URGENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. plumbing, electrical"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="City, State"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#23252a] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[#8a8f98] bg-[#141516] rounded-lg hover:bg-[#18191a] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
