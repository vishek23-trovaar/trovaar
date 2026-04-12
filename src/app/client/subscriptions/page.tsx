"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_tagline: string | null;
  plan_price_cents: number;
  plan_visits_per_month: number;
  plan_priority_booking: number;
  plan_color: string;
  plan_description: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  visits_used_this_period: number;
}

interface Visit {
  id: string;
  service_id: string;
  scheduled_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  service_name: string;
  service_icon: string;
  service_base_price_cents: number;
  service_duration_minutes: number;
}

interface Service {
  id: string;
  name: string;
  icon: string;
  base_price_cents: number;
  duration_minutes: number;
  description: string | null;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function ClientSubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    serviceId: "",
    scheduledDate: "",
    notes: "",
  });
  const [scheduleError, setScheduleError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [subRes, visitsRes, plansRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/subscriptions/visits"),
        fetch("/api/subscriptions/plans"),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription ?? null);
      }
      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setVisits(data.visits ?? []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setServices(data.services ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/client/subscriptions");
      return;
    }
    fetchData();
  }, [user, router, fetchData]);

  async function handleCancelSubscription() {
    setCancelling(true);
    try {
      const res = await fetch("/api/subscriptions", { method: "DELETE" });
      if (res.ok) {
        setShowCancelConfirm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to cancel subscription.");
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleScheduleVisit(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError("");

    if (!scheduleForm.serviceId) {
      setScheduleError("Please select a service.");
      return;
    }
    if (!scheduleForm.scheduledDate) {
      setScheduleError("Please select a date.");
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch("/api/subscriptions/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: scheduleForm.serviceId,
          scheduledDate: scheduleForm.scheduledDate,
          notes: scheduleForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setScheduleForm({ serviceId: "", scheduledDate: "", notes: "" });
        fetchData();
      } else {
        setScheduleError(data.error ?? "Failed to schedule visit.");
      }
    } finally {
      setScheduling(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingVisits = visits.filter(
    (v) => v.status !== "completed" && v.status !== "cancelled"
  );
  const pastVisits = visits.filter(
    (v) => v.status === "completed" || v.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No subscription state
  if (!subscription) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-5">🏠</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No active subscription</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Subscribe to a Home Health plan to get recurring maintenance visits at fixed prices.
          </p>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            View Plans
          </Link>
        </div>

        {/* Plan comparison summary */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "Basic Care", price: "$49", visits: 2, color: "bg-slate-50 border-slate-200" },
            { name: "Home Health", price: "$99", visits: 4, color: "bg-emerald-50 border-emerald-300", badge: "Most popular" },
            { name: "Home Guard", price: "$189", visits: 8, color: "bg-indigo-50 border-indigo-200" },
          ].map((p, i) => (
            <ScrollReveal key={p.name} delay={i * 100}>
            <div className={`rounded-2xl border p-5 ${p.color} relative backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                  {p.badge}
                </span>
              )}
              <div className="font-bold text-slate-900">{p.name}</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{p.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
              <div className="text-sm text-slate-600 mt-1">{p.visits} visits/month</div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    );
  }

  const visitsUsed = subscription.visits_used_this_period;
  const visitsTotal = subscription.plan_visits_per_month;
  const visitsRemaining = Math.max(0, visitsTotal - visitsUsed);
  const progressPct = Math.min(100, (visitsUsed / visitsTotal) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Subscription</h1>
        <Link href="/subscriptions" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          View all plans →
        </Link>
      </div>

      {/* Subscription card */}
      <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 hover:shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-slate-900">{subscription.plan_name}</span>
              {subscription.plan_priority_booking ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  ⚡ Priority
                </span>
              ) : null}
              {subscription.cancel_at_period_end ? (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Cancels {formatDate(subscription.current_period_end)}
                </span>
              ) : (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            {subscription.plan_description && (
              <p className="text-sm text-slate-500 mb-2">{subscription.plan_description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{formatPrice(subscription.plan_price_cents)}/month</span>
              <span>Renews {formatDate(subscription.current_period_end)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            disabled={visitsRemaining === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shrink-0 disabled:cursor-not-allowed"
          >
            + Schedule a Visit
          </button>
        </div>

        {/* Visit usage */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Visits this period</span>
            <span className="font-bold text-slate-900">{visitsUsed} of {visitsTotal} used</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {visitsRemaining} visit{visitsRemaining !== 1 ? "s" : ""} remaining until {formatDate(subscription.current_period_end)}
          </p>
        </div>
      </div>
      </ScrollReveal>

      {/* Upcoming visits */}
      <ScrollReveal delay={100}>
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Upcoming visits</h2>
        {upcomingVisits.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            No upcoming visits. Schedule one above.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingVisits.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-xl shrink-0">
                  {v.service_icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">{v.service_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {v.scheduled_date ? formatDate(v.scheduled_date) : "Date TBD"}
                    {v.notes ? ` · ${v.notes}` : ""}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </ScrollReveal>

      {/* Past visits */}
      {pastVisits.length > 0 && (
        <ScrollReveal delay={200}>
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-3">Past visits</h2>
          <div className="space-y-2">
            {pastVisits.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 opacity-75 hover:opacity-100 transition-all duration-300"
              >
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-lg shrink-0">
                  {v.service_icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 text-sm">{v.service_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {v.scheduled_date ? formatDate(v.scheduled_date) : formatDate(v.created_at)}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* Cancel subscription */}
      {!subscription.cancel_at_period_end && (
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Cancel subscription</h3>
          <p className="text-xs text-slate-400 mb-3">
            Your plan will remain active until {formatDate(subscription.current_period_end)}, then will not renew.
          </p>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Cancel my subscription
          </button>
        </div>
      )}

      {subscription.cancel_at_period_end && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Your plan is set to cancel on <strong>{formatDate(subscription.current_period_end)}</strong>. You can still schedule visits until then.
        </div>
      )}

      {/* Schedule visit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Schedule a Visit</h3>
              <button
                onClick={() => { setShowModal(false); setScheduleError(""); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  value={scheduleForm.serviceId}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, serviceId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                >
                  <option value="">Select a service…</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.icon} {svc.name} — {formatPrice(svc.base_price_cents)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred date</label>
                <input
                  type="date"
                  min={today}
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions or access details…"
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>

              {scheduleError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{scheduleError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setScheduleError(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {scheduling ? "Scheduling…" : "Schedule Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel subscription?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Your plan will remain active until{" "}
              <strong>{formatDate(subscription.current_period_end)}</strong> and will not renew after that.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Keep plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
