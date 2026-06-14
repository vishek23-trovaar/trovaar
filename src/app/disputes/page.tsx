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
    open: "bg-[#f87171]/10 text-[#f87171]",
    investigating: "bg-[#fbbf24]/10 text-[#fbbf24]",
    resolved: "bg-[#27a644]/10 text-[#34d399]",
    rejected: "bg-[#141516] text-[#8a8f98]",
    proposed: "bg-[#3B82F6]/10 text-[#60A5FA]",
  };
  const cls = map[status] ?? "bg-[#141516] text-[#8a8f98]";
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
              ? "bg-emerald-500 border-[#27a644]/60"
              : active
              ? "bg-indigo-500 border-indigo-500"
              : "bg-[#0f1011] border-[#23252a]"
          }`}
        />
        {!last && <div className={`w-0.5 h-6 ${completed ? "bg-[#27a644]" : "bg-[#18191a]"}`} />}
      </div>
      <div className="-mt-0.5">
        <p className={`text-sm font-medium ${completed ? "text-[#34d399]" : active ? "text-[#60A5FA]" : "text-[#8a8f98]"}`}>
          {label}
        </p>
        {date && <p className="text-xs text-[#8a8f98]">{date}</p>}
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
        <p className="text-[#8a8f98]">Please log in to view your disputes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8" style={{ animation: "fadeInUp 0.5s ease-out" }}>
        <div>
          <h1 className="text-2xl font-bold text-[#f7f8f8]">My Disputes</h1>
          <p className="text-sm text-[#8a8f98] mt-1">View and manage disputes related to your jobs</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#27a644]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#d0d6e0]">No Disputes</h2>
          <p className="text-sm text-[#8a8f98] mt-2">You have no active or past disputes. That is great!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Dispute list */}
          <div className="lg:col-span-1 space-y-4">
            {myFiled.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[#8a8f98] uppercase tracking-wider mb-3">Filed by You</h2>
                <div className="space-y-2">
                  {myFiled.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setActionError(null); setActionSuccess(null); }}
                      className={`w-full text-left bg-[#0f1011] rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                        selectedId === d.id ? "border-indigo-400 ring-2 ring-[#3B82F6]/20" : "border-[#23252a]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-[#d0d6e0] truncate flex-1">{d.job_title}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-[#8a8f98] truncate">{d.reason}</p>
                      <p className="text-xs text-[#8a8f98] mt-1">{formatDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {againstMe.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[#8a8f98] uppercase tracking-wider mb-3">Filed Against Your Jobs</h2>
                <div className="space-y-2">
                  {againstMe.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setActionError(null); setActionSuccess(null); }}
                      className={`w-full text-left bg-[#0f1011] rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                        selectedId === d.id ? "border-indigo-400 ring-2 ring-[#3B82F6]/20" : "border-[#23252a]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-[#d0d6e0] truncate flex-1">{d.job_title}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-[#8a8f98] truncate">{d.reason}</p>
                      <p className="text-xs text-[#8a8f98] mt-1">{formatDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#141516] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-[#8a8f98]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[#8a8f98] font-medium">Select a dispute to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#f7f8f8]">{selected.job_title}</h2>
                      <p className="text-sm text-[#8a8f98] mt-0.5">
                        {selected.reporter_id === user.id ? "Filed by you" : "Filed against your job"} on {formatDate(selected.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  {actionSuccess && (
                    <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg p-3 text-sm text-[#34d399] mb-4">
                      {actionSuccess}
                    </div>
                  )}
                  {actionError && (
                    <div className="bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg p-3 text-sm text-[#f87171] mb-4">
                      {actionError}
                    </div>
                  )}

                  <div className="bg-[#010102] rounded-lg p-4 mb-4">
                    <p className="text-xs text-[#8a8f98] font-medium mb-1">Reason</p>
                    <p className="text-sm font-semibold text-[#d0d6e0]">{selected.reason}</p>
                    {selected.details && <p className="text-sm text-[#8a8f98] mt-1">{selected.details}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-[#8a8f98] font-medium">Client</p>
                      <p className="text-[#d0d6e0]">{selected.consumer_name}</p>
                    </div>
                    {selected.contractor_name && (
                      <div>
                        <p className="text-xs text-[#8a8f98] font-medium">Contractor</p>
                        <p className="text-[#d0d6e0]">{selected.contractor_name}</p>
                      </div>
                    )}
                    {selected.bid_price && (
                      <div>
                        <p className="text-xs text-[#8a8f98] font-medium">Job Value</p>
                        <p className="text-[#d0d6e0] font-semibold">{formatDollars(selected.bid_price)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <h3 className="text-sm font-bold text-[#d0d6e0] mb-4">Dispute Status</h3>
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
                  <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-sm font-bold text-[#d0d6e0] mb-4">Resolution Details</h3>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-xs text-[#8a8f98] font-medium">Type</p>
                        <p className="text-[#d0d6e0] font-semibold capitalize">{selected.resolution_type.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a8f98] font-medium">Client Refund</p>
                        <p className="text-[#34d399] font-semibold">{formatDollars(selected.client_refund_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a8f98] font-medium">Contractor Payout</p>
                        <p className="text-[#60A5FA] font-semibold">{formatDollars(selected.contractor_payout_cents)}</p>
                      </div>
                    </div>

                    {selected.admin_notes && (
                      <div className="bg-[#010102] rounded-lg p-3 mb-4">
                        <p className="text-xs text-[#8a8f98] font-medium mb-1">Admin Notes</p>
                        <p className="text-sm text-[#d0d6e0]">{selected.admin_notes}</p>
                      </div>
                    )}

                    {/* Acceptance status */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected.client_accepted ? "bg-[#27a644]/10 text-[#34d399]" : "bg-[#141516] text-[#8a8f98]"
                        }`}>
                          {selected.client_accepted ? "\u2713" : "-"}
                        </span>
                        <span className="text-[#8a8f98]">Client {selected.client_accepted ? "accepted" : "pending"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected.contractor_accepted ? "bg-[#27a644]/10 text-[#34d399]" : "bg-[#141516] text-[#8a8f98]"
                        }`}>
                          {selected.contractor_accepted ? "\u2713" : "-"}
                        </span>
                        <span className="text-[#8a8f98]">Contractor {selected.contractor_accepted ? "accepted" : "pending"}</span>
                      </div>
                    </div>

                    {selected.final_resolution === 1 && (
                      <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg p-3 text-sm text-[#34d399] font-semibold">
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
                          <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-3 text-sm text-[#60A5FA] mt-4">
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
                            className="flex-1 py-2.5 text-sm font-semibold bg-[#0f1011] text-[#f87171] border border-[#f87171]/30 rounded-lg hover:bg-[#f87171]/15 disabled:opacity-50 transition-colors cursor-pointer"
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
                    className="text-sm text-[#60A5FA] hover:text-[#60A5FA] font-medium underline-offset-2 hover:underline"
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
