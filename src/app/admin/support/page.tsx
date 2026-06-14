"use client";
import { useState, useEffect, useCallback } from "react";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_name: string;
  user_email: string;
  user_role: string;
}

interface TicketCounts {
  open: number;
  in_progress: number;
  resolved: number;
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "urgent") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#f87171]/10 text-[#f87171] uppercase tracking-wide">Urgent</span>;
  if (priority === "high") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#fbbf24]/10 text-[#fbbf24] uppercase tracking-wide">High</span>;
  if (priority === "normal") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/10 text-[#60A5FA] uppercase tracking-wide">Normal</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#141516] text-[#8a8f98] uppercase tracking-wide">Low</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#27a644]/10 text-[#34d399]">Open</span>;
  if (status === "in_progress") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/10 text-[#60A5FA]">In Progress</span>;
  if (status === "resolved") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#141516] text-[#8a8f98]">Resolved</span>;
  if (status === "closed") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#18191a] text-[#8a8f98]">Closed</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#141516] text-[#8a8f98]">{status}</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({ open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Detail form state
  const [detailStatus, setDetailStatus] = useState("");
  const [detailPriority, setDetailPriority] = useState("");
  const [detailNotes, setDetailNotes] = useState("");

  const loadTickets = useCallback((statusFilter: string) => {
    setLoading(true);
    const url = statusFilter ? `/api/admin/support?status=${encodeURIComponent(statusFilter)}` : "/api/admin/support";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setTickets(d.tickets ?? []);
        setCounts(d.counts ?? { open: 0, in_progress: 0, resolved: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadTickets(activeTab); }, [activeTab, loadTickets]);

  function selectTicket(ticket: SupportTicket) {
    setSelected(ticket);
    setDetailStatus(ticket.status);
    setDetailPriority(ticket.priority);
    setDetailNotes(ticket.admin_notes ?? "");
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: detailStatus !== selected.status ? detailStatus : undefined,
          priority: detailPriority !== selected.priority ? detailPriority : undefined,
          admin_notes: detailNotes,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        // Update local state
        const updated: SupportTicket = { ...selected, status: detailStatus, priority: detailPriority, admin_notes: detailNotes };
        setSelected(updated);
        setTickets((prev) => prev.map((t) => (t.id === selected.id ? updated : t)));
        loadTickets(activeTab);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f7f8f8]">Support Tickets</h1>
        <p className="text-[#8a8f98] text-sm mt-1">Manage and respond to user support requests</p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", value: counts.open, color: "text-[#34d399]" },
          { label: "In Progress", value: counts.in_progress, color: "text-[#60A5FA]" },
          { label: "Resolved", value: counts.resolved, color: "text-[#8a8f98]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] px-5 py-4 hover:shadow-lg transition-all duration-300">
            <p className="text-xs text-[#8a8f98] font-medium uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main split-view */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Ticket list */}
        <div className="w-96 shrink-0 bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] flex flex-col">
          {/* Status tabs */}
          <div className="flex border-b border-[#23252a] px-2 pt-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelected(null); }}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? "text-[#60A5FA] border-b-2 border-blue-600"
                    : "text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
              >
                {tab.label}
                {tab.key === "open" && counts.open > 0 && (
                  <span className="ml-1 bg-[#27a644]/10 text-[#34d399] px-1.5 rounded-full text-xs">{counts.open}</span>
                )}
                {tab.key === "in_progress" && counts.in_progress > 0 && (
                  <span className="ml-1 bg-[#3B82F6]/10 text-[#60A5FA] px-1.5 rounded-full text-xs">{counts.in_progress}</span>
                )}
              </button>
            ))}
          </div>

          {/* Ticket items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#23252a]">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#8a8f98] text-sm gap-2">
                <span className="w-4 h-4 border-2 border-[#23252a] border-t-slate-500 rounded-full animate-spin" />
                Loading…
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-[#8a8f98]">
                <p className="text-3xl mb-2">🎧</p>
                <p className="font-medium text-[#8a8f98]">No tickets</p>
                <p className="text-xs mt-1">No support tickets in this category</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#141516] transition-colors ${selected?.id === ticket.id ? "bg-[#3B82F6]/10 border-l-2 border-blue-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-[#d0d6e0] truncate">{ticket.subject}</p>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p className="text-xs text-[#8a8f98] truncate mb-1.5">{ticket.user_name} · {ticket.user_role}</p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={ticket.status} />
                    <span className="text-xs text-[#8a8f98]">{timeAgo(ticket.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket detail */}
        <div className="flex-1 bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] flex flex-col">
          {selected === null ? (
            <div className="flex-1 flex items-center justify-center text-[#8a8f98] flex-col gap-3">
              <span className="text-4xl">🎧</span>
              <p className="font-medium text-[#8a8f98]">Select a ticket to view details</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Ticket header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#f7f8f8]">{selected.subject}</h2>
                  <p className="text-sm text-[#8a8f98] mt-0.5">
                    From <span className="font-medium text-[#d0d6e0]">{selected.user_name}</span> ({selected.user_email}) ·{" "}
                    <span className="capitalize">{selected.user_role}</span> · {timeAgo(selected.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={selected.priority} />
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wide mb-2">Message</p>
                <div className="bg-[#010102] rounded-lg p-4 text-sm text-[#d0d6e0] leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#d0d6e0] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-[#0f1011]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] uppercase tracking-wide mb-1">Priority</label>
                  <select
                    value={detailPriority}
                    onChange={(e) => setDetailPriority(e.target.value)}
                    className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#d0d6e0] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-[#0f1011]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] uppercase tracking-wide mb-1">Admin Notes</label>
                <textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  rows={4}
                  placeholder="Add internal notes about this ticket…"
                  className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#d0d6e0] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
                />
              </div>

              {/* Save */}
              <div className="flex items-center justify-between pt-1">
                {saveSuccess && (
                  <span className="text-[#34d399] text-sm flex items-center gap-1.5">
                    <span>✓</span> Changes saved
                  </span>
                )}
                {!saveSuccess && <span />}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
