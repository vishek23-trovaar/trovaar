"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import SortableHeader from "@/components/admin/SortableHeader";
import EditJobModal from "@/components/admin/EditJobModal";
import Toast from "@/components/admin/Toast";
import BulkActionBar from "@/components/admin/BulkActionBar";
import InlineDeleteButton from "@/components/admin/InlineDeleteButton";

interface AdminJob {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string;
  urgency: string;
  created_at: string;
  payment_status: string;
  consumer_name: string;
  consumer_id: string;
  bid_count: number;
  accepted_bid_contractor_price: number | null;
  accepted_bid_client_price: number | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    posted: "bg-blue-100 text-blue-700",
    bidding: "bg-indigo-100 text-indigo-700",
    accepted: "bg-emerald-100 text-emerald-700",
    en_route: "bg-cyan-100 text-cyan-700",
    arrived: "bg-teal-100 text-teal-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[urgency] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {urgency}
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "posted", label: "Posted" },
  { value: "bidding", label: "Bidding" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "All Urgencies" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

type Dir = "asc" | "desc";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<Dir>("desc");
  const [editJob, setEditJob] = useState<AdminJob | null>(null);
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(
    async (
      currentPage = 1,
      currentSearch = search,
      currentStatus = statusFilter,
      currentUrgency = urgencyFilter,
      currentCategory = categoryFilter,
      currentSort = sort,
      currentDir = dir
    ) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        sort: currentSort,
        dir: currentDir,
      });
      if (currentSearch) params.set("search", currentSearch);
      if (currentStatus) params.set("status", currentStatus);
      if (currentUrgency) params.set("urgency", currentUrgency);
      if (currentCategory) params.set("category", currentCategory);
      const res = await fetch(`/api/admin/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(currentPage);
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
      setLoading(false);
    },
    [search, statusFilter, urgencyFilter, categoryFilter, sort, dir]
  );

  useEffect(() => {
    fetchJobs(1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, urgencyFilter, categoryFilter, sort, dir]);

  function onSort(col: string) {
    if (col === sort) {
      const newDir: Dir = dir === "asc" ? "desc" : "asc";
      setDir(newDir);
    } else {
      setSort(col);
      setDir("desc");
    }
  }

  async function handleDelete(jobId: string) {
    const res = await fetch(`/api/admin/jobs?jobId=${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setToast("Job deleted successfully.");
      fetchJobs(page, search, statusFilter, urgencyFilter, categoryFilter, sort, dir);
    } else {
      const data = await res.json();
      setToast(data.error ?? "Delete failed.");
    }
  }

  async function handleBulkAction(action: string) {
    await fetch("/api/admin/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action, type: "jobs" }),
    });
    setSelected(new Set());
    setToast(`Bulk ${action} completed.`);
    fetchJobs(page, search, statusFilter, urgencyFilter, categoryFilter, sort, dir);
  }

  return (
    <div className="p-8 max-w-7xl">
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total.toLocaleString()} total jobs
          </p>
        </div>
        <a
          href="/api/admin/export?type=jobs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                fetchJobs(1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir);
            }}
            placeholder="Search by job title..."
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            onClick={() => fetchJobs(1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
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
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={e => e.target.checked ? setSelected(new Set(jobs.map(j => j.id))) : setSelected(new Set())}
                      checked={selected.size === jobs.length && jobs.length > 0}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <SortableHeader col="title" label="Title" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Consumer</th>
                  <SortableHeader col="status" label="Status" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Urgency</th>
                  <SortableHeader col="bid_count" label="Bids" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="accepted_bid_price" label="Price" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="created_at" label="Created" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(j.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(j.id) : s.delete(j.id);
                          setSelected(s);
                        }}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 max-w-[200px] truncate" title={j.title}>
                        {j.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{j.location}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs capitalize">
                      {j.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{j.consumer_name}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-5 py-3">
                      <UrgencyBadge urgency={j.urgency} />
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium">
                      {j.bid_count}
                    </td>
                    <td className="px-5 py-3">
                      {j.accepted_bid_client_price != null ? (
                        <div>
                          <p className="text-slate-800 font-medium text-xs">
                            Client: {fmt(j.accepted_bid_client_price)}
                          </p>
                          {j.accepted_bid_contractor_price != null && (
                            <p className="text-slate-400 text-xs">
                              Contractor: {fmt(j.accepted_bid_contractor_price)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(j.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/jobs/${j.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setEditJob(j)}
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Edit
                        </button>
                        <InlineDeleteButton onConfirm={() => handleDelete(j.id)} />
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
              Page {page} of {pages} &middot; {total.toLocaleString()} jobs
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchJobs(page - 1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => fetchJobs(page + 1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editJob && (
        <EditJobModal
          job={editJob}
          onClose={() => setEditJob(null)}
          onSaved={() => {
            setEditJob(null);
            setToast("Job updated successfully.");
            fetchJobs(page, search, statusFilter, urgencyFilter, categoryFilter, sort, dir);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Delete Selected", key: "delete", variant: "danger" },
        ]}
        onAction={handleBulkAction}
      />
    </div>
  );
}
