"use client";

import { useState, useEffect, useCallback } from "react";
import SortableHeader from "@/components/admin/SortableHeader";
import EditUserModal from "@/components/admin/EditUserModal";
import Toast from "@/components/admin/Toast";
import BulkActionBar from "@/components/admin/BulkActionBar";
import InlineDeleteButton from "@/components/admin/InlineDeleteButton";

interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  role: "consumer" | "contractor";
  account_number: string | null;
  created_at: string;
  phone_verified: number;
  email_verified: number;
  is_suspended: number | null;
  strike_count: number | null;
  verification_status: string | null;
  insurance_status: string | null;
  rating: number | null;
  rating_count: number | null;
  completed_jobs: number | null;
  platform_revenue_cents: number;
  contractor_type: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMoney(cents: number) {
  return `$${((cents ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "none";
  const styles: Record<string, string> = {
    approved: "bg-[#27a644]/10 text-[#34d399]",
    pending:  "bg-[#fbbf24]/10 text-[#fbbf24]",
    rejected: "bg-[#f87171]/10 text-[#f87171]",
    none:     "bg-[#141516] text-[#8a8f98]",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[s] ?? styles.none}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

type ContractorFilter = "all" | "pending_verification" | "suspended" | "has_strikes" | "unverified";
type Dir = "asc" | "desc";

export default function AdminContractorsPage() {
  const [users, setUsers] = useState<Contractor[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContractorFilter>("all");
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<Dir>("desc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [editUser, setEditUser] = useState<Contractor | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(
    async (p = 1, s = search, f = filter, currentSort = sort, currentDir = dir) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: "20",
        role: "contractor",
        sort: currentSort,
        dir: currentDir,
      });
      if (s) params.set("search", s);
      if (f !== "all") params.append("filter", f);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(p);
      setLoading(false);
    },
    [search, filter, sort, dir]
  );

  useEffect(() => {
    fetchUsers(1, search, filter, sort, dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, dir]);

  function onSort(col: string) {
    if (col === sort) {
      const newDir: Dir = dir === "asc" ? "desc" : "asc";
      setDir(newDir);
    } else {
      setSort(col);
      setDir("desc");
    }
  }

  async function handleAction(userId: string, action: string) {
    setActionLoading(userId + action);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      setToast("Done.");
      fetchUsers(page, search, filter, sort, dir);
    } else {
      const d = await res.json();
      setToast(d.error ?? "Failed.");
    }
    setActionLoading(null);
  }

  async function handleDelete(userId: string) {
    const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setToast("Contractor deleted successfully.");
      fetchUsers(page, search, filter, sort, dir);
    } else {
      const data = await res.json();
      setToast(data.error ?? "Delete failed.");
    }
  }

  async function handleBulkAction(action: string) {
    await fetch("/api/admin/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    setSelected(new Set());
    setToast(`Bulk ${action} completed.`);
    fetchUsers(page, search, filter, sort, dir);
  }

  const FILTERS = [
    { id: "all" as const, label: "All" },
    { id: "pending_verification" as const, label: "Pending Review" },
    { id: "suspended" as const, label: "Suspended" },
    { id: "has_strikes" as const, label: "Has Strikes" },
    { id: "unverified" as const, label: "Unverified" },
  ];

  return (
    <div className="p-8 max-w-7xl">
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#d0d6e0]">Contractors</h1>
          <p className="text-[#8a8f98] text-sm mt-1">{total.toLocaleString()} registered contractors</p>
        </div>
        <a
          href="/api/admin/export?type=contractors"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#27a644]/10 text-[#34d399] border border-[#27a644]/30 rounded-lg hover:bg-[#27a644]/15 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Search + filter */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(1, search, filter, sort, dir); }}
            placeholder="Search by name, email, phone, or account number..."
            className="flex-1 border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40"
          />
          <button
            onClick={() => fetchUsers(1, search, filter, sort, dir)}
            className="px-5 py-2 bg-[#0f1011] text-white text-sm font-medium rounded-lg hover:bg-[#141516] transition-colors"
          >
            Search
          </button>
        </div>
        <div className="flex gap-1 mt-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id ? "bg-[#0f1011] text-white" : "text-[#8a8f98] hover:bg-[#141516]"
              }`}
            >
              {f.label}
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
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-[#8a8f98]">No contractors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#23252a] bg-[#010102]">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={e => e.target.checked ? setSelected(new Set(users.map(u => u.id))) : setSelected(new Set())}
                      checked={selected.size === users.length && users.length > 0}
                      className="rounded border-[#23252a]"
                    />
                  </th>
                  <SortableHeader col="name" label="Name" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98] whitespace-nowrap">Account #</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98]">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98]">ID / Insurance</th>
                  <SortableHeader col="rating" label="Rating" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="completed_jobs" label="Jobs Done" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="platform_revenue" label="Revenue" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="strike_count" label="Strikes" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="created_at" label="Joined" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-right px-5 py-3 text-xs font-medium text-[#8a8f98]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`border-b border-[#23252a] hover:bg-[#141516] transition-colors ${u.is_suspended ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(u.id) : s.delete(u.id);
                          setSelected(s);
                        }}
                        className="rounded border-[#23252a]"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-xs font-bold text-[#60A5FA] shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#d0d6e0]">{u.name}</p>
                          {u.contractor_type && (
                            <p className="text-xs text-[#8a8f98] capitalize">{u.contractor_type}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.account_number
                        ? <span className="font-mono text-xs font-semibold text-[#d0d6e0]">{u.account_number}</span>
                        : <span className="text-[#8a8f98] text-xs italic">&mdash;</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8a8f98]">
                      <p>{u.email}</p>
                      {u.phone && <p className="text-[#8a8f98] mt-0.5">{u.phone}</p>}
                      <div className="flex gap-1 mt-1">
                        {!!u.email_verified && <span className="text-[#34d399] text-xs">Email verified</span>}
                        {!!u.phone_verified && <span className="text-[#34d399] text-xs">Phone verified</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#8a8f98]">ID</span>
                          <StatusBadge status={u.verification_status} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#8a8f98]">Ins</span>
                          <StatusBadge status={u.insurance_status} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.rating ? (
                        <div>
                          <span className="font-semibold text-[#d0d6e0]">{Number(u.rating).toFixed(1)}</span>
                          <p className="text-xs text-[#8a8f98]">{u.rating_count} reviews</p>
                        </div>
                      ) : (
                        <span className="text-[#8a8f98] text-xs">No ratings</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-[#d0d6e0]">{u.completed_jobs ?? 0}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-[#d0d6e0]">{fmtMoney(u.platform_revenue_cents)}</span>
                    </td>
                    <td className="px-5 py-3">
                      {(u.strike_count ?? 0) > 0 ? (
                        <span className="text-xs bg-[#f87171]/10 text-[#f87171] px-2 py-0.5 rounded-full font-semibold">
                          {u.strike_count} strike{(u.strike_count ?? 0) !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-[#8a8f98]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8a8f98]">{fmtDate(u.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => setEditUser(u)}
                          className="text-xs px-2.5 py-1 bg-[#141516] text-[#d0d6e0] rounded-lg hover:bg-[#18191a] transition-colors"
                        >
                          Edit
                        </button>
                        {u.is_suspended ? (
                          <button
                            onClick={() => handleAction(u.id, "unsuspend")}
                            disabled={actionLoading === u.id + "unsuspend"}
                            className="text-xs px-2.5 py-1 bg-[#27a644]/10 text-[#34d399] rounded-lg hover:bg-[#27a644]/20 disabled:opacity-50"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, "suspend")}
                            disabled={actionLoading === u.id + "suspend"}
                            className="text-xs px-2.5 py-1 bg-[#f87171]/10 text-[#f87171] rounded-lg hover:bg-[#f87171]/20 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        <InlineDeleteButton onConfirm={() => handleDelete(u.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#23252a]">
            <p className="text-xs text-[#8a8f98]">Page {page} of {pages} &middot; {total.toLocaleString()} contractors</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchUsers(page - 1, search, filter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages} onClick={() => fetchUsers(page + 1, search, filter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            setToast("Contractor updated successfully.");
            fetchUsers(page, search, filter, sort, dir);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Suspend Selected", key: "suspend", variant: "warning" },
          { label: "Unsuspend Selected", key: "unsuspend", variant: "success" },
          { label: "Delete Selected", key: "delete", variant: "danger" },
        ]}
        onAction={handleBulkAction}
      />
    </div>
  );
}
