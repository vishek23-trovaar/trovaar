"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PersonRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phone_verified: number;
  role: "consumer" | "contractor";
  account_number: string | null;
  created_at: string;
  is_suspended: number | null;
  strike_count: number | null;
  verification_status: string | null;
  insurance_status: string | null;
  rating: number | null;
  rating_count: number | null;
  completed_jobs: number | null;
  total_bids: number | null;
  accepted_bids: number | null;
  platform_revenue_cents: number | null;
  // client fields
  total_jobs: number | null;
  total_spent_cents: number | null;
}

interface DetailData {
  user: Record<string, unknown>;
  profile?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  earnings?: {
    total_earned_cents: number;
    platform_revenue_cents: number;
    won_jobs: number;
    avgBidCents: number;
    totalBids: number;
    wonBids: number;
    winRate: number;
  };
  reviews?: Array<{ id: string; rating: number; comment: string; created_at: string; reviewer_name: string; job_title: string }>;
  activeJobs?: Array<{ id: string; title: string; category: string; status: string; location: string; created_at: string; bid_price: number }>;
  completedJobs?: Array<{ id: string; title: string; category: string; created_at: string; price: number }>;
  strikes?: Array<{ id: string; reason: string; created_at: string }>;
  suspension?: { reason: string; created_at: string; suspended_until: string | null };
  flags?: string[];
  // client
  jobs?: Array<{ id: string; title: string; category: string; status: string; urgency: string; created_at: string; bid_count: number; accepted_price: number | null }>;
  disputes?: Array<{ id: string; reason: string; status: string; created_at: string; job_title: string }>;
  topCats?: Array<{ category: string; c: number }>;
  spend?: { total_spent_cents: number; completed_jobs: number; totalJobs: number; activeJobs: number; cancelledJobs: number };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtUSD(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const FLAG_STYLES: Record<string, { bg: string; label: string }> = {
  SUSPENDED:           { bg: "bg-[#f87171]/10 text-[#f87171]",    label: "Suspended" },
  ID_PENDING:          { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "ID Pending" },
  INSURANCE_PENDING:   { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "Insurance Pending" },
  UNVERIFIED:          { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "Unverified" },
  UNINSURED:           { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "Uninsured" },
  HIGH_STRIKES:        { bg: "bg-[#f87171]/10 text-[#f87171]",    label: "High Strikes" },
  HAS_STRIKE:          { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "Strike" },
  LOW_RATING:          { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "Low Rating" },
  HAS_NO_SHOWS:        { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "No-Shows" },
  PHONE_UNVERIFIED:    { bg: "bg-[#141516] text-[#8a8f98]", label: "Phone Unverified" },
  HIGH_CANCELLATIONS:  { bg: "bg-[#fbbf24]/10 text-[#fbbf24]", label: "High Cancellations" },
  MULTIPLE_DISPUTES:   { bg: "bg-[#f87171]/10 text-[#f87171]",    label: "Multiple Disputes" },
};

function FlagPill({ flag }: { flag: string }) {
  const s = FLAG_STYLES[flag] ?? { bg: "bg-[#141516] text-[#8a8f98]", label: flag };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg}`}>{s.label}</span>;
}

function StatCard({ label, value, sub, color = "text-[#d0d6e0]" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#010102] rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#8a8f98] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#8a8f98] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({ personId, isContractor, isSuspended, onSuccess }: {
  personId: string;
  isContractor: boolean;
  isSuspended: boolean;
  onSuccess: () => void;
}) {
  const [action, setAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(actionName: string, extra: Record<string, string> = {}) {
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/admin/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, reason, ...extra }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg("✅ Done");
      setAction(null);
      setReason("");
      setNotifTitle("");
      setNotifMsg("");
      setTimeout(() => { setMsg(""); onSuccess(); }, 800);
    } else {
      setMsg("❌ " + (d.error ?? "Failed"));
    }
  }

  return (
    <div className="border-t border-[#23252a] pt-4 mt-4">
      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Admin Actions</p>
      {msg && <p className="text-sm mb-2">{msg}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        {isContractor && (
          <>
            <button onClick={() => setAction(action === "approve_id" ? null : "approve_id")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#27a644]/10 text-[#34d399] hover:bg-[#27a644]/20 cursor-pointer transition-colors">✓ Approve ID</button>
            <button onClick={() => setAction(action === "reject_id" ? null : "reject_id")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20 cursor-pointer transition-colors">✗ Reject ID</button>
            <button onClick={() => setAction(action === "approve_insurance" ? null : "approve_insurance")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#27a644]/10 text-[#34d399] hover:bg-[#27a644]/20 cursor-pointer transition-colors">✓ Approve Insurance</button>
            <button onClick={() => setAction(action === "reject_insurance" ? null : "reject_insurance")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20 cursor-pointer transition-colors">✗ Reject Insurance</button>
            <button onClick={() => setAction(action === "add_strike" ? null : "add_strike")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20 cursor-pointer transition-colors">⚡ Add Strike</button>
            <button onClick={() => run("clear_strikes")} disabled={loading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#141516] text-[#8a8f98] hover:bg-[#18191a] cursor-pointer transition-colors disabled:opacity-50">Clear Strikes</button>
          </>
        )}
        <button onClick={() => setAction(action === "notify" ? null : "notify")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#3B82F6]/10 text-[#60A5FA] hover:bg-[#3B82F6]/20 cursor-pointer transition-colors">📨 Send Notification</button>
        <button onClick={() => run(isSuspended ? "unsuspend" : "suspend")} disabled={loading} className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors disabled:opacity-50 ${isSuspended ? "bg-[#27a644]/10 text-[#34d399] hover:bg-[#27a644]/20" : "bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20"}`}>
          {isSuspended ? "✓ Reinstate Account" : "🚫 Suspend Account"}
        </button>
      </div>

      {/* Reason/message inputs */}
      {(action === "reject_id" || action === "reject_insurance" || action === "add_strike" || action === "suspend") && (
        <div className="bg-[#010102] rounded-xl p-3 mb-2">
          <label className="block text-xs font-medium text-[#8a8f98] mb-1">Reason (sent to user)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40" placeholder="Explain the reason…" />
          <button onClick={() => run(action)} disabled={loading || !reason.trim()} className="mt-2 px-4 py-1.5 bg-[#0f1011] text-white text-xs font-semibold rounded-lg hover:bg-[#141516] disabled:opacity-50 cursor-pointer transition-colors">
            {loading ? "Sending…" : "Confirm"}
          </button>
        </div>
      )}
      {(action === "approve_id" || action === "approve_insurance") && (
        <div className="bg-[#27a644]/10 rounded-xl p-3 mb-2">
          <p className="text-xs text-[#34d399] mb-2">User will be notified of approval.</p>
          <button onClick={() => run(action)} disabled={loading} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors">
            {loading ? "Processing…" : `Confirm ${action === "approve_id" ? "ID Approval" : "Insurance Approval"}`}
          </button>
        </div>
      )}
      {action === "notify" && (
        <div className="bg-[#010102] rounded-xl p-3 mb-2 space-y-2">
          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">Notification Title</label>
            <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full border border-[#23252a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40" placeholder="e.g. Account Update" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">Message</label>
            <textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} rows={3} className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40" placeholder="Message body…" />
          </div>
          <button onClick={() => run("send_notification", { title: notifTitle, message: notifMsg })} disabled={loading || !notifTitle.trim() || !notifMsg.trim()} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors">
            {loading ? "Sending…" : "Send Notification"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ personId, onClose }: { personId: string; onClose: () => void }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/people/${personId}`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const isContractor = (data?.user?.role as string) === "contractor";
  const isSuspended = !!(data?.profile as Record<string, unknown> | undefined)?.is_suspended;

  const vStatus = (data?.profile as Record<string, unknown> | undefined)?.verification_status as string | undefined;
  const iStatus = (data?.profile as Record<string, unknown> | undefined)?.insurance_status as string | undefined;
  const idDocUrl = (data?.profile as Record<string, unknown> | undefined)?.id_document_url as string | undefined;
  const insDocUrl = (data?.profile as Record<string, unknown> | undefined)?.insurance_document_url as string | undefined;

  function vBadge(s: string | undefined) {
    if (s === "approved") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#27a644]/10 text-[#34d399]">✓ Approved</span>;
    if (s === "pending") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fbbf24]/10 text-[#fbbf24]">⏳ Pending</span>;
    if (s === "rejected") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f87171]/10 text-[#f87171]">✗ Rejected</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#141516] text-[#8a8f98]">— None</span>;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-[560px] bg-[#0f1011] shadow-2xl overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1 min-h-[200px]">
            <div className="animate-spin w-8 h-8 border-4 border-[#23252a] border-t-slate-700 rounded-full" />
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-[#8a8f98]">Failed to load profile.</div>
        ) : (
          <div className="flex-1">
            {/* Header */}
            <div className={`px-6 pt-6 pb-4 border-b border-[#23252a] ${isSuspended ? "bg-[#f87171]/10" : "bg-[#010102]"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 ${isContractor ? "bg-indigo-500" : "bg-emerald-500"}`}>
                    {(data.user.name as string).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[#d0d6e0]">{data.user.name as string}</h2>
                      {isSuspended && <span className="text-xs bg-[#f87171]/10 text-[#f87171] px-2 py-0.5 rounded-full font-semibold">Suspended</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isContractor ? "bg-[#3B82F6]/10 text-[#60A5FA]" : "bg-[#27a644]/10 text-[#34d399]"}`}>{isContractor ? "Contractor" : "Client"}</span>
                    </div>
                    {(data.user.account_number as string | null) && (
                      <p className="text-sm font-mono font-semibold text-[#8a8f98] mt-0.5">{String(data.user.account_number)}</p>
                    )}
                    <p className="text-xs text-[#8a8f98] mt-0.5">{data.user.email as string}</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-[#8a8f98] hover:text-[#d0d6e0] text-xl font-light leading-none cursor-pointer p-1">✕</button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-[#8a8f98]">
                <span>📱 {(data.user.phone as string) || "—"} {(data.user.phone_verified as number) ? <span className="text-[#34d399] font-semibold">✓ verified</span> : <span className="text-[#fbbf24]">unverified</span>}</span>
                <span>📍 {(data.user.location as string) || "—"}</span>
                <span>📅 Joined {fmtDate(data.user.created_at as string)}</span>
              </div>

              {/* Risk flags */}
              {(data.flags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(data.flags ?? []).map((f) => <FlagPill key={f} flag={f} />)}
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-6">

              {isContractor ? (
                <>
                  {/* ID + Insurance documents */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* ID Verification */}
                    <div className="border border-[#23252a] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide">ID Verification</p>
                        {vBadge(vStatus)}
                      </div>
                      {idDocUrl ? (
                        <a href={idDocUrl} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={idDocUrl} alt="ID document" className="w-full h-24 object-cover rounded-lg border border-[#23252a] hover:opacity-90 transition-opacity" />
                          <p className="text-xs text-[#60A5FA] mt-1 hover:underline">View full document ↗</p>
                        </a>
                      ) : (
                        <div className="w-full h-24 bg-[#141516] rounded-lg flex items-center justify-center text-[#8a8f98] text-xs">No document uploaded</div>
                      )}
                    </div>

                    {/* Insurance */}
                    <div className="border border-[#23252a] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide">Insurance</p>
                        {vBadge(iStatus)}
                      </div>
                      {insDocUrl ? (
                        <a href={insDocUrl} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={insDocUrl} alt="Insurance document" className="w-full h-24 object-cover rounded-lg border border-[#23252a] hover:opacity-90 transition-opacity" />
                          <p className="text-xs text-[#60A5FA] mt-1 hover:underline">View full document ↗</p>
                        </a>
                      ) : (
                        <div className="w-full h-24 bg-[#141516] rounded-lg flex items-center justify-center text-[#8a8f98] text-xs">No document uploaded</div>
                      )}
                    </div>
                  </div>

                  {/* Performance metrics */}
                  <div>
                    <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Performance</p>
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Rating" value={data.profile?.rating ? `${Number(data.profile.rating).toFixed(1)} ★` : "—"} sub={`${data.profile?.rating_count ?? 0} reviews`} color="text-[#fbbf24]" />
                      <StatCard label="Win Rate" value={`${data.earnings?.winRate ?? 0}%`} sub={`${data.earnings?.wonBids ?? 0} of ${data.earnings?.totalBids ?? 0} bids`} color="text-[#60A5FA]" />
                      <StatCard label="Avg Response" value={data.stats?.avg_response_hours ? `${Number(data.stats.avg_response_hours).toFixed(1)}h` : "—"} sub="response time" color="text-[#60A5FA]" />
                      <StatCard label="Strikes" value={(data.profile?.strike_count as number) ?? 0} color={(data.profile?.strike_count as number) > 0 ? "text-[#f87171]" : "text-[#8a8f98]"} />
                      <StatCard label="No-Shows" value={(data.stats?.no_show_count as number) ?? 0} color={(data.stats?.no_show_count as number) > 0 ? "text-[#fbbf24]" : "text-[#8a8f98]"} />
                      <StatCard label="Cancellations" value={(data.stats?.cancellation_count as number) ?? 0} color={(data.stats?.cancellation_count as number) > 1 ? "text-[#fbbf24]" : "text-[#8a8f98]"} />
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="bg-gradient-to-r from-[#27a644]/10 to-[#27a644]/10 border border-[#27a644]/30 rounded-2xl p-4">
                    <p className="text-xs font-bold text-[#34d399] uppercase tracking-wide mb-3">Earnings Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#34d399]">{fmtUSD(data.earnings?.total_earned_cents ?? 0)}</p>
                        <p className="text-xs text-[#34d399]">Contractor Earned</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#34d399]">{fmtUSD(data.earnings?.platform_revenue_cents ?? 0)}</p>
                        <p className="text-xs text-[#34d399]">Platform Captured</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#d0d6e0]">{fmtUSD(data.earnings?.avgBidCents ?? 0)}</p>
                        <p className="text-xs text-[#8a8f98]">Avg Bid</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent reviews */}
                  {(data.reviews ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Recent Reviews</p>
                      <div className="space-y-3">
                        {(data.reviews ?? []).slice(0, 5).map((r) => (
                          <div key={r.id} className="bg-[#010102] rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  {Array.from({ length: r.rating }, (_, i) => <span key={`full-${i}`} className="text-[#fbbf24] text-sm">★</span>)}
                                  {Array.from({ length: 5 - r.rating }, (_, i) => <span key={`empty-${i}`} className="text-[#8a8f98] text-sm">☆</span>)}
                                </div>
                                {r.comment && <p className="text-sm text-[#d0d6e0] italic">&ldquo;{r.comment}&rdquo;</p>}
                                <p className="text-xs text-[#8a8f98] mt-1">{r.reviewer_name} · {r.job_title}</p>
                              </div>
                              <p className="text-xs text-[#8a8f98] shrink-0">{fmtDate(r.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active jobs */}
                  {(data.activeJobs ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Active Jobs</p>
                      <div className="space-y-2">
                        {(data.activeJobs ?? []).map((j) => (
                          <div key={j.id} className="flex items-center justify-between bg-[#010102] rounded-xl px-4 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#d0d6e0]">{j.title}</p>
                              <p className="text-xs text-[#8a8f98]">{j.location}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#34d399]">{fmtUSD(j.bid_price)}</p>
                              <span className="text-xs bg-[#fbbf24]/10 text-[#fbbf24] px-2 py-0.5 rounded-full">{j.status.replace(/_/g," ")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strike history */}
                  {(data.strikes ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Strike History</p>
                      <div className="space-y-2">
                        {(data.strikes ?? []).map((s) => (
                          <div key={s.id} className="flex items-start justify-between bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl px-4 py-2.5">
                            <p className="text-sm text-[#f87171]">{s.reason}</p>
                            <p className="text-xs text-[#f87171] shrink-0 ml-3">{fmtDate(s.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Client stats */}
                  <div>
                    <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Activity</p>
                    <div className="grid grid-cols-4 gap-3">
                      <StatCard label="Jobs Posted" value={data.spend?.totalJobs ?? 0} color="text-[#60A5FA]" />
                      <StatCard label="Completed" value={data.spend?.completed_jobs ?? 0} color="text-[#34d399]" />
                      <StatCard label="Active" value={data.spend?.activeJobs ?? 0} color="text-[#fbbf24]" />
                      <StatCard label="Cancelled" value={data.spend?.cancelledJobs ?? 0} color={(data.spend?.cancelledJobs ?? 0) > 2 ? "text-[#f87171]" : "text-[#8a8f98]"} />
                    </div>
                  </div>

                  {/* Spend */}
                  <div className="bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-2xl p-4">
                    <p className="text-xs font-bold text-[#60A5FA] uppercase tracking-wide mb-2">Spend Summary</p>
                    <p className="text-2xl font-bold text-[#60A5FA]">{fmtUSD(data.spend?.total_spent_cents ?? 0)}</p>
                    <p className="text-xs text-[#60A5FA] mt-0.5">Total spent across {data.spend?.completed_jobs ?? 0} completed jobs</p>
                  </div>

                  {/* Top categories */}
                  {(data.topCats ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Top Categories</p>
                      <div className="flex flex-wrap gap-2">
                        {(data.topCats ?? []).map((c) => (
                          <span key={c.category} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141516] text-sm text-[#d0d6e0]">
                            <span className="capitalize">{c.category.replace(/_/g," ")}</span>
                            <span className="text-xs text-[#8a8f98]">({c.c})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent jobs */}
                  {(data.jobs ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Recent Jobs</p>
                      <div className="space-y-2">
                        {(data.jobs ?? []).slice(0, 8).map((j) => (
                          <div key={j.id} className="flex items-center justify-between bg-[#010102] rounded-xl px-4 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#d0d6e0]">{j.title}</p>
                              <p className="text-xs text-[#8a8f98] capitalize">{j.category.replace(/_/g," ")} · {j.bid_count} bids</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.status === "completed" ? "bg-[#27a644]/10 text-[#34d399]" : j.status === "cancelled" ? "bg-[#f87171]/10 text-[#f87171]" : "bg-[#3B82F6]/10 text-[#60A5FA]"}`}>{j.status.replace(/_/g," ")}</span>
                              <p className="text-xs text-[#8a8f98] mt-0.5">{fmtDate(j.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disputes */}
                  {(data.disputes ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#8a8f98] uppercase tracking-wide mb-3">Disputes Filed</p>
                      <div className="space-y-2">
                        {(data.disputes ?? []).map((d) => (
                          <div key={d.id} className="flex items-start justify-between bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-xl px-4 py-2.5">
                            <div>
                              <p className="text-sm text-[#fbbf24] font-medium">{d.job_title}</p>
                              <p className="text-xs text-[#fbbf24]">{d.reason}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${d.status === "resolved" ? "bg-[#27a644]/10 text-[#34d399]" : "bg-[#fbbf24]/10 text-[#fbbf24]"}`}>{d.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <ActionPanel
                personId={personId}
                isContractor={isContractor}
                isSuspended={isSuspended}
                onSuccess={load}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabFilter = "all" | "contractors" | "clients" | "flagged";
type SortOption = "newest" | "rating" | "jobs" | "revenue";

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ all: 0, contractors: 0, clients: 0, flagged: 0 });

  const fetchPeople = useCallback(async (pg = 1, q = search, t = tab, s = sort, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: "25" });
    if (q) params.set("search", q);
    if (t === "contractors") params.set("role", "contractor");
    if (t === "clients") params.set("role", "consumer");
    if (t === "flagged") params.set("flagged", "1");
    params.set("sort", s);
    f.forEach((fv) => params.append("filter", fv));
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setPeople(data.users ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setPage(pg);
    if (data.counts) setCounts(data.counts);
    setLoading(false);
  }, [search, tab, sort, filters]);

  useEffect(() => { fetchPeople(1); }, [tab, sort]);

  function toggleFilter(f: string) {
    const next = new Set(filters);
    if (next.has(f)) next.delete(f); else next.add(f);
    setFilters(next);
    fetchPeople(1, search, tab, sort, next);
  }

  const FILTER_CHIPS = [
    { key: "suspended", label: "Suspended" },
    { key: "unverified", label: "Unverified ID" },
    { key: "uninsured", label: "Uninsured" },
    { key: "has_strikes", label: "Has Strikes" },
    { key: "phone_unverified", label: "Phone Unverified" },
    { key: "pending_verification", label: "Pending Review" },
  ];

  const TAB_ITEMS: { id: TabFilter; label: string; count: number }[] = [
    { id: "all", label: "All People", count: counts.all || total },
    { id: "contractors", label: "Contractors", count: counts.contractors },
    { id: "clients", label: "Clients", count: counts.clients },
    { id: "flagged", label: "⚠ Flagged", count: counts.flagged },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#d0d6e0]">People</h1>
        <p className="text-[#8a8f98] text-sm mt-1">Full visibility into every contractor and client on the platform</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141516] p-1 rounded-xl w-fit mb-6">
        {TAB_ITEMS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? "bg-[#0f1011] shadow-sm text-[#f7f8f8]" : "text-[#8a8f98] hover:text-[#d0d6e0]"}`}>
            {t.label} {t.count > 0 && <span className="ml-1 text-xs opacity-60">({t.count.toLocaleString()})</span>}
          </button>
        ))}
      </div>

      {/* Search + sort + filter chips */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm p-4 mb-6 space-y-3">
        <div className="flex gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchPeople(1, search); }}
            placeholder="Search by name, email, phone, or account number…"
            className="flex-1 border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40" />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 bg-[#0f1011]">
            <option value="newest">Newest first</option>
            <option value="rating">Highest rated</option>
            <option value="jobs">Most jobs</option>
            <option value="revenue">Most revenue</option>
          </select>
          <button onClick={() => fetchPeople(1, search)}
            className="px-5 py-2 bg-[#0f1011] text-white text-sm font-medium rounded-lg hover:bg-[#141516] transition-colors cursor-pointer">
            Search
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((c) => (
            <button key={c.key} onClick={() => toggleFilter(c.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${filters.has(c.key) ? "bg-[#0f1011] text-white border-[#23252a]" : "bg-[#0f1011] text-[#8a8f98] border-[#23252a] hover:border-[#23252a]"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#23252a] border-t-slate-700 rounded-full" />
          </div>
        ) : people.length === 0 ? (
          <div className="text-center py-16 text-[#8a8f98]">No people found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#23252a] bg-[#010102] text-left">
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98]">Person</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98]">Contact</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98] text-center">Rating</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98] text-center">Jobs</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98] text-center">Docs</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#34d399] text-right">Revenue</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98] text-center">Flags</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#8a8f98] text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const isContractor = p.role === "contractor";
                  const isSuspended = !!p.is_suspended;
                  const flags: string[] = [];
                  if (isSuspended) flags.push("SUSPENDED");
                  if (isContractor) {
                    if (p.verification_status === "pending") flags.push("ID_PENDING");
                    if (p.insurance_status === "pending") flags.push("INSURANCE_PENDING");
                    if ((p.strike_count ?? 0) >= 2) flags.push("HIGH_STRIKES");
                    else if ((p.strike_count ?? 0) === 1) flags.push("HAS_STRIKE");
                  }
                  if (!p.phone_verified) flags.push("PHONE_UNVERIFIED");

                  return (
                    <tr key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`border-b border-[#23252a] hover:bg-[#3B82F6]/15 cursor-pointer transition-colors ${isSuspended ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isContractor ? "bg-indigo-500" : "bg-emerald-500"}`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#d0d6e0] leading-tight">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isContractor ? "bg-[#3B82F6]/10 text-[#60A5FA]" : "bg-[#27a644]/10 text-[#34d399]"}`}>{isContractor ? "Pro" : "Client"}</span>
                              {p.account_number && <span className="text-[10px] text-[#8a8f98] font-mono">{p.account_number}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-[#8a8f98]">{p.email}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-[#8a8f98]">{p.phone || "—"}</span>
                          {p.phone_verified ? <span className="text-[10px] text-[#34d399] font-semibold">✓</span> : <span className="text-[10px] text-[#fbbf24]">!</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isContractor && p.rating ? (
                          <div>
                            <span className="text-[#fbbf24] font-semibold">{Number(p.rating).toFixed(1)} ★</span>
                            <p className="text-[10px] text-[#8a8f98]">({p.rating_count ?? 0})</p>
                          </div>
                        ) : <span className="text-[#8a8f98]">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isContractor ? (
                          <div>
                            <span className="font-medium text-[#d0d6e0]">{p.completed_jobs ?? 0}</span>
                            <span className="text-[#8a8f98] text-xs"> done</span>
                            {(p.strike_count ?? 0) > 0 && (
                              <p className="text-[10px] text-[#f87171] font-semibold">{p.strike_count} strike{(p.strike_count ?? 0) > 1 ? "s" : ""}</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-[#d0d6e0]">{p.total_jobs ?? 0}</span>
                            <span className="text-[#8a8f98] text-xs"> posted</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isContractor ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.verification_status === "approved" ? "bg-[#27a644]/10 text-[#34d399]" : p.verification_status === "pending" ? "bg-[#fbbf24]/10 text-[#fbbf24]" : "bg-[#141516] text-[#8a8f98]"}`}>
                              ID {p.verification_status === "approved" ? "✓" : p.verification_status === "pending" ? "⏳" : "—"}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.insurance_status === "approved" ? "bg-[#27a644]/10 text-[#34d399]" : p.insurance_status === "pending" ? "bg-[#fbbf24]/10 text-[#fbbf24]" : "bg-[#141516] text-[#8a8f98]"}`}>
                              Ins {p.insurance_status === "approved" ? "✓" : p.insurance_status === "pending" ? "⏳" : "—"}
                            </span>
                          </div>
                        ) : <span className="text-[#8a8f98] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isContractor && (p.platform_revenue_cents ?? 0) > 0 ? (
                          <span className="font-semibold text-[#34d399] text-sm">{fmtUSD(p.platform_revenue_cents ?? 0)}</span>
                        ) : !isContractor && (p.total_spent_cents ?? 0) > 0 ? (
                          <span className="font-semibold text-[#60A5FA] text-sm">{fmtUSD(p.total_spent_cents ?? 0)}</span>
                        ) : <span className="text-[#8a8f98]">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {flags.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            {flags.slice(0, 2).map((f) => <FlagPill key={f} flag={f} />)}
                            {flags.length > 2 && <span className="text-[10px] text-[#8a8f98]">+{flags.length - 2}</span>}
                          </div>
                        ) : <span className="text-[#34d399] text-xs font-medium">✓ Clean</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-[#8a8f98]">{fmtDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#23252a]">
            <p className="text-xs text-[#8a8f98]">Page {page} of {pages} · {total.toLocaleString()} people</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchPeople(page - 1)} className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40 transition-colors cursor-pointer">Previous</button>
              <button disabled={page >= pages} onClick={() => fetchPeople(page + 1)} className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40 transition-colors cursor-pointer">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <DetailDrawer personId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
