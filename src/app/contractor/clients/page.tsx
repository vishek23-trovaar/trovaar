"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface ClientRow {
  consumer_id: string;
  name: string;
  email: string;
  location: string | null;
  first_job_date: string | null;
  last_job_date: string | null;
  total_jobs: number;
  total_earned_cents: number;
  notes: string | null;
  is_favorite: number;
  client_record_id: number | null;
}

interface ClientStats {
  totalClients: number;
  repeatClients: number;
  totalEarned: number;
  avgPerClient: number;
}

interface ClientJob {
  id: string;
  title: string;
  category: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  price: number;
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContractorClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Expanded client detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<ClientJob[]>([]);
  const [expandedNotes, setExpandedNotes] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contractor/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setStats(data.stats || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function toggleFavorite(consumerId: string, current: number) {
    try {
      await fetch(`/api/contractor/clients/${consumerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: current ? 0 : 1 }),
      });
      setClients((prev) =>
        prev.map((c) =>
          c.consumer_id === consumerId ? { ...c, is_favorite: current ? 0 : 1 } : c
        )
      );
    } catch { /* silent */ }
  }

  async function expandClient(consumerId: string) {
    if (expandedId === consumerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(consumerId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/contractor/clients/${consumerId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedJobs(data.jobs || []);
        setExpandedNotes(data.client?.notes || "");
      }
    } catch { /* silent */ }
    setDetailLoading(false);
  }

  async function saveNotes(consumerId: string) {
    setSavingNotes(true);
    try {
      await fetch(`/api/contractor/clients/${consumerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: expandedNotes }),
      });
      setClients((prev) =>
        prev.map((c) =>
          c.consumer_id === consumerId ? { ...c, notes: expandedNotes } : c
        )
      );
    } catch { /* silent */ }
    setSavingNotes(false);
  }

  const filteredClients = clients.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesFav = !showFavoritesOnly || c.is_favorite;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contractor/dashboard" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{stats.totalClients}</p>
            <p className="text-xs text-gray-500 mt-1">Total Clients</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-indigo-600">{stats.repeatClients}</p>
            <p className="text-xs text-gray-500 mt-1">Repeat Clients</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-green-600">{formatCents(stats.totalEarned)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Earned</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-amber-600">{formatCents(stats.avgPerClient)}</p>
            <p className="text-xs text-gray-500 mt-1">Avg per Client</p>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-3 mb-6 flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
            showFavoritesOnly
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {showFavoritesOnly ? "★ Favorites" : "☆ Favorites"}
        </button>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-semibold text-gray-800">No clients yet</p>
          <p className="text-sm text-gray-500 mt-1">Complete your first job to see your client list.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div key={client.consumer_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => expandClient(client.consumer_id)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg font-semibold text-blue-700 shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{client.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(client.consumer_id, client.is_favorite); }}
                        className="text-lg cursor-pointer"
                        title={client.is_favorite ? "Remove favorite" : "Add to favorites"}
                      >
                        {client.is_favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {client.total_jobs} job{client.total_jobs !== 1 ? "s" : ""}
                      {client.last_job_date && <span> &middot; Last: {formatDate(client.last_job_date)}</span>}
                    </p>
                  </div>
                  {/* Earned */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCents(client.total_earned_cents)}</p>
                    <p className="text-xs text-gray-400">earned</p>
                  </div>
                  {/* Expand arrow */}
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === client.consumer_id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === client.consumer_id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                  {detailLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Past jobs */}
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Past Jobs</h4>
                      {expandedJobs.length === 0 ? (
                        <p className="text-sm text-gray-400 mb-4">No jobs found</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {expandedJobs.map((job) => (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors border border-gray-100"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">{job.title}</p>
                                <p className="text-xs text-gray-500">
                                  {job.completed_at ? formatDate(job.completed_at) : formatDate(job.created_at)}
                                  <span className={`ml-2 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                    job.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {job.status}
                                  </span>
                                </p>
                              </div>
                              <p className="text-sm font-medium text-gray-700">{formatCents(job.price)}</p>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</h4>
                      <div className="flex gap-2">
                        <textarea
                          value={expandedNotes}
                          onChange={(e) => setExpandedNotes(e.target.value)}
                          placeholder="Add notes about this client..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                          rows={2}
                        />
                        <button
                          onClick={() => saveNotes(client.consumer_id)}
                          disabled={savingNotes}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-end cursor-pointer"
                        >
                          {savingNotes ? "..." : "Save"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
