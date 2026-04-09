"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

const PREVIEW_COUNT = 4;

function CategorySection() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <section className="py-20" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-secondary mb-3">Every trade. Every job.</h2>
        <p className="text-center text-muted mb-14 max-w-xl mx-auto">
          Home, auto, or commercial — skilled pros are ready in every category.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORY_GROUPS.map((group) => {
            const isExpanded = !!expanded[group.label];
            const visible = isExpanded ? group.categories : group.categories.slice(0, PREVIEW_COUNT);
            const remaining = group.categories.length - PREVIEW_COUNT;

            return (
              <div key={group.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">{group.icon}</div>
                <h3 className="font-semibold text-secondary mb-4">{group.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {visible.map((cat) => (
                    <Link
                      key={cat.value}
                      href={`/jobs?category=${cat.value}`}
                      className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-colors"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
                {remaining > 0 && (
                  <button
                    onClick={() => toggle(group.label)}
                    className="mt-3 text-xs text-primary hover:underline cursor-pointer font-medium"
                  >
                    {isExpanded
                      ? "Show less"
                      : `See all ${group.categories.length} services →`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Link href="/jobs">
            <Button variant="outline" size="lg">Browse Live Jobs</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="bg-white">

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #1e1b4b 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-200">Live marketplace — pros bidding now</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-3xl">
            The network that connects{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #818cf8)" }}>
              every skilled trade
            </span>{" "}
            to every job.
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl">
            Like Uber — but for home repairs, auto work, and commercial services.
            Post a job, watch pros compete in real time, save 20–40%.
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            {user?.role === "consumer" ? (
              <Link href="/jobs/new">
                <Button size="lg" className="w-full sm:w-auto px-8">Post a Job</Button>
              </Link>
            ) : user?.role === "contractor" ? (
              <Link href="/jobs">
                <Button size="lg" className="w-full sm:w-auto px-8">Find Jobs Near You</Button>
              </Link>
            ) : (
              <>
                <Link href="/signup?role=consumer">
                  <Button size="lg" className="w-full sm:w-auto px-8 bg-blue-500 hover:bg-blue-600 border-0">
                    Post a Job
                  </Button>
                </Link>
                <Link href="/signup?role=contractor">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-white/40 text-white hover:bg-white/10">
                    Find Work Near You
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Two-sided cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 flex gap-4 items-start">
              <span className="text-3xl shrink-0">🏠</span>
              <div>
                <h3 className="font-semibold text-white mb-1">For Homeowners & Businesses</h3>
                <p className="text-sm text-slate-300 leading-relaxed">Post once. Qualified local pros compete on price, rating, and availability.</p>
                <Link href="/signup?role=consumer" className="inline-block mt-3 text-xs font-semibold text-blue-300 hover:text-white transition-colors">Post a job →</Link>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 flex gap-4 items-start">
              <span className="text-3xl shrink-0">🔧</span>
              <div>
                <h3 className="font-semibold text-white mb-1">For Contractors & Tradespeople</h3>
                <p className="text-sm text-slate-300 leading-relaxed">See jobs on a live map. Bid what you want, when you want. No monthly fees.</p>
                <Link href="/signup?role=contractor" className="inline-block mt-3 text-xs font-semibold text-blue-300 hover:text-white transition-colors">Find work →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-secondary mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "📸", title: "Snap & Post", desc: "Upload a photo and describe your job — under 2 minutes." },
              { step: "2", icon: "⚡", title: "Pros Compete", desc: "Verified local tradespeople send you competitive bids." },
              { step: "3", icon: "✅", title: "Choose & Save", desc: "Pick your pro, save 20–40%. No obligation until you accept." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-5 rounded-xl bg-white border border-border">
                <div className="text-4xl font-black text-secondary leading-none w-10 shrink-0">{item.step}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{item.icon}</span>
                    <h3 className="text-base font-semibold text-secondary">{item.title}</h3>
                  </div>
                  <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service categories ── */}
      <CategorySection />

      {/* ── Trust & Safety Bar ── */}
      <section className="py-8 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {[
              { icon: "🔍", label: "Background Checked", sub: "Every contractor verified" },
              { icon: "🛡️", label: "ID Verified",        sub: "Government ID confirmed" },
              { icon: "⭐", label: "Review Verified",    sub: "Only real job reviews" },
              { icon: "🔒", label: "Secure Payments",   sub: "Held in escrow until done" },
              { icon: "📋", label: "Licensed Pros",     sub: "License on file where required" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-secondary">{item.label}</p>
                  <p className="text-xs text-muted">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-14" style={{ background: "#0a0f1e" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "13+", label: "Service Categories" },
              { value: "80+", label: "Skilled Trades" },
              { value: "40%", label: "Average Savings" },
              { value: "Free", label: "For Consumers" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-400 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contractor tiers ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-secondary mb-3">From hustle to mastery</h2>
          <p className="text-center text-muted mb-14 max-w-2xl mx-auto">
            Whether you&apos;re picking up side jobs or running a full-time trade business — there&apos;s a tier for your level.
            Build credibility, win better jobs, command better rates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTRACTOR_TYPES.map((tier) => (
              <div
                key={tier.value}
                className="rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
                style={{ background: "#f8fafc" }}
              >
                <div className="text-3xl mb-3">{tier.icon}</div>
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${tier.badgeClass}`}>
                  {tier.badge}
                </span>
                <p className="text-sm text-muted leading-relaxed">{tier.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/signup?role=contractor">
              <Button size="lg">Join as a Pro</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to join the network?</h2>
          <p className="text-blue-100 text-lg mb-10">
            Consumers post free. Pros pay only when they win. No subscriptions, no hidden fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user?.role === "consumer" ? "/jobs/new" : "/signup?role=consumer"}>
              <Button size="lg" variant="white" className="w-full sm:w-auto px-8">
                Post a Job — It&apos;s Free
              </Button>
            </Link>
            <Link href={user?.role === "contractor" ? "/contractor/dashboard" : "/signup?role=contractor"}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-white/40 text-white hover:bg-white/10">
                Start Winning Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
