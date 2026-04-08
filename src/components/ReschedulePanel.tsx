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
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-2">
        <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
        <span className="text-sm text-gray-500">Loading reschedule info...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">Schedule</h3>

      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">Current date: </span>
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Contractor view */}
      {role === "contractor" && !pendingRequest && (
        <>
          {!showForm ? (
            <button
              onClick={() => { setShowForm(true); setSuccessMsg(null); }}
              className="w-full py-2 px-4 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Propose New Date
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Proposed Date
                </label>
                <input
                  type="date"
                  value={proposedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you need to reschedule..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
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
            <p className="mt-0.5 text-amber-700">Reason: {pendingRequest.reason}</p>
          )}
          <p className="mt-1 text-xs text-amber-600">Waiting for customer response...</p>
        </div>
      )}

      {/* Consumer view — pending request to respond to */}
      {role === "consumer" && pendingRequest && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Contractor requested a reschedule</p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Proposed date: </span>
              {new Date(pendingRequest.proposed_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {pendingRequest.reason && (
              <p className="text-sm text-gray-600 mt-1">
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
              className="flex-1 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* Consumer view — no pending request */}
      {role === "consumer" && !pendingRequest && (
        <p className="text-xs text-gray-500">No reschedule requests pending.</p>
      )}
    </div>
  );
}
