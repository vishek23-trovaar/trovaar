"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface Invoice {
  id: number;
  invoice_number: string;
  job_id: string;
  job_title: string;
  job_category: string;
  consumer_name: string;
  subtotal_cents: number;
  platform_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

interface InvoiceStats {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  count: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContractorInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/contractor/invoices?status=${statusFilter}`
        : "/api/contractor/invoices";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setStats(data.stats || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contractor/dashboard" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <ScrollReveal delay={0}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-xl font-bold text-gray-900">{stats.count}</p>
            <p className="text-xs text-gray-500 mt-1">Total Invoices</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-xl font-bold text-indigo-600">{formatCents(stats.total_invoiced)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Invoiced</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-xl font-bold text-green-600">{formatCents(stats.total_paid)}</p>
            <p className="text-xs text-gray-500 mt-1">Paid</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-xl font-bold text-amber-600">{formatCents(stats.total_outstanding)}</p>
            <p className="text-xs text-gray-500 mt-1">Outstanding</p>
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {["", "draft", "sent", "paid"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold text-gray-800">No invoices yet</p>
          <p className="text-sm text-gray-500 mt-1">Invoices are auto-created when jobs are completed.</p>
        </div>
      ) : (
        <ScrollReveal delay={100}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-2">Invoice #</div>
            <div className="col-span-3">Job</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Date</div>
          </div>
          <div className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/contractor/invoices/${inv.id}`}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 hover:bg-gray-50 transition-all duration-200 items-center"
              >
                <div className="sm:col-span-2">
                  <p className="text-sm font-mono font-medium text-gray-900">{inv.invoice_number}</p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-sm text-gray-900 truncate">{inv.job_title}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-600 truncate">{inv.consumer_name}</p>
                </div>
                <div className="sm:col-span-2 text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCents(inv.total_cents)}</p>
                </div>
                <div className="sm:col-span-1">
                  <StatusBadge status={inv.status} />
                </div>
                <div className="sm:col-span-2 text-right">
                  <p className="text-xs text-gray-500">{formatDate(inv.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        </ScrollReveal>
      )}
    </div>
  );
}
