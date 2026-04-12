"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_cents: number;
  visits_per_month: number;
  priority_booking: number;
  color: string;
  sort_order: number;
}

interface FixedPriceService {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price_cents: number;
  duration_minutes: number;
  icon: string;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const COLOR_MAP: Record<string, { card: string; badge: string; button: string; ring: string }> = {
  slate: {
    card: "bg-white border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    button: "bg-slate-800 hover:bg-slate-900 text-white",
    ring: "ring-slate-200",
  },
  emerald: {
    card: "bg-white border-emerald-400 ring-2 ring-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    ring: "ring-emerald-400",
  },
  indigo: {
    card: "bg-white border-indigo-300",
    badge: "bg-indigo-100 text-indigo-700",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    ring: "ring-indigo-200",
  },
};

const FAQS = [
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel anytime from your account dashboard. Your plan will remain active until the end of the current billing period.",
  },
  {
    q: "What if I need more visits than my plan includes?",
    a: "You can upgrade your plan at any time or schedule additional one-off services from our fixed-price menu at regular rates.",
  },
  {
    q: "Are the contractors background-checked?",
    a: "All contractors on our platform go through identity verification and background checks before they can accept subscription visits.",
  },
  {
    q: "What areas do you service?",
    a: "We currently match you with top-rated local contractors in your area. Enter your location when scheduling a visit and we'll confirm availability.",
  },
];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [services, setServices] = useState<FixedPriceService[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/subscriptions/plans")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans ?? []);
        setServices(data.services ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    if (!user) {
      router.push(`/login?redirect=/subscriptions`);
      return;
    }

    setSubscribing(planId);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/client/subscriptions");
      } else {
        alert(data.error ?? "Failed to subscribe. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span>🏠</span> Home Health Subscriptions
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Keep your home in peak condition{" "}
            <span className="text-emerald-400">year-round</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            Predictable monthly pricing. Vetted contractors. Fixed-price services.
            Never worry about deferred maintenance again.
          </p>
          <a
            href="#plans"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            View Plans
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "📋", title: "Choose a plan", desc: "Pick a subscription tier that fits your home's needs and your schedule." },
              { step: "2", icon: "📅", title: "Schedule services", desc: "Log in, pick a service from the fixed-price menu, and choose your preferred date." },
              { step: "3", icon: "🔧", title: "Contractor arrives", desc: "A top-rated, vetted contractor shows up and gets the job done — at the fixed price." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-emerald-600 mb-1">STEP {item.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Choose your plan</h2>
          <p className="text-center text-slate-500 mb-10">No contracts. Cancel anytime.</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const colors = COLOR_MAP[plan.color] ?? COLOR_MAP.slate;
                const isRecommended = plan.color === "emerald";

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border-2 p-7 flex flex-col ${colors.card} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                  >
                    {isRecommended && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="mb-5">
                      <h3 className="text-xl font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                      {plan.tagline && (
                        <p className={`text-xs font-semibold uppercase tracking-wide ${colors.badge.replace("bg-", "text-").replace("-100", "-600")} mb-2`}>
                          {plan.tagline}
                        </p>
                      )}
                      <div className="flex items-end gap-1 mt-3 mb-1">
                        <span className="text-4xl font-extrabold text-slate-900">
                          {formatPrice(plan.price_cents)}
                        </span>
                        <span className="text-slate-400 text-sm mb-1">/month</span>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      <li className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <strong>{plan.visits_per_month} visits</strong> per month
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        All fixed-price services available
                      </li>
                      {plan.priority_booking ? (
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                            ⚡ Priority booking
                          </span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="text-slate-300">✗</span>
                          Standard scheduling
                        </li>
                      )}
                      <li className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        Vetted, background-checked contractors
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span>
                        Cancel anytime, no fees
                      </li>
                    </ul>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${colors.button} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {subscribing === plan.id ? "Subscribing…" : `Get ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Fixed-price services menu */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Fixed-price service menu</h2>
          <p className="text-slate-500 mb-8">Every service at a transparent, guaranteed price. No surprise quotes.</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="text-3xl mb-3">{svc.icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-1">{svc.name}</h3>
                  {svc.description && (
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{svc.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-bold text-emerald-600">
                      {formatPrice(svc.base_price_cents)}
                    </span>
                    <span className="text-xs text-slate-400">{formatDuration(svc.duration_minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-900 text-sm">{faq.q}</span>
                  <span className="text-slate-400 text-lg shrink-0">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="bg-slate-900 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to protect your home?</h2>
        <p className="text-slate-300 mb-8 max-w-md mx-auto">
          Join hundreds of homeowners who stay ahead of maintenance with a Home Health plan.
        </p>
        {user ? (
          <Link
            href="#plans"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Choose a Plan
          </Link>
        ) : (
          <Link
            href="/login?redirect=/subscriptions"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Get Started
          </Link>
        )}
      </section>
    </div>
  );
}
