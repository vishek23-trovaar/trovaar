import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  Users,
  CheckCircle2,
  Wrench,
  Zap,
  Wind,
  Home,
  Paintbrush,
  Hammer,
  Trees,
  Car,
  Refrigerator,
  Drill,
  Sparkles,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Lock,
  FileCheck2,
  Star,
  ArrowRight,
  Quote,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trovaar — Stripe design preview",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ *
 * Stripe-inspired design tokens (from .design-ref/.../stripe/DESIGN.md)
 * Sohne is proprietary; Inter @ 300 with ss01 + negative tracking is the
 * canonical open-source substitute. Indigo #533afd is the single CTA color.
 * ------------------------------------------------------------------ */

const HOW_IT_WORKS = [
  {
    icon: Camera,
    step: "01",
    title: "Snap & Post",
    body: "Upload a photo and describe the job in under 2 minutes. No phone tag, no five-vendor scheduling.",
  },
  {
    icon: Users,
    step: "02",
    title: "Pros Compete",
    body: "Verified local tradespeople send competitive bids while you watch the offers roll in, in real time.",
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Choose & Save",
    body: "Pick your pro and save 20–40%. No obligation until you accept — the choice stays yours.",
  },
];

const STATS = [
  { value: "149", label: "Services" },
  { value: "13", label: "Categories" },
  { value: "20–40%", label: "Average savings" },
  { value: "Free", label: "For consumers" },
];

const CATEGORIES = [
  { icon: Wrench, label: "Plumbing" },
  { icon: Zap, label: "Electrical" },
  { icon: Wind, label: "HVAC" },
  { icon: Home, label: "Roofing" },
  { icon: Paintbrush, label: "Painting" },
  { icon: Hammer, label: "Carpentry" },
  { icon: Trees, label: "Landscaping" },
  { icon: Car, label: "Auto Repair" },
  { icon: Refrigerator, label: "Appliance Repair" },
  { icon: Drill, label: "Handyman" },
  { icon: Sparkles, label: "Cleaning" },
  { icon: Truck, label: "Moving" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Background-checked pros" },
  { icon: BadgeCheck, label: "ID verified" },
  { icon: Lock, label: "Secure escrow payments" },
  { icon: FileCheck2, label: "Licensed where required" },
];

const FOOTER_COLUMNS: { heading: string; links: string[] }[] = [
  {
    heading: "Product",
    links: ["Post a job", "Find work", "How it works", "Pricing", "Categories"],
  },
  {
    heading: "For pros",
    links: ["Become a pro", "Verification", "Payouts", "Pro resources"],
  },
  {
    heading: "Company",
    links: ["About", "Careers", "Newsroom", "Contact"],
  },
  {
    heading: "Resources",
    links: ["Help center", "Trust & safety", "Guides", "Status"],
  },
  {
    heading: "Legal",
    links: ["Privacy", "Terms", "Licenses", "Cookies"],
  },
];

export default function StripeDesignPreview() {
  return (
    <div
      style={{
        fontFamily:
          "var(--font-inter, Inter), 'SF Pro Display', system-ui, -apple-system, sans-serif",
        fontFeatureSettings: '"ss01"',
        background: "#ffffff",
        color: "#0d253d",
        WebkitFontSmoothing: "antialiased",
      }}
      className="min-h-screen w-full overflow-x-hidden"
    >
      {/* Inter — closest open-source analogue to Sohne (per DESIGN.md) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap"
      />

      {/* ============================== NAV ============================== */}
      <header className="relative z-30">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <Link
              href="/design-preview/stripe"
              className="flex items-center gap-2 text-[#0d253d]"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-[7px]"
                style={{
                  background:
                    "linear-gradient(135deg, #665efd 0%, #533afd 55%, #4434d4 100%)",
                }}
              >
                <Sparkles size={15} strokeWidth={2} color="#ffffff" />
              </span>
              <span
                className="text-[21px] leading-none"
                style={{ fontWeight: 400, letterSpacing: "-0.6px" }}
              >
                Trovaar
              </span>
            </Link>
            <div className="hidden items-center gap-7 md:flex">
              {["How it works", "Categories", "For pros", "Pricing"].map(
                (item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-[15px] text-[#273951] transition-colors hover:text-[#533afd]"
                    style={{ fontWeight: 400, letterSpacing: 0 }}
                  >
                    {item}
                  </a>
                ),
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="#"
              className="hidden text-[15px] text-[#273951] transition-colors hover:text-[#533afd] sm:inline"
              style={{ fontWeight: 400 }}
            >
              Sign in
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#533afd] px-4 py-2 text-[15px] text-white transition-colors hover:bg-[#2e2b8c]"
              style={{ fontWeight: 400, letterSpacing: 0 }}
            >
              Sign up
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>
        </nav>
      </header>

      {/* ============================== HERO ============================== */}
      <section className="relative">
        {/* Gradient mesh — the brand's non-negotiable atmospheric backdrop.
            cream → sherbet → lavender → indigo → ruby, washed across the top third. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
          style={{
            background:
              "radial-gradient(60% 50% at 8% 0%, rgba(245,233,212,0.95) 0%, rgba(245,233,212,0) 60%)," +
              "radial-gradient(55% 55% at 32% 6%, rgba(249,107,238,0.55) 0%, rgba(249,107,238,0) 55%)," +
              "radial-gradient(65% 60% at 62% -4%, rgba(102,94,253,0.6) 0%, rgba(102,94,253,0) 58%)," +
              "radial-gradient(55% 55% at 88% 4%, rgba(234,34,97,0.5) 0%, rgba(234,34,97,0) 55%)," +
              "radial-gradient(70% 70% at 50% -10%, rgba(83,58,253,0.35) 0%, rgba(83,58,253,0) 62%)," +
              "linear-gradient(180deg, #f7f5ff 0%, #ffffff 78%)",
          }}
        />

        <div className="mx-auto max-w-[1200px] px-6 pt-20 pb-24 md:pt-28 md:pb-28">
          <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {/* Left — copy */}
            <div className="max-w-[640px]">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase"
                style={{
                  background: "#b9b9f9",
                  color: "#4434d4",
                  fontWeight: 400,
                  letterSpacing: "0.1px",
                }}
              >
                Stop searching, start finding.
              </span>

              <h1
                className="mt-6 text-[40px] leading-[1.04] sm:text-[48px] lg:text-[56px]"
                style={{ fontWeight: 300, letterSpacing: "-1.4px" }}
              >
                The network that connects every skilled trade to every job.
              </h1>

              <p
                className="mt-6 max-w-[520px] text-[18px] text-[#273951] sm:text-[19px]"
                style={{ fontWeight: 300, lineHeight: 1.5, letterSpacing: 0 }}
              >
                Like Uber — but for home repairs, auto work, and commercial
                services. Post a job, watch local pros compete in real time, and
                save{" "}
                <span style={{ fontFeatureSettings: '"tnum"' }}>20–40%</span>.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-full bg-[#533afd] px-5 py-2.5 text-[16px] text-white transition-colors hover:bg-[#2e2b8c]"
                  style={{ fontWeight: 400 }}
                >
                  Post a Job
                  <ArrowRight size={16} strokeWidth={2} />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-full border border-[#533afd] bg-white px-5 py-2.5 text-[16px] text-[#533afd] transition-colors hover:bg-[#f6f4ff]"
                  style={{ fontWeight: 400 }}
                >
                  Find Work Near You
                </a>
              </div>

              <p
                className="mt-6 text-[13px] text-[#64748d]"
                style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
              >
                Free for consumers · No obligation until you accept a bid.
              </p>
            </div>

            {/* Right — composited product UI mockup (the brand's signature) */}
            <div className="relative">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRUST / LOGOS STRIP ===================== */}
      <section className="border-y border-[#e3e8ee] bg-[#f6f9fc]">
        <div className="mx-auto max-w-[1200px] px-6 py-7">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <p
              className="text-[10px] uppercase text-[#64748d]"
              style={{ fontWeight: 400, letterSpacing: "0.1px" }}
            >
              Protected on every job
            </p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
              {TRUST.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 text-[#273951]"
                >
                  <Icon size={18} strokeWidth={1.75} color="#533afd" />
                  <span
                    className="text-[14px]"
                    style={{ fontWeight: 400, letterSpacing: "-0.2px" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================= HOW IT WORKS ======================= */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="max-w-[620px]">
          <span
            className="text-[10px] uppercase text-[#533afd]"
            style={{ fontWeight: 400, letterSpacing: "0.1px" }}
          >
            How it works
          </span>
          <h2
            className="mt-4 text-[32px] sm:text-[40px]"
            style={{ fontWeight: 300, letterSpacing: "-0.8px", lineHeight: 1.1 }}
          >
            Three steps from problem to pro.
          </h2>
          <p
            className="mt-4 text-[16px] text-[#273951]"
            style={{ fontWeight: 300, lineHeight: 1.5 }}
          >
            The whole marketplace runs in the background. You stay in control of
            the decision.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, step, title, body }) => (
            <div
              key={step}
              className="rounded-[12px] border border-[#e3e8ee] bg-white p-8 transition-shadow"
              style={{ boxShadow: "rgba(0,55,112,0.08) 0 1px 3px" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="grid h-11 w-11 place-items-center rounded-[10px]"
                  style={{ background: "#f0eeff" }}
                >
                  <Icon size={20} strokeWidth={1.75} color="#533afd" />
                </span>
                <span
                  className="text-[14px] text-[#a8c3de]"
                  style={{
                    fontWeight: 400,
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: "-0.42px",
                  }}
                >
                  {step}
                </span>
              </div>
              <h3
                className="mt-6 text-[22px]"
                style={{ fontWeight: 300, letterSpacing: "-0.22px" }}
              >
                {title}
              </h3>
              <p
                className="mt-3 text-[15px] text-[#273951]"
                style={{ fontWeight: 300, lineHeight: 1.5 }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================= CATEGORIES ========================= */}
      <section className="border-y border-[#e3e8ee] bg-[#f6f9fc]">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-[560px]">
              <span
                className="text-[10px] uppercase text-[#533afd]"
                style={{ fontWeight: 400, letterSpacing: "0.1px" }}
              >
                Categories
              </span>
              <h2
                className="mt-4 text-[32px] sm:text-[40px]"
                style={{
                  fontWeight: 300,
                  letterSpacing: "-0.8px",
                  lineHeight: 1.1,
                }}
              >
                One marketplace for every trade.
              </h2>
            </div>
            <p
              className="text-[15px] text-[#64748d]"
              style={{ fontWeight: 300 }}
            >
              <span style={{ fontFeatureSettings: '"tnum"' }}>149</span>{" "}
              services across{" "}
              <span style={{ fontFeatureSettings: '"tnum"' }}>13</span>{" "}
              categories.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex items-center gap-3 rounded-full border border-[#e3e8ee] bg-white px-5 py-3.5 transition-colors hover:border-[#b9b9f9]"
              >
                <Icon size={18} strokeWidth={1.75} color="#533afd" />
                <span
                  className="text-[15px] text-[#0d253d]"
                  style={{ fontWeight: 400, letterSpacing: "-0.2px" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== STATS =========================== */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="grid gap-px overflow-hidden rounded-[12px] border border-[#e3e8ee] bg-[#e3e8ee] sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-white px-8 py-10">
              <div
                className="text-[40px] text-[#0d253d]"
                style={{
                  fontWeight: 300,
                  letterSpacing: "-1px",
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {value}
              </div>
              <div
                className="mt-3 text-[13px] uppercase text-[#64748d]"
                style={{ fontWeight: 400, letterSpacing: "0.1px" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================= TESTIMONIAL ======================= */}
      <section className="px-6 pb-24">
        <div
          className="mx-auto max-w-[1200px] rounded-[12px] px-10 py-14 md:px-16 md:py-20"
          style={{ background: "#f5e9d4" }}
        >
          <div className="max-w-[820px]">
            <Quote size={32} strokeWidth={1.5} color="#9b6829" />
            <blockquote
              className="mt-6 text-[26px] text-[#0d253d] sm:text-[32px]"
              style={{ fontWeight: 300, letterSpacing: "-0.64px", lineHeight: 1.2 }}
            >
              “Got{" "}
              <span style={{ fontFeatureSettings: '"tnum"' }}>4</span> bids
              within an hour of posting my roof repair. Saved over{" "}
              <span style={{ fontFeatureSettings: '"tnum"' }}>$800</span>.”
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    strokeWidth={1.5}
                    color="#9b6829"
                    fill="#9b6829"
                  />
                ))}
              </div>
              <span
                className="text-[15px] text-[#273951]"
                style={{ fontWeight: 400 }}
              >
                Jessica M., Homeowner
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="px-6 pb-24">
        <div
          className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[16px] px-10 py-16 md:px-16 md:py-20"
          style={{ background: "#1c1e54" }}
        >
          {/* subtle indigo wash inside the dark CTA */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 80% at 100% 0%, rgba(102,94,253,0.45) 0%, rgba(102,94,253,0) 60%)," +
                "radial-gradient(40% 80% at 0% 100%, rgba(234,34,97,0.28) 0%, rgba(234,34,97,0) 60%)",
            }}
          />
          <div className="relative flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
            <div className="max-w-[620px]">
              <h2
                className="text-[32px] text-white sm:text-[40px]"
                style={{
                  fontWeight: 300,
                  letterSpacing: "-0.8px",
                  lineHeight: 1.08,
                }}
              >
                Stop searching. Start finding the right pro today.
              </h2>
              <p
                className="mt-5 text-[16px]"
                style={{ fontWeight: 300, lineHeight: 1.5, color: "#b9c3d6" }}
              >
                Post a job in two minutes and let verified local pros compete for
                your business. Free for consumers, always.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-[#533afd] px-5 py-2.5 text-[16px] text-white transition-colors hover:bg-[#665efd]"
                style={{ fontWeight: 400 }}
              >
                Post a Job
                <ArrowRight size={16} strokeWidth={2} />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-transparent px-5 py-2.5 text-[16px] text-white transition-colors hover:bg-white/10"
                style={{ fontWeight: 400 }}
              >
                Find Work Near You
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================== FOOTER =========================== */}
      <footer className="border-t border-[#e3e8ee] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
            <div className="max-w-[260px]">
              <div className="flex items-center gap-2 text-[#0d253d]">
                <span
                  className="grid h-7 w-7 place-items-center rounded-[7px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #665efd 0%, #533afd 55%, #4434d4 100%)",
                  }}
                >
                  <Sparkles size={15} strokeWidth={2} color="#ffffff" />
                </span>
                <span
                  className="text-[21px] leading-none"
                  style={{ fontWeight: 400, letterSpacing: "-0.6px" }}
                >
                  Trovaar
                </span>
              </div>
              <p
                className="mt-5 text-[13px] text-[#64748d]"
                style={{ fontWeight: 400, letterSpacing: "-0.39px", lineHeight: 1.5 }}
              >
                The network that connects every skilled trade to every job. Stop
                searching, start finding.
              </p>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h4
                  className="text-[10px] uppercase text-[#0d253d]"
                  style={{ fontWeight: 400, letterSpacing: "0.1px" }}
                >
                  {col.heading}
                </h4>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[13px] text-[#64748d] transition-colors hover:text-[#533afd]"
                        style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[#e3e8ee] pt-8 sm:flex-row sm:items-center">
            <p
              className="text-[13px] text-[#64748d]"
              style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
            >
              © <span style={{ fontFeatureSettings: '"tnum"' }}>2026</span>{" "}
              Trovaar, Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Sitemap"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-[13px] text-[#64748d] transition-colors hover:text-[#533afd]"
                  style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Composited dashboard mockup — Stripe's signature "look at the actual
 * product" device. A faux live-bids panel rendered in tabular figures,
 * floating on the gradient with a subtle Level-2 shadow.
 * ------------------------------------------------------------------ */
function DashboardMockup() {
  const bids = [
    { pro: "Apex Roofing Co.", rating: "4.9", amount: "$2,140", state: "Lowest" },
    { pro: "Northgate Pros", rating: "4.8", amount: "$2,380", state: "" },
    { pro: "Summit Trades", rating: "5.0", amount: "$2,510", state: "" },
    { pro: "Cedar & Co.", rating: "4.7", amount: "$2,690", state: "" },
  ];

  return (
    <div
      className="rounded-[16px] border border-[#e3e8ee] bg-white p-5"
      style={{
        boxShadow:
          "rgba(0,55,112,0.08) 0 8px 24px, rgba(0,55,112,0.04) 0 2px 6px",
        fontFeatureSettings: '"tnum"',
      }}
    >
      {/* chrome header */}
      <div className="flex items-center justify-between border-b border-[#e3e8ee] pb-4">
        <div>
          <div
            className="text-[14px] text-[#0d253d]"
            style={{ fontWeight: 400, letterSpacing: "-0.2px" }}
          >
            Roof repair — 14 sq
          </div>
          <div
            className="mt-0.5 text-[13px] text-[#64748d]"
            style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
          >
            Posted 41 min ago · Austin, TX
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase"
          style={{ background: "#b9b9f9", color: "#4434d4", fontWeight: 400, letterSpacing: "0.1px" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#533afd" }} />
          Live · 4 bids
        </span>
      </div>

      {/* bid rows */}
      <div className="mt-2">
        {bids.map((b, i) => (
          <div
            key={b.pro}
            className="flex items-center justify-between py-3"
            style={{
              borderBottom: i < bids.length - 1 ? "1px solid #eef1f6" : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-[13px] text-[#4434d4]"
                style={{ background: "#f0eeff", fontWeight: 400 }}
              >
                {b.pro.charAt(0)}
              </span>
              <div>
                <div
                  className="text-[14px] text-[#0d253d]"
                  style={{ fontWeight: 400, letterSpacing: "-0.2px" }}
                >
                  {b.pro}
                </div>
                <div className="mt-0.5 flex items-center gap-1">
                  <Star size={11} strokeWidth={1.5} color="#9b6829" fill="#9b6829" />
                  <span
                    className="text-[13px] text-[#64748d]"
                    style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
                  >
                    {b.rating}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.state && (
                <span
                  className="hidden rounded-full px-2 py-0.5 text-[10px] uppercase sm:inline"
                  style={{ background: "#eef9f1", color: "#1f7a4d", fontWeight: 400, letterSpacing: "0.1px" }}
                >
                  {b.state}
                </span>
              )}
              <span
                className="text-[15px] text-[#0d253d]"
                style={{ fontWeight: 400, letterSpacing: "-0.42px" }}
              >
                {b.amount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* footer action */}
      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#f6f9fc] px-4 py-3">
        <div>
          <div
            className="text-[13px] text-[#64748d]"
            style={{ fontWeight: 400, letterSpacing: "-0.39px" }}
          >
            Est. market price
          </div>
          <div
            className="text-[14px] text-[#64748d] line-through"
            style={{ fontWeight: 400, letterSpacing: "-0.42px" }}
          >
            $3,200
          </div>
        </div>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#533afd] px-4 py-2 text-[14px] text-white"
          style={{ fontWeight: 400 }}
        >
          Accept best bid
          <ArrowRight size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
