"use client";

import { useState, useEffect, useCallback } from "react";

interface ScheduleChangeRequest {
  id: string;
  job_id: string;
  bid_id: string;
  requested_by: string;
  proposed_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

interface ReschedulePanelProps {
  jobId: string;
  bidId: string;
  role: "consumer" | "contractor";
  currentDate: string;
  onRescheduled: () => void;
}

export default function ReschedulePanel({
  jobId,
  bidId,
  role,
  currentDate,
  onRescheduled,
}: ReschedulePanelProps) {
  const [pendingRequest, setPendingRequest] = useState<ScheduleChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [proposedDate, setProposedDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPendingRequest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/reschedule`);
      if (res.ok) {
        const data = await res.json() as { request: ScheduleChangeRequest | null };
        setPendingRequest(data.request);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchPendingRequest();
  }, [fetchPendingRequest]);

  async function handlePropose() {
    if (!proposedDate) {
      setError("Please select a proposed date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, proposedDate, reason: reason || undefined }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to propose reschedule");
        return;
      }
      setSuccessMsg("Reschedule proposal sent to the customer.");
      setShowForm(false);
      setProposedDate("");
      setReason("");
      await fetchPendingRequest();
      onRescheduled();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResponse(action: "accept" | "reject") {
    if (!pendingRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: pendingRequest.id, action }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to process request");
        return;
      }
      setSuccessMsg(
        action === "accept"
          ? "Reschedule accepted. The new date has been confirmed."
          : "Reschedule rejected. The contractor will be notified."
      );
      setPendingRequest(null);
      onRescheduled();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-4 flex items-center gap-2">
        <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
        <span className="text-sm text-[#8a8f98]">Loading reschedule info...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-5 space-y-3">
      <h3 className="text-sm font-bold text-[#f7f8f8]">Schedule</h3>

      <p className="text-sm text-[#8a8f98]">
        <span className="font-medium text-[#d0d6e0]">Current date: </span>
        {currentDate
          ? new Date(currentDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "Not set"}
      </p>

      {/* Success message */}
      {successMsg && (
        <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg p-3 text-sm text-[#34d399]">
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg p-3 text-sm text-[#f87171]">
          {error}
        </div>
      )}

      {/* Contractor view */}
      {role === "contractor" && !pendingRequest && (
        <>
          {!showForm ? (
            <button
              onClick={() => { setShowForm(true); setSuccessMsg(null); }}
              className="w-full py-2 px-4 text-sm font-semibold bg-[#141516] text-[#d0d6e0] rounded-lg hover:bg-[#18191a] transition-colors"
            >
              Propose New Date
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">
                  Proposed Date
                </label>
                <input
                  type="date"
                  value={proposedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you need to reschedule..."
                  rows={3}
                  className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePropose}
                  disabled={submitting}
                  className="flex-1 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit Proposal"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="px-4 py-2 text-sm font-semibold bg-[#141516] text-[#d0d6e0] rounded-lg hover:bg-[#18191a] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Contractor view — pending proposal already exists */}
      {role === "contractor" && pendingRequest && (
        <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-lg p-3 text-sm text-[#fbbf24]">
          <p className="font-semibold">Reschedule proposal pending</p>
          <p className="mt-1">
            Proposed:{" "}
            {new Date(pendingRequest.proposed_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {pendingRequest.reason && (
            <p className="mt-0.5 text-[#fbbf24]/80">Reason: {pendingRequest.reason}</p>
          )}
          <p className="mt-1 text-xs text-[#fbbf24]/70">Waiting for customer response...</p>
        </div>
      )}

      {/* Consumer view — pending request to respond to */}
      {role === "consumer" && pendingRequest && (
        <div className="space-y-3">
          <div className="bg-[#141516] border border-[#23252a] rounded-lg p-4">
            <p className="text-sm font-semibold text-[#d0d6e0] mb-1">Contractor requested a reschedule</p>
            <p className="text-sm text-[#d0d6e0]">
              <span className="font-medium">Proposed date: </span>
              {new Date(pendingRequest.proposed_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {pendingRequest.reason && (
              <p className="text-sm text-[#8a8f98] mt-1">
                <span className="font-medium">Reason: </span>
                {pendingRequest.reason}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleResponse("accept")}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Accept"}
            </button>
            <button
              onClick={() => handleResponse("reject")}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-semibold bg-[#f87171]/10 text-[#f87171] rounded-lg hover:bg-[#f87171]/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* Consumer view — no pending request */}
      {role === "consumer" && !pendingRequest && (
        <p className="text-xs text-[#8a8f98]">No reschedule requests pending.</p>
      )}
    </div>
  );
}
