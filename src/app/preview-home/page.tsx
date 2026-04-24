"use client";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * PREVIEW HOMEPAGE — DO NOT LINK FROM PRODUCTION UI
 * ─────────────────────────────────────────────────────────────────────────────
 * This file exists to let us compare a redesigned homepage (21st.dev design
 * patterns + Trovaar copy) against the live one at `/`.
 *
 * Redesigned sections: Hero, How It Works, Stats, Testimonials, Contractor
 * Tiers, Bottom CTA.
 *
 * Preserved sections (copied verbatim from page.tsx so the preview is
 * end-to-end): Quote Buster CTA, Service Categories, Trust & Safety Bar,
 * Senior Protection Ad.
 *
 * When approved, we'll overwrite src/app/page.tsx with the approved parts.
 * Until then, nothing on `/` changes.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useAnimatedCounter } from "@/hooks/useScrollReveal";
import {
  Camera,
  Zap,
  CheckCircle2,
  Shield,
  Search,
  Star,
  Lock,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  Award,
  Wrench,
  DollarSign,
} from "lucide-react";

const PREVIEW_COUNT = 4;

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared helpers — reused from original page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */

function StatCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const { count, ref } = useAnimatedCounter(end, 2000);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

function HeroParticles() {
  const [particles, setParticles] = useState<Array<{
    w: number; h: number; bg: string; left: string; top: string; dur: string; delay: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => {
        const size = Math.random() * 4 + 2;
        return {
          w: size,
          h: size,
          bg: `hsl(${220 + Math.random() * 40}, 80%, ${60 + Math.random() * 20}%)`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          dur: `${8 + Math.random() * 12}s`,
          delay: `${Math.random() * 5}s`,
        };
      })
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${p.w}px`,
            height: `${p.h}px`,
            background: p.bg,
            left: p.left,
            top: p.top,
            animation: `float ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* Keep the animated bid-card illustration — it's one of the best parts of
 * the current hero and ports directly. */
function HeroIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-3xl" />
      <div className="relative bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Kitchen Faucet Replacement</div>
              <div className="text-xs text-slate-400">Posted 3 min ago</div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">Plumbing</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/20">3 bids</span>
          </div>
        </div>
        {[
          { name: "Mike R.", price: "$180", time: "Tomorrow", rating: "4.9", delay: "0.5s" },
          { name: "Sarah T.", price: "$155", time: "Today 5pm", rating: "4.8", delay: "1.5s" },
          { name: "Carlos M.", price: "$145", time: "Tomorrow AM", rating: "5.0", delay: "2.5s" },
        ].map((bid, i) => (
          <div
            key={i}
            className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center justify-between"
            style={{
              animation: `slideInRight 0.5s ease-out forwards`,
              animationDelay: bid.delay,
              opacity: 0,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-xs font-bold text-white">
                {bid.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{bid.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {bid.rating}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-green-400">{bid.price}</div>
              <div className="text-xs text-slate-400">{bid.time}</div>
            </div>
          </div>
        ))}
        <div
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-3 text-center"
          style={{ animation: "fadeInUp 0.5s ease-out 3.5s forwards", opacity: 0 }}
        >
          <div className="text-xs text-green-300 mb-0.5">You save vs. big company quote</div>
          <div className="text-xl font-extrabold text-green-400">$255 saved (37%)</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 1 — HERO (redesigned, inspired by modern dark-gradient SaaS heros)
 * ═══════════════════════════════════════════════════════════════════════════ */

function HeroSection() {
  const { user } = useAuth();

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <HeroParticles />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* Live badge — kept from original */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm backdrop-blur-sm"
              style={{ animation: "fadeInUp 0.6s ease-out" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="text-slate-200">Live marketplace — pros bidding now</span>
            </div>

            {/* Headline — cleaner typography stack (balance + tighter tracking) */}
            <h1
              className="text-balance text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
              style={{ animation: "fadeInUp 0.6s ease-out 0.1s both" }}
            >
              The network that connects{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #818cf8, #a78bfa)" }}>
                every skilled trade
              </span>{" "}
              to every job.
            </h1>

            <p
              className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed"
              style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}
            >
              Like Uber — but for home repairs, auto work, and commercial services.
              Post a job, watch pros compete in real time, save 20–40%.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 mb-16"
              style={{ animation: "fadeInUp 0.6s ease-out 0.3s both" }}
            >
              {user?.role === "consumer" ? (
                <Link href="/jobs/new">
                  <Button size="lg" className="w-full sm:w-auto px-8 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">Post a Job</Button>
                </Link>
              ) : user?.role === "contractor" ? (
                <Link href="/jobs">
                  <Button size="lg" className="w-full sm:w-auto px-8 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">Find Jobs Near You</Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup?role=consumer">
                    <Button size="lg" className="w-full sm:w-auto px-8 bg-blue-500 hover:bg-blue-600 border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
                      Post a Job
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/signup?role=contractor">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-white/40 text-white hover:bg-white/10 backdrop-blur-sm">
                      Find Work Near You
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Two-sided cards — refined borders & spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl"
              style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl p-5 flex gap-4 items-start backdrop-blur-sm hover:bg-white/[0.12] transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">For Homeowners & Businesses</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Post once. Qualified local pros compete on price, rating, and availability.</p>
                  <Link href="/signup?role=consumer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    Post a job <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl p-5 flex gap-4 items-start backdrop-blur-sm hover:bg-white/[0.12] transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30 transition-colors">
                  <Wrench className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">For Contractors & Tradespeople</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">See jobs on a live map. Bid what you want, when you want. No monthly fees.</p>
                  <Link href="/signup?role=contractor" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                    Find work <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block" style={{ animation: "fadeInRight 0.8s ease-out 0.5s both" }}>
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 2 — HOW IT WORKS (redesigned with numbered indicators + connecting
 * line, inspired by 21st.dev HowItWorks pattern)
 * ═══════════════════════════════════════════════════════════════════════════ */

function HowItWorksSection() {
  const steps = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Snap & Post",
      description: "Upload a photo and describe your job — under 2 minutes.",
      color: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Pros Compete",
      description: "Verified local tradespeople send you competitive bids.",
      color: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Choose & Save",
      description: "Pick your pro, save 20–40%. No obligation until you accept.",
      color: "from-green-500 to-emerald-500",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Three simple steps to save money on any service.
            </p>
          </div>
        </ScrollReveal>

        {/* Numbered indicators with connecting line */}
        <ScrollReveal>
          <div className="relative mx-auto mb-8 hidden md:block">
            <div aria-hidden className="absolute left-[16.6667%] top-4 h-0.5 w-[66.6667%] bg-gradient-to-r from-blue-200 via-amber-200 to-green-200" />
            <div className="relative grid grid-cols-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-gradient-to-br ${steps[i].color} font-bold text-white text-sm ring-4 ring-white shadow-md`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Step cards */}
        <div className="mx-auto grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} delay={i * 120}>
              <div className="relative rounded-2xl border border-slate-100 bg-white p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${step.iconBg} ${step.iconColor}`}>
                  {step.icon}
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="md:hidden text-3xl font-black text-slate-200 leading-none">{i + 1}</span>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 3 — QUOTE BUSTER CTA (preserved verbatim)
 * ═══════════════════════════════════════════════════════════════════════════ */

function QuoteBusterSection() {
  return (
    <ScrollReveal>
      <section className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Got an expensive quote?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Big companies charge 30–50% more than local pros. Use our free Quote Buster
            to see what you should really be paying.
          </p>
          <Link href="/quote-buster">
            <Button size="lg" variant="white" className="px-8 shadow-lg shadow-blue-900/30 hover:shadow-xl transition-shadow">
              Bust My Quote
            </Button>
          </Link>
        </div>
      </section>
    </ScrollReveal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 4 — SERVICE CATEGORIES (preserved verbatim)
 * ═══════════════════════════════════════════════════════════════════════════ */

function CategorySection() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <section className="py-20" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">Every trade. Every job.</h2>
          <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
            Home, auto, or commercial — skilled pros are ready in every category.
          </p>
        </ScrollReveal>
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORY_GROUPS.map((group) => {
              const isExpanded = !!expanded[group.label];
              const visible = isExpanded ? group.categories : group.categories.slice(0, PREVIEW_COUNT);
              const remaining = group.categories.length - PREVIEW_COUNT;

              return (
                <div key={group.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className="text-2xl mb-2">{group.icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{group.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {visible.map((cat) => (
                      <Link
                        key={cat.value}
                        href={`/jobs?category=${cat.value}`}
                        className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all duration-200 hover:shadow-md hover:shadow-blue-500/20"
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                  {remaining > 0 && (
                    <button
                      onClick={() => toggle(group.label)}
                      className="mt-3 text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      {isExpanded ? "Show less" : `See all ${group.categories.length} services →`}
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
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 5 — TRUST & SAFETY BAR (preserved verbatim)
 * ═══════════════════════════════════════════════════════════════════════════ */

function TrustBar() {
  const items = [
    { icon: <Search className="w-5 h-5 text-blue-600" />, label: "Background Checked", sub: "Every contractor verified", bg: "bg-blue-50" },
    { icon: <Shield className="w-5 h-5 text-green-600" />, label: "ID Verified", sub: "Government ID confirmed", bg: "bg-green-50" },
    { icon: <Star className="w-5 h-5 text-amber-500 fill-amber-500" />, label: "Review Verified", sub: "Only real job reviews", bg: "bg-amber-50" },
    { icon: <Lock className="w-5 h-5 text-purple-600" />, label: "Secure Payments", sub: "Held in escrow until done", bg: "bg-purple-50" },
    { icon: <ClipboardCheck className="w-5 h-5 text-cyan-600" />, label: "Licensed Pros", sub: "License on file where required", bg: "bg-cyan-50" },
  ];

  return (
    <section className="py-10 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-3 group">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 6 — STATS BAR (redesigned, cleaner typography, subtle glow)
 * ═══════════════════════════════════════════════════════════════════════════ */

function StatsSection() {
  const stats: Array<{ value: number; suffix?: string; label: string; prefix?: string }> = [
    { value: 13, suffix: "+", label: "Service Categories" },
    { value: 80, suffix: "+", label: "Skilled Trades" },
    { value: 40, suffix: "%", label: "Average Savings" },
    { value: 0, label: "Cost for Consumers", prefix: "Free" },
  ];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 100%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/15 rounded-full blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 text-center">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className="group">
                <p className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 to-blue-500 mb-2 tabular-nums">
                  {stat.prefix ? stat.prefix : <StatCounter end={stat.value} suffix={stat.suffix} />}
                </p>
                <p className="text-sm text-slate-400 uppercase tracking-wide font-medium">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 7 — TESTIMONIALS (redesigned with cleaner card style + 5-star row,
 * inspired by 21st.dev "Testimonials Stars" pattern)
 * ═══════════════════════════════════════════════════════════════════════════ */

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Jessica M.",
      role: "Homeowner, Chicago",
      text: "Got 4 bids within an hour of posting my roof repair. Saved over $800 compared to the first quote I got from a big company. Game changer.",
      rating: 5,
      initial: "J",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      name: "David K.",
      role: "Licensed Electrician",
      text: "I pick up 3-4 extra jobs a week through Trovaar. No monthly fees, I only pay when I win. Best platform for independent tradespeople.",
      rating: 5,
      initial: "D",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Maria S.",
      role: "Property Manager",
      text: "Managing 12 properties means constant maintenance. Trovaar lets me post jobs and get competitive bids fast. The escrow payments give me peace of mind.",
      rating: 5,
      initial: "M",
      gradient: "from-purple-500 to-indigo-500",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
              Trusted by homeowners and pros alike.
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Real stories from real Trovaar users.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 100}>
              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${idx < t.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                    />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed mb-6 text-[15px]">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm`}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 8 — SENIOR PROTECTION AD (preserved verbatim)
 * ═══════════════════════════════════════════════════════════════════════════ */

function SeniorProtectionSection() {
  return (
    <ScrollReveal>
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1e1b4b 100%)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-white/10">
                <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-full px-3 py-1 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-red-300 text-xs font-semibold uppercase tracking-wide">Real Story</span>
                </div>
                <blockquote className="text-white/90 text-base sm:text-lg leading-relaxed mb-5">
                  <p className="mb-3">
                    An <strong className="text-white">86-year-old man</strong> was quoted <strong className="text-red-400">$11,000–$13,000</strong> to redo his bathroom.
                  </p>
                  <p className="mb-3">
                    His son got quoted <strong className="text-green-400">$5,800–$7,000</strong> for the <em>exact same job</em>.
                  </p>
                  <p className="text-white/60 text-sm">
                    That&apos;s not a coincidence. That&apos;s predatory pricing — targeting a senior who they assumed wouldn&apos;t question it, wouldn&apos;t shop around, and wouldn&apos;t have someone in his corner to catch it.
                  </p>
                </blockquote>
                <p className="text-slate-400 text-xs">
                  Senior citizens are targeted at every turn because they grew up in an era where you trusted professionals and didn&apos;t question the bill.<br />
                  <strong className="text-slate-300">That trust is being weaponized against them every single day.</strong>
                </p>
              </div>
              <div className="p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight">
                    Don&apos;t let them be<br />
                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #818cf8)" }}>
                      alone in that room.
                    </span>
                  </h3>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    Trovaar gives every consumer — young or old — transparent, competitive bids from verified pros. Post once, see real prices, compare without pressure.
                  </p>
                  <ul className="space-y-2 mb-8">
                    {[
                      "Multiple bids on every job — no single-quote traps",
                      "Verified contractor reviews & credentials",
                      "Secure payment held until the job is done",
                      "Free for consumers — always",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/jobs/new" className="flex-1">
                    <Button size="lg" className="w-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                      Post a Job — It&apos;s Free
                    </Button>
                  </Link>
                  <Link href="/about" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 9 — CONTRACTOR TIERS (redesigned as pricing-style cards with
 * gradient frame, inspired by 21st.dev pricing-card-triple pattern)
 * ═══════════════════════════════════════════════════════════════════════════ */

function ContractorTiersSection() {
  const tierIcons: Record<string, React.ReactNode> = {
    independent: <Wrench className="w-7 h-7" />,
    licensed: <ClipboardCheck className="w-7 h-7" />,
    certified: <Award className="w-7 h-7" />,
    master: <Star className="w-7 h-7 fill-current" />,
  };

  const tierFrames: Record<string, string> = {
    independent: "bg-gradient-to-b from-slate-300 to-slate-500",
    licensed: "bg-gradient-to-b from-blue-400 to-indigo-600",
    certified: "bg-gradient-to-b from-purple-400 to-fuchsia-600",
    master: "bg-gradient-to-b from-amber-400 to-orange-500",
  };

  const tierAccents: Record<string, string> = {
    independent: "text-slate-600",
    licensed: "text-blue-600",
    certified: "text-purple-600",
    master: "text-amber-600",
  };

  return (
    <section className="py-24" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
              From hustle to mastery
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Whether you&apos;re picking up side jobs or running a full-time trade business —
              there&apos;s a tier for your level. Build credibility, win better jobs, command better rates.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTRACTOR_TYPES.map((tier, i) => (
            <ScrollReveal key={tier.value} delay={i * 100}>
              <div className={`rounded-3xl p-[2px] ${tierFrames[tier.value] ?? "bg-gradient-to-b from-slate-300 to-slate-500"} transition-transform duration-300 hover:-translate-y-2 h-full`}>
                <div className="rounded-[22px] bg-white h-full p-7 flex flex-col">
                  <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ${tierAccents[tier.value] ?? "text-slate-600"}`}>
                    {tierIcons[tier.value] || <Wrench className="w-7 h-7" />}
                  </div>
                  <span className={`inline-block self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${tier.badgeClass}`}>
                    {tier.badge}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed flex-1">{tier.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <div className="text-center mt-12">
            <Link href="/signup?role=contractor">
              <Button size="lg" className="px-8 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
                Join as a Pro <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 10 — BOTTOM CTA (redesigned with sparkle icon + cleaner composition)
 * ═══════════════════════════════════════════════════════════════════════════ */

function BottomCTASection() {
  const { user } = useAuth();

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)" }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/5 rounded-full blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-xs backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-slate-100 uppercase tracking-wide font-semibold">Always free for consumers</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Ready to join the network?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Consumers post free. Pros pay only when they win. No subscriptions, no hidden fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user?.role === "consumer" ? "/jobs/new" : "/signup?role=consumer"}>
              <Button size="lg" variant="white" className="w-full sm:w-auto px-8 shadow-lg shadow-blue-900/30 hover:shadow-xl transition-shadow">
                Post a Job — It&apos;s Free
              </Button>
            </Link>
            <Link href={user?.role === "contractor" ? "/contractor/dashboard" : "/signup?role=contractor"}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-white/40 text-white hover:bg-white/10 backdrop-blur-sm">
                Start Winning Jobs
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function PreviewHomePage() {
  return (
    <div className="bg-white">
      {/* Preview banner — makes it obvious this isn't the live homepage */}
      <div className="sticky top-0 z-50 bg-amber-400 text-amber-950 text-center py-2 px-4 text-sm font-semibold shadow-md">
        🎨 PREVIEW — 21st.dev-inspired homepage redesign. Live homepage is at{" "}
        <Link href="/" className="underline font-bold">/</Link>
      </div>

      <HeroSection />
      <HowItWorksSection />
      <QuoteBusterSection />
      <CategorySection />
      <TrustBar />
      <StatsSection />
      <TestimonialsSection />
      <SeniorProtectionSection />
      <ContractorTiersSection />
      <BottomCTASection />
    </div>
  );
}
