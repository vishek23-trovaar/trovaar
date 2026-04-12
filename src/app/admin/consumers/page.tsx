"use client";

import { useState, useEffect, useCallback } from "react";
import SortableHeader from "@/components/admin/SortableHeader";
import EditUserModal from "@/components/admin/EditUserModal";
import Toast from "@/components/admin/Toast";
import BulkActionBar from "@/components/admin/BulkActionBar";
import InlineDeleteButton from "@/components/admin/InlineDeleteButton";

interface Consumer {
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
  total_jobs: number;
  total_spent_cents: number;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMoney(cents: number) {
  return `$${((cents ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

type StatusFilter = "all" | "suspended" | "active" | "unverified";
type Dir = "asc" | "desc";

export default function AdminConsumersPage() {
  const [users, setUsers] = useState<Consumer[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<Dir>("desc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [editUser, setEditUser] = useState<Consumer | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(
    async (p = 1, s = search, currentSort = sort, currentDir = dir, currentStatusFilter = statusFilter) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: "20",
        role: "consumer",
        sort: currentSort,
        dir: currentDir,
      });
      if (s) params.set("search", s);
      if (currentStatusFilter === "suspended") params.append("filter", "suspended");
      if (currentStatusFilter === "unverified") params.append("filter", "phone_unverified");
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(p);
      setLoading(false);
    },
    [search, sort, dir, statusFilter]
  );

  useEffect(() => {
    fetchUsers(1, search, sort, dir, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, dir, statusFilter]);

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
      fetchUsers(page, search, sort, dir, statusFilter);
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
      setToast("Consumer deleted successfully.");
      fetchUsers(page, search, sort, dir, statusFilter);
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
    fetchUsers(page, search, sort, dir, statusFilter);
  }

  return (
    <div className="p-8 max-w-7xl">
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consumers</h1>
          <p className="text-slate-500 text-sm mt-1">{total.toLocaleString()} registered clients</p>
        </div>
        <a
          href="/api/admin/export?type=consumers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Search + status filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(1, search, sort, dir, statusFilter); }}
            placeholder="Search by name, email, phone, or account number..."
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="unverified">Unverified Phone</option>
          </select>
          <button
            onClick={() => fetchUsers(1, search, sort, dir, statusFilter)}
            className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-700 rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No consumers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={e => e.target.checked ? setSelected(new Set(users.map(u => u.id))) : setSelected(new Set())}
                      checked={selected.size === users.length && users.length > 0}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <SortableHeader col="name" label="Name" sort={sort} dir={dir} onSort={onSort} className="px-6" />
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">Account #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Verified</th>
                  <SortableHeader col="total_jobs" label="Jobs Posted" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="platform_revenue" label="Total Spent" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="created_at" label="Joined" sort={sort} dir={dir} onSort={onSort} className="px-6" />
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(u.id) : s.delete(u.id);
                          setSelected(s);
                        }}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {u.account_number
                        ? <span className="font-mono text-xs font-semibold text-slate-700">{u.account_number}</span>
                        : <span className="text-slate-300 text-xs italic">&mdash;</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      <p>{u.email}</p>
                      {u.phone && <p className="text-slate-400 mt-0.5">{u.phone}</p>}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-medium ${u.email_verified ? "text-emerald-600" : "text-amber-500"}`}>
                          {u.email_verified ? "Email verified" : "Email unverified"}
                        </span>
                        <span className={`text-xs font-medium ${u.phone_verified ? "text-emerald-600" : "text-slate-400"}`}>
                          {u.phone_verified ? "Phone verified" : "Phone unverified"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-slate-800 font-semibold">{u.total_jobs ?? 0}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-slate-800 font-semibold">{fmtMoney(u.total_spent_cents)}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
                    <td className="px-6 py-3">
                      {u.is_suspended
                        ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Suspended</span>
                        : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => setEditUser(u)}
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Edit
                        </button>
                        {u.is_suspended ? (
                          <button
                            onClick={() => handleAction(u.id, "unsuspend")}
                            disabled={actionLoading === u.id + "unsuspend"}
                            className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, "suspend")}
                            disabled={actionLoading === u.id + "suspend"}
                            className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {pages} &middot; {total.toLocaleString()} consumers</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchUsers(page - 1, search, sort, dir, statusFilter)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages} onClick={() => fetchUsers(page + 1, search, sort, dir, statusFilter)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40">
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
            setToast("Consumer updated successfully.");
            fetchUsers(page, search, sort, dir, statusFilter);
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
