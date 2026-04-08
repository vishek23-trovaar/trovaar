"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";

interface MaterialItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  cost_cents?: number;
  total_cents?: number;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  job_id: string;
  job_title: string;
  job_category: string;
  job_description: string;
  job_location: string;
  completed_at: string | null;
  contractor_id: string;
  consumer_id: string;
  contractor_name: string;
  contractor_email: string;
  contractor_phone: string | null;
  contractor_location: string | null;
  consumer_name: string;
  consumer_email: string;
  consumer_phone: string | null;
  consumer_location: string | null;
  labor_cents: number;
  materials_json: string;
  subtotal_cents: number;
  platform_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  status: string;
  notes: string | null;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Add line item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contractor/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user, invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const materials: MaterialItem[] = (() => {
    if (!invoice?.materials_json) return [];
    try { return JSON.parse(invoice.materials_json); } catch { return []; }
  })();

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/contractor/invoices/${invoiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      if (res.ok) fetchInvoice();
    } catch { /* silent */ }
    setSending(false);
  }

  async function handleAddLineItem(e: React.FormEvent) {
    e.preventDefault();
    setSavingItem(true);
    try {
      const priceInCents = Math.round(parseFloat(newPrice) * 100);
      const newItem: MaterialItem = {
        description: newDesc,
        quantity: newQty,
        unit_price_cents: priceInCents,
        cost_cents: priceInCents * newQty,
      };
      const updatedMaterials = [...materials, newItem];

      const res = await fetch(`/api/contractor/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials_json: JSON.stringify(updatedMaterials) }),
      });
      if (res.ok) {
        setShowAddItem(false);
        setNewDesc("");
        setNewQty(1);
        setNewPrice("");
        fetchInvoice();
      }
    } catch { /* silent */ }
    setSavingItem(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Invoice not found.</p>
        <Link href="/contractor/invoices" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Back to Invoices</Link>
      </div>
    );
  }

  const isContractor = user?.id === invoice.contractor_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contractor/invoices" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; All Invoices</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        {isContractor && (
          <div className="flex gap-2">
            {invoice.status === "draft" && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {sending ? "Sending..." : "Send to Client"}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer"
            >
              Print
            </button>
          </div>
        )}
      </div>

      {/* Invoice Document */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-none">
        {/* Invoice header */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">INVOICE</h2>
              <p className="text-sm text-gray-500">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Date: {formatDate(invoice.created_at)}</p>
              <p className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</p>
              {invoice.paid_at && <p className="text-sm text-green-600 font-medium">Paid: {formatDate(invoice.paid_at)}</p>}
            </div>
          </div>
        </div>

        {/* From / To */}
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">From</h4>
            <p className="text-sm font-medium text-gray-900">{invoice.contractor_name}</p>
            <p className="text-sm text-gray-600">{invoice.contractor_email}</p>
            {invoice.contractor_phone && <p className="text-sm text-gray-600">{invoice.contractor_phone}</p>}
            {invoice.contractor_location && <p className="text-sm text-gray-600">{invoice.contractor_location}</p>}
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Bill To</h4>
            <p className="text-sm font-medium text-gray-900">{invoice.consumer_name}</p>
            <p className="text-sm text-gray-600">{invoice.consumer_email}</p>
            {invoice.consumer_phone && <p className="text-sm text-gray-600">{invoice.consumer_phone}</p>}
            {invoice.consumer_location && <p className="text-sm text-gray-600">{invoice.consumer_location}</p>}
          </div>
        </div>

        {/* Job reference */}
        <div className="px-6 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            Job: <Link href={`/jobs/${invoice.job_id}`} className="text-blue-600 hover:underline">{invoice.job_title}</Link>
            {invoice.job_location && <span> &middot; {invoice.job_location}</span>}
          </p>
        </div>

        {/* Line items table */}
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Description</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 w-20">Qty</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 w-28">Unit Price</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Labor */}
              <tr>
                <td className="py-3 text-sm text-gray-900">Labor</td>
                <td className="py-3 text-sm text-gray-600 text-right">1</td>
                <td className="py-3 text-sm text-gray-600 text-right">{formatCents(invoice.labor_cents)}</td>
                <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCents(invoice.labor_cents)}</td>
              </tr>
              {/* Material line items */}
              {materials.map((item, i) => {
                const qty = item.quantity || 1;
                const unitPrice = item.unit_price_cents || (item.cost_cents ? Math.round((item.cost_cents || 0) / qty) : 0);
                const lineTotal = item.cost_cents || item.total_cents || unitPrice * qty;
                return (
                  <tr key={i}>
                    <td className="py-3 text-sm text-gray-900">{item.description || "Materials"}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{qty}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{formatCents(unitPrice)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCents(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add line item */}
          {isContractor && invoice.status === "draft" && (
            <div className="mt-2 print:hidden">
              {showAddItem ? (
                <form onSubmit={handleAddLineItem} className="flex flex-col sm:flex-row gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    min={1}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price ($)"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingItem}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      {savingItem ? "..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddItem(false)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  + Add Line Item
                </button>
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex flex-col items-end gap-1">
            <div className="flex justify-between w-64 text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{formatCents(invoice.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between w-64 text-sm">
              <span className="text-gray-600">Platform Fee</span>
              <span className="text-gray-600">{formatCents(invoice.platform_fee_cents)}</span>
            </div>
            {invoice.tax_cents > 0 && (
              <div className="flex justify-between w-64 text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-600">{formatCents(invoice.tax_cents)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 text-base border-t border-gray-300 pt-2 mt-1">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">{formatCents(invoice.total_cents)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-6 py-4 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h4>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
