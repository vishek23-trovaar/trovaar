"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useAnimatedCounter } from "@/hooks/useScrollReveal";

const PREVIEW_COUNT = 4;

/* ── SVG Icon Components ── */
function IconCamera({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconBolt({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconCheckCircle({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconShield({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconSearch({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconStar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function IconLock({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
function IconBadge({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15l-2 5 2-1.5L14 20l-2-5z" />
      <circle cx="12" cy="9" r="6" />
    </svg>
  );
}
function IconClipboard({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

/* ── Animated Counter ── */
function StatCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const { count, ref } = useAnimatedCounter(end, 2000);
  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
}

/* ── Floating particles for hero background ── */
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

/* ── Hero Illustration (animated SVG) ── */
function HeroIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl" />

      <div className="relative bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
        {/* Mock job card */}
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

        {/* Mock bid cards with stagger animation */}
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white">
                {bid.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{bid.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <IconStar className="w-3 h-3 text-amber-400" /> {bid.rating}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-green-400">{bid.price}</div>
              <div className="text-xs text-slate-400">{bid.time}</div>
            </div>
          </div>
        ))}

        {/* Savings badge */}
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

/* ── Category Section ── */
function CategorySection() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const groupIcons: Record<string, string> = {
    "Home Services": "🏠",
    "Outdoor & Landscaping": "🌿",
    "Automotive": "🚗",
    "Commercial & Industrial": "🏢",
    "Specialty & Other": "⚙️",
    "Moving & Storage": "📦",
  };

  return (
    <section className="py-20" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center text-secondary mb-3">Every trade. Every job.</h2>
          <p className="text-center text-muted mb-14 max-w-xl mx-auto">
            Home, auto, or commercial — skilled pros are ready in every category.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORY_GROUPS.map((group, index) => {
            const isExpanded = !!expanded[group.label];
            const visible = isExpanded ? group.categories : group.categories.slice(0, PREVIEW_COUNT);
            const remaining = group.categories.length - PREVIEW_COUNT;

            return (
              <ScrollReveal key={group.label} delay={index * 100}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className="text-2xl mb-2">{group.icon}</div>
                  <h3 className="font-semibold text-secondary mb-4 group-hover:text-primary transition-colors">{group.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {visible.map((cat) => (
                      <Link
                        key={cat.value}
                        href={`/jobs?category=${cat.value}`}
                        className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all duration-200 hover:shadow-md hover:shadow-primary/20"
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
              </ScrollReveal>
            );
          })}
        </div>
        <ScrollReveal delay={400}>
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

/* ── Testimonials Section ── */
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Jessica M.",
      role: "Homeowner",
      text: "Got 4 bids within an hour of posting my roof repair. Saved over $800 compared to the first quote I got from a big company. Game changer.",
      rating: 5,
      avatar: "J",
      color: "from-pink-500 to-rose-500",
    },
    {
      name: "David K.",
      role: "Licensed Electrician",
      text: "I pick up 3-4 extra jobs a week through Trovaar. No monthly fees, I only pay when I win. Best platform for independent tradespeople.",
      rating: 5,
      avatar: "D",
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Maria S.",
      role: "Property Manager",
      text: "Managing 12 properties means constant maintenance. Trovaar lets me post jobs and get competitive bids fast. The escrow payments give me peace of mind.",
      rating: 5,
      avatar: "M",
      color: "from-purple-500 to-violet-500",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-center text-secondary mb-3">Trusted by homeowners and pros</h2>
          <p className="text-center text-muted mb-14 max-w-xl mx-auto">
            See why people choose Trovaar over expensive big-name companies.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 150}>
              <div className="relative bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Quote mark */}
                <div className="absolute -top-3 left-6 text-5xl font-serif text-primary/10 leading-none">&ldquo;</div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <IconStar key={j} className="w-4 h-4 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-sm font-bold text-white`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-secondary">{t.name}</div>
                    <div className="text-xs text-muted">{t.role}</div>
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

/* ── Main Page ── */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="bg-white">

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Floating particles */}
        <HeroParticles />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div>
              {/* Live badge */}
              <div
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm backdrop-blur-sm"
                style={{ animation: "fadeInUp 0.6s ease-out" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                <span className="text-slate-200">Live marketplace — pros bidding now</span>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 max-w-3xl"
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

              {/* Dual CTA */}
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

              {/* Two-sided cards */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl"
                style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}
              >
                <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl p-5 flex gap-4 items-start backdrop-blur-sm hover:bg-white/[0.12] transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1 text-sm">For Homeowners & Businesses</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Post once. Qualified local pros compete on price, rating, and availability.</p>
                    <Link href="/signup?role=consumer" className="inline-block mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">Post a job →</Link>
                  </div>
                </div>
                <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl p-5 flex gap-4 items-start backdrop-blur-sm hover:bg-white/[0.12] transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1 text-sm">For Contractors & Tradespeople</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">See jobs on a live map. Bid what you want, when you want. No monthly fees.</p>
                    <Link href="/signup?role=contractor" className="inline-block mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">Find work →</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Animated illustration */}
            <div className="hidden lg:block" style={{ animation: "fadeInRight 0.8s ease-out 0.5s both" }}>
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-center text-secondary mb-3">How it works</h2>
            <p className="text-center text-muted mb-12 max-w-xl mx-auto">Three simple steps to save money on any service.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: <IconCamera className="w-6 h-6 text-blue-500" />, title: "Snap & Post", desc: "Upload a photo and describe your job — under 2 minutes.", gradient: "from-blue-500/10 to-cyan-500/10", border: "border-blue-100" },
              { step: "2", icon: <IconBolt className="w-6 h-6 text-amber-500" />, title: "Pros Compete", desc: "Verified local tradespeople send you competitive bids.", gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-100" },
              { step: "3", icon: <IconCheckCircle className="w-6 h-6 text-green-500" />, title: "Choose & Save", desc: "Pick your pro, save 20–40%. No obligation until you accept.", gradient: "from-green-500/10 to-emerald-500/10", border: "border-green-100" },
            ].map((item, index) => (
              <ScrollReveal key={item.step} delay={index * 150}>
                <div className={`relative flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br ${item.gradient} border ${item.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                  {/* Step number */}
                  <div className="text-5xl font-black text-secondary/10 leading-none w-12 shrink-0 select-none">{item.step}</div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        {item.icon}
                      </div>
                      <h3 className="text-base font-semibold text-secondary">{item.title}</h3>
                    </div>
                    <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  {/* Connector arrow (hidden on last) */}
                  {index < 2 && (
                    <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote Buster CTA ── */}
      <ScrollReveal>
        <section className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)" }}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Got an expensive quote?</h2>
            <p className="text-lg text-blue-200 mb-8 max-w-2xl mx-auto">
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

      {/* ── Service categories ── */}
      <CategorySection />

      {/* ── Trust & Safety Bar ── */}
      <section className="py-10 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              {[
                { icon: <IconSearch className="w-5 h-5 text-blue-500" />, label: "Background Checked", sub: "Every contractor verified", bg: "bg-blue-50" },
                { icon: <IconShield className="w-5 h-5 text-green-500" />, label: "ID Verified", sub: "Government ID confirmed", bg: "bg-green-50" },
                { icon: <IconStar className="w-5 h-5 text-amber-500" />, label: "Review Verified", sub: "Only real job reviews", bg: "bg-amber-50" },
                { icon: <IconLock className="w-5 h-5 text-purple-500" />, label: "Secure Payments", sub: "Held in escrow until done", bg: "bg-purple-50" },
                { icon: <IconClipboard className="w-5 h-5 text-cyan-500" />, label: "Licensed Pros", sub: "License on file where required", bg: "bg-cyan-50" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 group">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary">{item.label}</p>
                    <p className="text-xs text-muted">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 100%)" }}>
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 13, suffix: "+", label: "Service Categories" },
              { value: 80, suffix: "+", label: "Skilled Trades" },
              { value: 40, suffix: "%", label: "Average Savings" },
              { value: 0, label: "Cost for Consumers", prefix: "Free" },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 100}>
                <div className="group">
                  <p className="text-3xl sm:text-4xl font-extrabold text-blue-400 mb-1 group-hover:text-blue-300 transition-colors">
                    {stat.prefix ? (
                      stat.prefix
                    ) : (
                      <StatCounter end={stat.value} suffix={stat.suffix} />
                    )}
                  </p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── Contractor tiers ── */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-center text-secondary mb-3">From hustle to mastery</h2>
            <p className="text-center text-muted mb-14 max-w-2xl mx-auto">
              Whether you&apos;re picking up side jobs or running a full-time trade business — there&apos;s a tier for your level.
              Build credibility, win better jobs, command better rates.
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTRACTOR_TYPES.map((tier, index) => {
              const tierIcons: Record<string, React.ReactNode> = {
                independent: <svg className="w-7 h-7 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>,
                licensed: <IconClipboard className="w-7 h-7 text-blue-500" />,
                certified: <IconBadge className="w-7 h-7 text-purple-500" />,
                master: <IconStar className="w-7 h-7 text-amber-500" />,
              };

              return (
                <ScrollReveal key={tier.value} delay={index * 100}>
                  <div className="rounded-2xl border border-slate-100 p-6 bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group h-full">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      {tierIcons[tier.value] || <span className="text-2xl">{tier.icon}</span>}
                    </div>
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${tier.badgeClass}`}>
                      {tier.badge}
                    </span>
                    <p className="text-sm text-muted leading-relaxed">{tier.description}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
          <ScrollReveal delay={400}>
            <div className="text-center mt-10">
              <Link href="/signup?role=contractor">
                <Button size="lg">Join as a Pro</Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)" }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to join the network?</h2>
            <p className="text-blue-100 text-lg mb-10">
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

    </div>
  );
}
