"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  old_value: Record<string, unknown> | string | null;
  new_value: Record<string, unknown> | string | null;
  reversible: boolean;
  reversed: boolean;
  created_at: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const ACTION_LABELS: Record<string, string> = {
  suspend_user: "Suspended User",
  unsuspend_user: "Reinstated User",
  make_admin: "Granted Admin",
  remove_admin: "Removed Admin",
  edit_user: "Edited User",
  delete_user: "Deleted User",
  edit_job: "Edited Job",
  delete_job: "Deleted Job",
};

const ACTION_COLORS: Record<string, string> = {
  suspend_user: "bg-[#f87171]/10 text-[#f87171]",
  unsuspend_user: "bg-[#27a644]/10 text-[#34d399]",
  make_admin: "bg-[#3B82F6]/10 text-[#60A5FA]",
  remove_admin: "bg-[#fbbf24]/10 text-[#fbbf24]",
  edit_user: "bg-[#3B82F6]/10 text-[#60A5FA]",
  delete_user: "bg-[#f87171]/20 text-[#f87171]",
  edit_job: "bg-[#3B82F6]/10 text-[#60A5FA]",
  delete_job: "bg-[#f87171]/20 text-[#f87171]",
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function valueSummary(val: Record<string, unknown> | string | null): string {
  if (!val) return "—";
  if (typeof val === "string") return val.slice(0, 80);
  const entries = Object.entries(val).slice(0, 3).map(([k, v]) => `${k}: ${String(v ?? "—")}`);
  return entries.join(", ");
}

const ENTITY_TYPES = ["", "user", "job"];

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [undoing, setUndoing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" });
      if (entityTypeFilter) params.set("entity_type", entityTypeFilter);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json() as AuditResponse;
        setData(json);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, entityTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function handleUndo(logId: string) {
    setUndoing(logId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error ?? "Failed to undo");
      } else {
        await fetchLogs();
      }
    } catch {
      setErrorMsg("Something went wrong.");
    } finally {
      setUndoing(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f7f8f8]">Audit Log</h1>
        <p className="text-sm text-[#8a8f98] mt-1">Track all admin actions on users and jobs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {ENTITY_TYPES.map((et) => (
          <button
            key={et || "all"}
            onClick={() => { setEntityTypeFilter(et); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              entityTypeFilter === et
                ? "bg-[#0f1011] text-white"
                : "bg-[#141516] text-[#8a8f98] hover:bg-[#18191a]"
            }`}
          >
            {et ? et.charAt(0).toUpperCase() + et.slice(1) + "s" : "All"}
          </button>
        ))}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mb-4 bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl p-3 text-sm text-[#f87171]">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-7 h-7 border-4 border-[#23252a] border-t-transparent rounded-full" />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-semibold text-[#8a8f98]">No audit log entries yet</p>
            <p className="text-sm text-[#8a8f98] mt-1">Actions taken by admins will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#010102] border-b border-[#23252a]">
                  <th className="text-left px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">Time</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">Action</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">Entity</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">Old Value</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">New Value</th>
                  <th className="text-right px-5 py-3 font-semibold text-[#8a8f98] whitespace-nowrap">Undo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252a]">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#141516] transition-colors">
                    <td className="px-5 py-3 text-[#8a8f98] whitespace-nowrap">
                      <span title={new Date(log.created_at).toLocaleString()}>
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ACTION_COLORS[log.action] ?? "bg-[#141516] text-[#d0d6e0]"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#d0d6e0] truncate max-w-[160px]" title={log.entity_label ?? log.entity_id}>
                        {log.entity_label ?? log.entity_id}
                      </div>
                      <div className="text-xs text-[#8a8f98] capitalize">{log.entity_type}</div>
                    </td>
                    <td className="px-5 py-3 text-[#8a8f98] text-xs">
                      <span className="truncate block max-w-[180px]" title={valueSummary(log.old_value)}>
                        {valueSummary(log.old_value)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#8a8f98] text-xs">
                      <span className="truncate block max-w-[180px]" title={valueSummary(log.new_value)}>
                        {valueSummary(log.new_value)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {log.reversed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#27a644]/10 text-[#34d399]">
                          Undone
                        </span>
                      ) : log.reversible ? (
                        <button
                          onClick={() => handleUndo(log.id)}
                          disabled={undoing === log.id}
                          className="px-3 py-1 text-xs font-semibold bg-[#fbbf24]/10 text-[#fbbf24] rounded-lg hover:bg-[#fbbf24]/20 disabled:opacity-50 transition-colors"
                        >
                          {undoing === log.id ? "Undoing..." : "Undo"}
                        </button>
                      ) : (
                        <span className="text-xs text-[#8a8f98]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-[#8a8f98]">
            Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-[#0f1011] border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="px-3 py-1.5 text-sm bg-[#0f1011] border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
