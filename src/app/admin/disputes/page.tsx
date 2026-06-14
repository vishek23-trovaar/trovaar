"use client";

import { useState, useEffect, useCallback } from "react";

interface Dispute {
  id: string;
  job_id: string;
  job_title: string;
  job_status: string;
  job_category: string;
  job_created_at: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_status: string | null;
  created_at: string;
  updated_at: string;
  consumer_name: string;
  consumer_email: string;
  consumer_id: string;
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_id: string | null;
  bid_price: number | null;
  bid_created_at: string | null;
  bid_accepted_at: string | null;
  resolution_type: string | null;
  client_refund_cents: number | null;
  contractor_payout_cents: number | null;
  client_accepted: number | null;
  contractor_accepted: number | null;
  final_resolution: number | null;
  admin_notes: string | null;
}

interface Message {
  id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface ResolutionForm {
  resolution_type: string;
  client_refund_cents: number;
  contractor_payout_cents: number;
  admin_notes: string;
  strike_consumer: boolean;
  strike_contractor: boolean;
}

type FilterStatus = "all" | "open" | "investigating" | "proposed" | "resolved";

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDollars(cents: number | null): string {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(str: string | null): string {
  if (!str) return "N/A";
  return new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(str: string | null): string {
  if (!str) return "N/A";
  return new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [resolutionForm, setResolutionForm] = useState<ResolutionForm>({
    resolution_type: "pending",
    client_refund_cents: 0,
    contractor_payout_cents: 0,
    admin_notes: "",
    strike_consumer: false,
    strike_contractor: false,
  });

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/disputes");
      if (res.ok) {
        const data = await res.json() as { disputes: Dispute[] };
        setDisputes(data.disputes);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  async function fetchMessages(jobId: string) {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes/messages?jobId=${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  function openDispute(d: Dispute) {
    setSelected(d);
    setError(null);
    setSuccessMsg(null);
    setResolutionForm({
      resolution_type: d.resolution_type ?? "pending",
      client_refund_cents: d.client_refund_cents ?? 0,
      contractor_payout_cents: d.contractor_payout_cents ?? 0,
      admin_notes: d.admin_notes ?? "",
      strike_consumer: false,
      strike_contractor: false,
    });
    fetchMessages(d.job_id);
  }

  function handleResolutionTypeChange(type: string) {
    const bidPrice = selected?.bid_price ?? 0;
    let clientRefund = resolutionForm.client_refund_cents;
    let contractorPayout = resolutionForm.contractor_payout_cents;

    if (type === "full_refund") {
      clientRefund = bidPrice;
      contractorPayout = 0;
    } else if (type === "no_refund") {
      clientRefund = 0;
      contractorPayout = bidPrice;
    } else if (type === "split") {
      clientRefund = Math.round(bidPrice / 2);
      contractorPayout = bidPrice - clientRefund;
    }

    setResolutionForm((f) => ({
      ...f,
      resolution_type: type,
      client_refund_cents: clientRefund,
      contractor_payout_cents: contractorPayout,
    }));
  }

  async function proposeResolution() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/disputes/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution_type: resolutionForm.resolution_type,
          client_refund_cents: resolutionForm.client_refund_cents,
          contractor_payout_cents: resolutionForm.contractor_payout_cents,
          admin_notes: resolutionForm.admin_notes || undefined,
          strike_consumer: resolutionForm.strike_consumer,
          strike_contractor: resolutionForm.strike_contractor,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to propose resolution");
      } else {
        setSuccessMsg("Resolution proposed and parties notified.");
        await fetchDisputes();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function markInvestigating() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "investigating" }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed");
      } else {
        setSuccessMsg("Marked as investigating.");
        await fetchDisputes();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function dismissDispute() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed");
      } else {
        setSuccessMsg("Dispute dismissed.");
        await fetchDisputes();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Refresh selected after disputes reload
  useEffect(() => {
    if (selected) {
      const updated = disputes.find((d) => d.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [disputes]);

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "proposed") return d.status === "proposed" || d.resolution_status === "proposed";
    return d.status === filterStatus;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Stats
  const totalDisputes = disputes.length;
  const openCount = disputes.filter((d) => d.status === "open").length;
  const investigatingCount = disputes.filter((d) => d.status === "investigating").length;
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved");
  const avgResolutionDays = resolvedDisputes.length > 0
    ? Math.round(resolvedDisputes.reduce((sum, d) => sum + daysBetween(d.created_at, d.updated_at), 0) / resolvedDisputes.length)
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden">
      {/* Stats bar */}
      <div className="bg-[#0f1011] border-b border-[#23252a] px-6 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-[#f7f8f8] mr-4">Dispute Resolution</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#23252a]" />
            <span className="text-sm text-[#8a8f98]"><span className="font-semibold">{totalDisputes}</span> Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-[#8a8f98]"><span className="font-semibold">{openCount}</span> Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm text-[#8a8f98]"><span className="font-semibold">{investigatingCount}</span> Under Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm text-[#8a8f98]"><span className="font-semibold">{avgResolutionDays}d</span> Avg Resolution</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - dispute list */}
        <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col border-r border-[#23252a] bg-[#0f1011] overflow-hidden">
          {/* Filter tabs */}
          <div className="px-4 py-3 border-b border-[#23252a] flex gap-1.5 overflow-x-auto">
            {([
              ["all", "All"],
              ["open", "Open"],
              ["investigating", "Under Review"],
              ["proposed", "Proposed"],
              ["resolved", "Resolved"],
            ] as [FilterStatus, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === value
                    ? "bg-[#3B82F6]/10 text-[#60A5FA]"
                    : "bg-[#141516] text-[#8a8f98] hover:bg-[#18191a]"
                }`}
              >
                {label}
                {value === "open" && openCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{openCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="px-4 py-2 text-xs text-[#8a8f98]">
            {filteredDisputes.length} dispute{filteredDisputes.length !== 1 ? "s" : ""}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-6 h-6 border-4 border-[#23252a] border-t-transparent rounded-full" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="py-20 text-center px-4">
              <p className="text-3xl mb-2">&#9878;&#65039;</p>
              <p className="font-semibold text-[#8a8f98]">No disputes</p>
              <p className="text-sm text-[#8a8f98] mt-1">
                {filterStatus === "all" ? "All clear!" : `No ${filterStatus} disputes`}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-[#23252a]">
              {filteredDisputes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDispute(d)}
                  className={`w-full text-left px-5 py-4 hover:bg-[#141516] transition-colors cursor-pointer ${
                    selected?.id === d.id ? "bg-[#3B82F6]/10 border-r-2 border-indigo-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-[#d0d6e0] truncate flex-1">{d.job_title}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-xs text-[#8a8f98] truncate">{d.reason}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[#8a8f98]">{d.consumer_name}</span>
                    {d.contractor_name && (
                      <>
                        <span className="text-[#8a8f98] text-xs">vs</span>
                        <span className="text-xs text-[#8a8f98]">{d.contractor_name}</span>
                      </>
                    )}
                    <span className="ml-auto text-xs text-[#8a8f98]">{formatDate(d.created_at)}</span>
                  </div>
                  {d.bid_price && (
                    <p className="text-xs text-[#60A5FA] mt-1 font-medium">{formatDollars(d.bid_price)}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel - detail */}
        <div className="flex-1 overflow-y-auto bg-[#010102]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-[#3B82F6]/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#60A5FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#8a8f98]">Select a dispute</p>
              <p className="text-sm text-[#8a8f98] mt-1">Click a dispute on the left to review details</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#f7f8f8]">{selected.job_title}</h2>
                  <p className="text-sm text-[#8a8f98] mt-0.5">Filed {formatDateTime(selected.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={selected.status} />
                  {selected.resolution_status && selected.resolution_status !== selected.status && (
                    <StatusBadge status={selected.resolution_status} />
                  )}
                </div>
              </div>

              {/* Success / error */}
              {successMsg && (
                <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-xl p-3 text-sm text-[#34d399]">
                  {successMsg}
                </div>
              )}
              {error && (
                <div className="bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl p-3 text-sm text-[#f87171]">
                  {error}
                </div>
              )}

              {/* Job details card */}
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#d0d6e0]">Job Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[#8a8f98] font-medium">Category</p>
                    <p className="text-[#d0d6e0] capitalize">{(selected.job_category || "").replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8a8f98] font-medium">Job Status</p>
                    <p className="text-[#d0d6e0] capitalize">{(selected.job_status || "").replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8a8f98] font-medium">Posted</p>
                    <p className="text-[#d0d6e0]">{formatDate(selected.job_created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8a8f98] font-medium">Bid Value</p>
                    <p className="text-[#d0d6e0] font-semibold">{formatDollars(selected.bid_price)}</p>
                  </div>
                </div>
              </div>

              {/* Parties info */}
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#d0d6e0]">Parties Involved</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#010102] rounded-lg p-3">
                    <p className="text-xs text-[#8a8f98] font-medium mb-1">Client (Consumer)</p>
                    <p className="text-[#d0d6e0] font-semibold">{selected.consumer_name}</p>
                    <p className="text-xs text-[#8a8f98]">{selected.consumer_email}</p>
                    {selected.reporter_id === selected.consumer_id && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#3B82F6]/10 text-[#60A5FA] text-[10px] font-semibold rounded">Filed by</span>
                    )}
                  </div>
                  {selected.contractor_name && (
                    <div className="bg-[#010102] rounded-lg p-3">
                      <p className="text-xs text-[#8a8f98] font-medium mb-1">Contractor</p>
                      <p className="text-[#d0d6e0] font-semibold">{selected.contractor_name}</p>
                      <p className="text-xs text-[#8a8f98]">{selected.contractor_email}</p>
                      {selected.reporter_id === selected.contractor_id && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#3B82F6]/10 text-[#60A5FA] text-[10px] font-semibold rounded">Filed by</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute reason */}
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#d0d6e0]">Dispute Reason</h3>
                <div className="bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg p-3">
                  <p className="text-sm font-semibold text-[#f87171]">{selected.reason}</p>
                  {selected.details && (
                    <p className="text-sm text-[#f87171] mt-2">{selected.details}</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#d0d6e0]">Event Timeline</h3>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-[#18191a]" />

                  <div className="relative">
                    <div className="absolute -left-4 w-3 h-3 rounded-full bg-[#23252a] border-2 border-white" />
                    <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Job Posted</span></p>
                    <p className="text-xs text-[#8a8f98]">{formatDateTime(selected.job_created_at)}</p>
                  </div>

                  {selected.bid_accepted_at && (
                    <div className="relative">
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                      <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Bid Accepted</span> - {formatDollars(selected.bid_price)}</p>
                      <p className="text-xs text-[#8a8f98]">{formatDateTime(selected.bid_accepted_at)}</p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute -left-4 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                    <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Dispute Filed</span> - {selected.reason}</p>
                    <p className="text-xs text-[#8a8f98]">{formatDateTime(selected.created_at)}</p>
                  </div>

                  {selected.status === "investigating" && (
                    <div className="relative">
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
                      <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Under Investigation</span></p>
                    </div>
                  )}

                  {selected.resolution_type && selected.resolution_type !== "pending" && (
                    <div className="relative">
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                      <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Resolution Proposed</span> - {selected.resolution_type.replace(/_/g, " ")}</p>
                    </div>
                  )}

                  {selected.final_resolution === 1 && (
                    <div className="relative">
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      <p className="text-sm text-[#d0d6e0]"><span className="font-medium">Resolved</span> - Both parties accepted</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Message history */}
              <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#d0d6e0]">Message History</h3>
                {messagesLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin w-5 h-5 border-2 border-[#23252a] border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#8a8f98] text-center py-4">No messages exchanged.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg p-3 text-sm ${
                          m.sender_role === "consumer"
                            ? "bg-[#3B82F6]/10 border border-[#3B82F6]/30"
                            : "bg-[#010102] border border-[#23252a]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#d0d6e0] text-xs">
                            {m.sender_name}
                            <span className="ml-1 text-[#8a8f98] font-normal capitalize">({m.sender_role})</span>
                          </span>
                          <span className="text-xs text-[#8a8f98]">{formatDateTime(m.created_at)}</span>
                        </div>
                        <p className="text-[#8a8f98]">{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current resolution */}
              {selected.resolution_type && selected.resolution_type !== "pending" ? (
                <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#d0d6e0]">Current Resolution Proposal</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
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
                  <div className="flex gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${selected.client_accepted ? "bg-[#27a644]/10 text-[#34d399]" : "bg-[#141516] text-[#8a8f98]"}`}>
                        {selected.client_accepted ? "\u2713" : "\u00b7"}
                      </span>
                      <span className="text-[#8a8f98]">Consumer {selected.client_accepted ? "accepted" : "pending"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${selected.contractor_accepted ? "bg-[#27a644]/10 text-[#34d399]" : "bg-[#141516] text-[#8a8f98]"}`}>
                        {selected.contractor_accepted ? "\u2713" : "\u00b7"}
                      </span>
                      <span className="text-[#8a8f98]">Contractor {selected.contractor_accepted ? "accepted" : "pending"}</span>
                    </div>
                  </div>
                  {selected.admin_notes && (
                    <div>
                      <p className="text-xs text-[#8a8f98] font-medium">Admin Notes</p>
                      <p className="text-sm text-[#d0d6e0] mt-0.5">{selected.admin_notes}</p>
                    </div>
                  )}
                  {selected.final_resolution === 1 && (
                    <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-lg p-2.5 text-sm text-[#34d399] font-semibold">
                      Both parties accepted -- dispute resolved.
                    </div>
                  )}
                </div>
              ) : (
                selected.status !== "resolved" && selected.status !== "rejected" && (
                  <div className="bg-[#141516] rounded-xl p-4 text-sm text-[#8a8f98] text-center">
                    No resolution proposal yet.
                  </div>
                )
              )}

              {/* Admin resolution form */}
              {selected.final_resolution !== 1 && selected.status !== "rejected" && (
                <div className="bg-[#0f1011] rounded-2xl border border-[#3B82F6]/30 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#60A5FA]">Propose / Update Resolution</h3>

                  <div>
                    <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Resolution Type</label>
                    <select
                      value={resolutionForm.resolution_type}
                      onChange={(e) => handleResolutionTypeChange(e.target.value)}
                      className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] bg-[#0f1011] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    >
                      <option value="pending">Pending</option>
                      <option value="full_refund">Full Refund to Client</option>
                      <option value="partial_refund">Partial Refund</option>
                      <option value="no_refund">Dismiss - No Refund (Contractor Keeps Payment)</option>
                      <option value="split">Split 50/50</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Client Refund ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={(resolutionForm.client_refund_cents / 100).toFixed(2)}
                        onChange={(e) => setResolutionForm((f) => ({ ...f, client_refund_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                        className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Contractor Payout ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={(resolutionForm.contractor_payout_cents / 100).toFixed(2)}
                        onChange={(e) => setResolutionForm((f) => ({ ...f, contractor_payout_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                        className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Admin Notes</label>
                    <textarea
                      value={resolutionForm.admin_notes}
                      onChange={(e) => setResolutionForm((f) => ({ ...f, admin_notes: e.target.value }))}
                      placeholder="Internal notes about this resolution..."
                      rows={3}
                      className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    />
                  </div>

                  {/* Strikes */}
                  <div className="border-t border-[#23252a] pt-4">
                    <p className="text-xs font-semibold text-[#8a8f98] mb-2">Issue Warning / Strike</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-[#d0d6e0] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={resolutionForm.strike_consumer}
                          onChange={(e) => setResolutionForm((f) => ({ ...f, strike_consumer: e.target.checked }))}
                          className="w-4 h-4 rounded border-[#23252a] text-[#f87171] focus:ring-[#f87171]"
                        />
                        Strike Client ({selected.consumer_name})
                      </label>
                      {selected.contractor_name && (
                        <label className="flex items-center gap-2 text-sm text-[#d0d6e0] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={resolutionForm.strike_contractor}
                            onChange={(e) => setResolutionForm((f) => ({ ...f, strike_contractor: e.target.checked }))}
                            className="w-4 h-4 rounded border-[#23252a] text-[#f87171] focus:ring-[#f87171]"
                          />
                          Strike Contractor ({selected.contractor_name})
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={proposeResolution}
                      disabled={submitting || resolutionForm.resolution_type === "pending"}
                      className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {submitting ? "Proposing..." : "Propose Resolution"}
                    </button>
                    {selected.status !== "investigating" && selected.status !== "resolved" && (
                      <button
                        onClick={markInvestigating}
                        disabled={submitting}
                        className="px-4 py-2.5 text-sm font-semibold bg-[#fbbf24]/10 text-[#fbbf24] rounded-lg hover:bg-[#fbbf24]/20 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                    )}
                    {selected.status !== "resolved" && selected.status !== "rejected" && (
                      <button
                        onClick={dismissDispute}
                        disabled={submitting}
                        className="px-4 py-2.5 text-sm font-semibold bg-[#141516] text-[#8a8f98] rounded-lg hover:bg-[#18191a] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
