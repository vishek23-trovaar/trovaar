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
    posted: "bg-[#3B82F6]/10 text-[#60A5FA]",
    bidding: "bg-[#3B82F6]/10 text-[#60A5FA]",
    accepted: "bg-[#27a644]/10 text-[#34d399]",
    en_route: "bg-[#27a644]/10 text-[#34d399]",
    arrived: "bg-[#27a644]/10 text-[#34d399]",
    in_progress: "bg-[#fbbf24]/10 text-[#fbbf24]",
    completed: "bg-[#27a644]/10 text-[#34d399]",
    cancelled: "bg-[#f87171]/10 text-[#f87171]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-[#141516] text-[#8a8f98]"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    low: "bg-[#141516] text-[#8a8f98]",
    medium: "bg-[#fbbf24]/10 text-[#fbbf24]",
    high: "bg-[#fbbf24]/10 text-[#fbbf24]",
    emergency: "bg-[#f87171]/10 text-[#f87171]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[urgency] ?? "bg-[#141516] text-[#8a8f98]"
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
          <h1 className="text-2xl font-bold text-[#d0d6e0]">Jobs</h1>
          <p className="text-[#8a8f98] text-sm mt-1">
            {total.toLocaleString()} total jobs
          </p>
        </div>
        <a
          href="/api/admin/export?type=jobs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#27a644]/10 text-[#34d399] border border-[#27a644]/30 rounded-lg hover:bg-[#27a644]/15 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm mb-6 p-4">
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
            className="flex-1 border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 bg-[#0f1011]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 bg-[#0f1011]"
          >
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#23252a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 bg-[#0f1011]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            onClick={() => fetchJobs(1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
            className="px-5 py-2 bg-[#0f1011] text-white text-sm font-medium rounded-lg hover:bg-[#141516] transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#23252a] border-t-slate-700 rounded-full" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-[#8a8f98]">No jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#23252a] bg-[#010102]">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={e => e.target.checked ? setSelected(new Set(jobs.map(j => j.id))) : setSelected(new Set())}
                      checked={selected.size === jobs.length && jobs.length > 0}
                      className="rounded border-[#23252a]"
                    />
                  </th>
                  <SortableHeader col="title" label="Title" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98]">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98]">Consumer</th>
                  <SortableHeader col="status" label="Status" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8a8f98]">Urgency</th>
                  <SortableHeader col="bid_count" label="Bids" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="accepted_bid_price" label="Price" sort={sort} dir={dir} onSort={onSort} />
                  <SortableHeader col="created_at" label="Created" sort={sort} dir={dir} onSort={onSort} />
                  <th className="text-right px-5 py-3 text-xs font-medium text-[#8a8f98]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-[#23252a] hover:bg-[#141516] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(j.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(j.id) : s.delete(j.id);
                          setSelected(s);
                        }}
                        className="rounded border-[#23252a]"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#d0d6e0] max-w-[200px] truncate" title={j.title}>
                        {j.title}
                      </p>
                      <p className="text-xs text-[#8a8f98] mt-0.5">{j.location}</p>
                    </td>
                    <td className="px-5 py-3 text-[#8a8f98] text-xs capitalize">
                      {j.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-[#8a8f98]">{j.consumer_name}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-5 py-3">
                      <UrgencyBadge urgency={j.urgency} />
                    </td>
                    <td className="px-5 py-3 text-[#d0d6e0] font-medium">
                      {j.bid_count}
                    </td>
                    <td className="px-5 py-3">
                      {j.accepted_bid_client_price != null ? (
                        <div>
                          <p className="text-[#d0d6e0] font-medium text-xs">
                            Client: {fmt(j.accepted_bid_client_price)}
                          </p>
                          {j.accepted_bid_contractor_price != null && (
                            <p className="text-[#8a8f98] text-xs">
                              Contractor: {fmt(j.accepted_bid_contractor_price)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8a8f98] text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#8a8f98] text-xs">{fmtDate(j.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/jobs/${j.id}`}
                          className="text-xs text-[#60A5FA] hover:underline font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setEditJob(j)}
                          className="text-xs px-2.5 py-1 bg-[#141516] text-[#d0d6e0] rounded-lg hover:bg-[#18191a] transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#23252a]">
            <p className="text-xs text-[#8a8f98]">
              Page {page} of {pages} &middot; {total.toLocaleString()} jobs
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchJobs(page - 1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => fetchJobs(page + 1, search, statusFilter, urgencyFilter, categoryFilter, sort, dir)}
                className="px-3 py-1.5 text-xs border border-[#23252a] rounded-lg hover:bg-[#141516] disabled:opacity-40"
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
