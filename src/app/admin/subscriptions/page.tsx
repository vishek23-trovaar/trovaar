"use client";

import { useState, useEffect } from "react";

interface KPIs {
  totalActiveSubscribers: number;
  monthlyRecurringRevenue: number;
  activePlans: number;
}

interface PlanRow {
  id: string;
  name: string;
  tagline: string | null;
  price_cents: number;
  visits_per_month: number;
  active: number;
  color: string;
  sort_order: number;
  subscriber_count: number;
}

interface SubscriberRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  cancel_at_period_end: number;
  current_period_end: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_price_cents: number;
}

interface EditState {
  name: string;
  tagline: string;
  price_cents: string;
  visits_per_month: string;
  active: boolean;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const COLOR_BADGE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

export default function AdminSubscriptionsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    tagline: "",
    price_cents: "",
    visits_per_month: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setPlans(data.plans ?? []);
        setSubscribers(data.subscribers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function startEdit(plan: PlanRow) {
    setEditingPlanId(plan.id);
    setEditState({
      name: plan.name,
      tagline: plan.tagline ?? "",
      price_cents: String(plan.price_cents),
      visits_per_month: String(plan.visits_per_month),
      active: plan.active === 1,
    });
    setSaveError("");
  }

  function cancelEdit() {
    setEditingPlanId(null);
    setSaveError("");
  }

  async function handleSave(planId: string) {
    setSaving(true);
    setSaveError("");
    try {
      const priceCents = parseInt(editState.price_cents, 10);
      const visitsPerMonth = parseInt(editState.visits_per_month, 10);

      if (isNaN(priceCents) || priceCents <= 0) {
        setSaveError("Price must be a positive number (in cents, e.g. 9900 for $99).");
        return;
      }
      if (isNaN(visitsPerMonth) || visitsPerMonth <= 0) {
        setSaveError("Visits per month must be a positive number.");
        return;
      }

      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          fields: {
            name: editState.name,
            tagline: editState.tagline,
            price_cents: priceCents,
            visits_per_month: visitsPerMonth,
            active: editState.active ? 1 : 0,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingPlanId(null);
        fetchData();
      } else {
        setSaveError(data.error ?? "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSubs = subscribers.filter((s) => s.status === "active");
  const cancellingCount = subscribers.filter((s) => s.cancel_at_period_end === 1).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Subscription Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage plans, view subscribers, and track recurring revenue.</p>
      </div>

      {/* KPI cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Total Active Subscribers</p>
            <p className="text-3xl font-extrabold text-slate-900">{kpis.totalActiveSubscribers}</p>
            {cancellingCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">{cancellingCount} pending cancellation</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Monthly Recurring Revenue</p>
            <p className="text-3xl font-extrabold text-emerald-600">{formatPrice(kpis.monthlyRecurringRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1">From active subscribers only</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg transition-all duration-300">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Active Plans</p>
            <p className="text-3xl font-extrabold text-slate-900">{kpis.activePlans}</p>
            <p className="text-xs text-slate-400 mt-1">of {plans.length} total plans</p>
          </div>
        </div>
      )}

      {/* Plans table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Subscription Plans</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price/mo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visits/mo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscribers</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRR</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.map((plan) => {
                const isEditing = editingPlanId === plan.id;
                const mrrContrib = plan.subscriber_count * plan.price_cents;
                const badgeColor = COLOR_BADGE[plan.color] ?? COLOR_BADGE.slate;

                return (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            value={editState.name}
                            onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="Plan name"
                          />
                          <input
                            value={editState.tagline}
                            onChange={(e) => setEditState((s) => ({ ...s, tagline: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            placeholder="Tagline (optional)"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${badgeColor}`}>
                            {plan.name}
                          </span>
                          {plan.tagline && (
                            <p className="text-xs text-slate-400">{plan.tagline}</p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">¢</span>
                          <input
                            value={editState.price_cents}
                            onChange={(e) => setEditState((s) => ({ ...s, price_cents: e.target.value }))}
                            className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="cents"
                            type="number"
                            min="1"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-900">{formatPrice(plan.price_cents)}</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          value={editState.visits_per_month}
                          onChange={(e) => setEditState((s) => ({ ...s, visits_per_month: e.target.value }))}
                          className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          type="number"
                          min="1"
                        />
                      ) : (
                        <span>{plan.visits_per_month}</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold">{plan.subscriber_count}</span>
                    </td>

                    <td className="px-4 py-4 text-emerald-700 font-medium">
                      {formatPrice(mrrContrib)}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <button
                          onClick={() => setEditState((s) => ({ ...s, active: !s.active }))}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${editState.active ? "bg-emerald-500" : "bg-slate-200"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editState.active ? "left-4" : "left-0.5"}`} />
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${plan.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {plan.active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          {saveError && (
                            <span className="text-xs text-red-600 max-w-[140px] text-right">{saveError}</span>
                          )}
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(plan.id)}
                            disabled={saving}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(plan)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscribers table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Subscribers</h2>
          <span className="text-xs text-slate-400">{activeSubs.length} active</span>
        </div>
        {subscribers.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No subscribers yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{sub.user_name}</div>
                      <div className="text-xs text-slate-400">{sub.user_email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{sub.plan_name}</div>
                      <div className="text-xs text-slate-400">{formatPrice(sub.plan_price_cents)}/mo</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        sub.status === "active"
                          ? sub.cancel_at_period_end
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {sub.status === "active" && sub.cancel_at_period_end
                          ? "Cancelling"
                          : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(sub.created_at)}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(sub.current_period_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
