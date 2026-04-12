"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SortableHeader from "@/components/admin/SortableHeader";
import EditUserModal from "@/components/admin/EditUserModal";
import Toast from "@/components/admin/Toast";
import BulkActionBar from "@/components/admin/BulkActionBar";
import InlineDeleteButton from "@/components/admin/InlineDeleteButton";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "consumer" | "contractor";
  created_at: string;
  is_admin: number;
  is_suspended: number | null;
  strike_count: number | null;
  phone: string | null;
  location: string | null;
  account_number: string | null;
  email_verified?: number;
  phone_verified?: number;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type RoleFilter = "all" | "consumer" | "contractor";
type StatusFilter = "all" | "suspended" | "active" | "has_strikes" | "unverified";
type Dir = "asc" | "desc";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<Dir>("desc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(
    async (
      currentPage = 1,
      currentSearch = search,
      currentRole = roleFilter,
      currentSort = sort,
      currentDir = dir,
      currentStatusFilter = statusFilter
    ) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        sort: currentSort,
        dir: currentDir,
      });
      if (currentSearch) params.set("search", currentSearch);
      if (currentRole !== "all") params.set("role", currentRole);
      if (currentStatusFilter === "suspended") params.append("filter", "suspended");
      if (currentStatusFilter === "has_strikes") params.append("filter", "has_strikes");
      if (currentStatusFilter === "unverified") params.append("filter", "phone_unverified");
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(currentPage);
      setLoading(false);
    },
    [search, roleFilter, sort, dir, statusFilter]
  );

  useEffect(() => {
    fetchUsers(1, search, roleFilter, sort, dir, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, sort, dir, statusFilter]);

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
      setToast("Action applied successfully.");
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (action === "suspend") return { ...u, is_suspended: 1 };
          if (action === "unsuspend") return { ...u, is_suspended: 0 };
          if (action === "make_admin") return { ...u, is_admin: 1 };
          if (action === "remove_admin") return { ...u, is_admin: 0 };
          return u;
        })
      );
    } else {
      const data = await res.json();
      setToast(data.error ?? "Action failed.");
    }
    setActionLoading(null);
  }

  async function handleDelete(userId: string) {
    const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setToast("User deleted successfully.");
      fetchUsers(page, search, roleFilter, sort, dir, statusFilter);
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
    fetchUsers(page, search, roleFilter, sort, dir, statusFilter);
  }

  const ROLE_TABS: { id: RoleFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "consumer", label: "Consumers" },
    { id: "contractor", label: "Contractors" },
  ];

  return (
    <div className="p-8 max-w-7xl">
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total.toLocaleString()} total users
          </p>
        </div>
        <a
          href="/api/admin/export?type=users"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Search + role filter + status filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(1, search, roleFilter, sort, dir, statusFilter); }}
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
            <option value="has_strikes">Has Strikes</option>
            <option value="unverified">Unverified Phone</option>
          </select>
          <button
            onClick={() => fetchUsers(1, search, roleFilter, sort, dir, statusFilter)}
            className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Role tabs */}
        <div className="flex gap-1 mt-3">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === tab.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-700 rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No users found.</div>
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
                  <SortableHeader col="email" label="Email / Phone" sort={sort} dir={dir} onSort={onSort} className="px-6" />
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Role</th>
                  <SortableHeader col="created_at" label="Joined" sort={sort} dir={dir} onSort={onSort} className="px-6" />
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      u.is_suspended ? "opacity-60" : ""
                    }`}
                  >
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
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.name}</p>
                          {!!u.is_admin && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {u.account_number ? (
                        <span className="font-mono font-semibold text-slate-800 text-xs tracking-wide">
                          {u.account_number}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      <p>{u.email}</p>
                      {u.phone && <p className="text-slate-400 mt-0.5">{u.phone}</p>}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "consumer"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{fmtDate(u.created_at)}</td>
                    <td className="px-6 py-3">
                      {u.is_suspended ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link
                          href={`/profile/${u.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View
                        </Link>
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
                            className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, "suspend")}
                            disabled={actionLoading === u.id + "suspend"}
                            className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {u.is_admin ? (
                          <button
                            onClick={() => handleAction(u.id, "remove_admin")}
                            disabled={!!actionLoading}
                            className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                          >
                            Revoke Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, "make_admin")}
                            disabled={!!actionLoading}
                            className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors"
                          >
                            Make Admin
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Page {page} of {pages} &middot; {total.toLocaleString()} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchUsers(page - 1, search, roleFilter, sort, dir, statusFilter)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => fetchUsers(page + 1, search, roleFilter, sort, dir, statusFilter)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
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
            setToast("User updated successfully.");
            fetchUsers(page, search, roleFilter, sort, dir, statusFilter);
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
