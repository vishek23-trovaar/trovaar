"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface UserDispute {
  id: string;
  job_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_status: string | null;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_status: string;
  consumer_id: string;
  consumer_name: string;
  contractor_name: string | null;
  contractor_id: string | null;
  bid_price: number | null;
  resolution_type: string | null;
  client_refund_cents: number | null;
  contractor_payout_cents: number | null;
  client_accepted: number | null;
  contractor_accepted: number | null;
  final_resolution: number | null;
  admin_notes: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    investigating: "bg-amber-100 text-amber-700",
    resolved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-slate-100 text-slate-600",
    proposed: "bg-blue-100 text-blue-700",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDollars(cents: number | null): string {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(str: string): string {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// Timeline step component
function TimelineStep({
  label,
  date,
  active,
  completed,
  last,
}: {
  label: string;
  date?: string;
  active: boolean;
  completed: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full border-2 ${
            completed
              ? "bg-emerald-500 border-emerald-500"
              : active
              ? "bg-indigo-500 border-indigo-500"
              : "bg-white border-slate-300"
          }`}
        />
        {!last && <div className={`w-0.5 h-6 ${completed ? "bg-emerald-300" : "bg-slate-200"}`} />}
      </div>
      <div className="-mt-0.5">
        <p className={`text-sm font-medium ${completed ? "text-emerald-700" : active ? "text-indigo-700" : "text-slate-400"}`}>
          {label}
        </p>
        {date && <p className="text-xs text-slate-400">{date}</p>}
      </div>
    </div>
  );
}

export default function UserDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<UserDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  async function fetchDisputes() {
    setLoading(true);
    try {
      const res = await fetch("/api/disputes/my");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function handleResolutionAction(disputeId: string, action: "accept" | "reject") {
    setAccepting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/resolution`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed");
      } else {
        setActionSuccess(
          action === "accept"
            ? "You accepted the resolution."
            : "You rejected the resolution. The admin will be notified."
        );
        await fetchDisputes();
      }
    } catch {
      setActionError("Something went wrong.");
    } finally {
      setAccepting(false);
    }
  }

  const selected = disputes.find((d) => d.id === selectedId) || null;

  const myFiled = disputes.filter((d) => d.reporter_id === user?.id);
  const againstMe = disputes.filter((d) => d.reporter_id !== user?.id);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">Please log in to view your disputes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Disputes</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage disputes related to your jobs</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-700">No Disputes</h2>
          <p className="text-sm text-slate-400 mt-2">You have no active or past disputes. That is great!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Dispute list */}
          <div className="lg:col-span-1 space-y-4">
            {myFiled.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filed by You</h2>
                <div className="space-y-2">
                  {myFiled.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setActionError(null); setActionSuccess(null); }}
                      className={`w-full text-left bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm ${
                        selectedId === d.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800 truncate flex-1">{d.job_title}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{d.reason}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {againstMe.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filed Against Your Jobs</h2>
                <div className="space-y-2">
                  {againstMe.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setActionError(null); setActionSuccess(null); }}
                      className={`w-full text-left bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm ${
                        selectedId === d.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800 truncate flex-1">{d.job_title}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{d.reason}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Select a dispute to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selected.job_title}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {selected.reporter_id === user.id ? "Filed by you" : "Filed against your job"} on {formatDate(selected.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  {actionSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 mb-4">
                      {actionSuccess}
                    </div>
                  )}
                  {actionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
                      {actionError}
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-slate-500 font-medium mb-1">Reason</p>
                    <p className="text-sm font-semibold text-slate-800">{selected.reason}</p>
                    {selected.details && <p className="text-sm text-slate-600 mt-1">{selected.details}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Client</p>
                      <p className="text-slate-800">{selected.consumer_name}</p>
                    </div>
                    {selected.contractor_name && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Contractor</p>
                        <p className="text-slate-800">{selected.contractor_name}</p>
                      </div>
                    )}
                    {selected.bid_price && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Job Value</p>
                        <p className="text-slate-800 font-semibold">{formatDollars(selected.bid_price)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Dispute Status</h3>
                  <div className="space-y-0">
                    <TimelineStep
                      label="Dispute Filed"
                      date={formatDateTime(selected.created_at)}
                      active={selected.status === "open"}
                      completed={true}
                    />
                    <TimelineStep
                      label="Under Review"
                      active={selected.status === "investigating"}
                      completed={["investigating", "proposed", "resolved"].includes(selected.status) || (selected.resolution_status === "proposed")}
                    />
                    <TimelineStep
                      label="Resolution Proposed"
                      active={selected.resolution_status === "proposed" && selected.status !== "resolved"}
                      completed={selected.status === "resolved"}
                    />
                    <TimelineStep
                      label="Resolved"
                      active={false}
                      completed={selected.status === "resolved"}
                      last
                    />
                  </div>
                </div>

                {/* Resolution details */}
                {selected.resolution_type && selected.resolution_type !== "pending" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Resolution Details</h3>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Type</p>
                        <p className="text-slate-800 font-semibold capitalize">{selected.resolution_type.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Client Refund</p>
                        <p className="text-emerald-700 font-semibold">{formatDollars(selected.client_refund_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Contractor Payout</p>
                        <p className="text-blue-700 font-semibold">{formatDollars(selected.contractor_payout_cents)}</p>
                      </div>
                    </div>

                    {selected.admin_notes && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-500 font-medium mb-1">Admin Notes</p>
                        <p className="text-sm text-slate-700">{selected.admin_notes}</p>
                      </div>
                    )}

                    {/* Acceptance status */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected.client_accepted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}>
                          {selected.client_accepted ? "\u2713" : "-"}
                        </span>
                        <span className="text-slate-600">Client {selected.client_accepted ? "accepted" : "pending"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected.contractor_accepted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}>
                          {selected.contractor_accepted ? "\u2713" : "-"}
                        </span>
                        <span className="text-slate-600">Contractor {selected.contractor_accepted ? "accepted" : "pending"}</span>
                      </div>
                    </div>

                    {selected.final_resolution === 1 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 font-semibold">
                        This dispute has been fully resolved.
                      </div>
                    )}

                    {/* Accept/Reject buttons — show if resolution is proposed and user hasn't accepted yet */}
                    {selected.final_resolution !== 1 && selected.resolution_type && selected.resolution_type !== "pending" && (() => {
                      const isConsumer = user.id === selected.consumer_id;
                      const isContractor = user.id === selected.contractor_id;
                      const alreadyAccepted = (isConsumer && selected.client_accepted) || (isContractor && selected.contractor_accepted);

                      if (!isConsumer && !isContractor) return null;
                      if (alreadyAccepted) {
                        return (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
                            You have accepted this resolution. Waiting for the other party.
                          </div>
                        );
                      }

                      return (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleResolutionAction(selected.id, "accept")}
                            disabled={accepting}
                            className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {accepting ? "Processing..." : "Accept Resolution"}
                          </button>
                          <button
                            onClick={() => handleResolutionAction(selected.id, "reject")}
                            disabled={accepting}
                            className="flex-1 py-2.5 text-sm font-semibold bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Link to job */}
                <div className="text-center">
                  <Link
                    href={`/jobs/${selected.job_id}`}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline-offset-2 hover:underline"
                  >
                    View Job Details
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
