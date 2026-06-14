import type { Metadata } from "next";
import {
  ArrowRight,
  Camera,
  Users,
  CheckCircle2,
  ShieldCheck,
  BadgeCheck,
  Lock,
  ScrollText,
  Wrench,
  Zap,
  Wind,
  Home,
  PaintRoller,
  Hammer,
  Trees,
  Car,
  WashingMachine,
  Drill,
  Sparkles,
  Truck,
  Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trovaar — The network for every skilled trade",
  description:
    "Like Uber, but for home repairs, auto work, and commercial services. Post a job, watch local pros compete in real time, and save 20–40%.",
};

/* ─────────────────────────────────────────────────────────────────────────
   Uber-language design preview for Trovaar.
   Pure black/white + grayscale. No accent color, no gradients.
   Display: weight-700 sentence-case. Pill (999px) on every interactive
   element. Cards at 16px. Alternating white → black band rhythm.
   Type stack mirrors the DESIGN.md substitute guidance (Inter/Geist-class
   geometric sans via the app's Geist family + system fallbacks).
   ──────────────────────────────────────────────────────────────────────── */

const FONT_DISPLAY =
  'var(--font-geist-sans), "UberMove", system-ui, "Helvetica Neue", Arial, sans-serif';
const FONT_TEXT =
  'var(--font-geist-sans), "UberMoveText", system-ui, "Helvetica Neue", Arial, sans-serif';

const steps = [
  {
    icon: Camera,
    title: "Snap & post",
    body: "Upload a photo and describe the job in under 2 minutes.",
  },
  {
    icon: Users,
    title: "Pros compete",
    body: "Verified local tradespeople send competitive bids.",
  },
  {
    icon: CheckCircle2,
    title: "Choose & save",
    body: "Pick your pro, save 20–40%, no obligation until you accept.",
  },
];

const stats = [
  { value: "149", label: "Services" },
  { value: "13", label: "Categories" },
  { value: "20–40%", label: "Average savings" },
  { value: "Free", label: "For consumers" },
];

const categories = [
  { icon: Wrench, label: "Plumbing" },
  { icon: Zap, label: "Electrical" },
  { icon: Wind, label: "HVAC" },
  { icon: Home, label: "Roofing" },
  { icon: PaintRoller, label: "Painting" },
  { icon: Hammer, label: "Carpentry" },
  { icon: Trees, label: "Landscaping" },
  { icon: Car, label: "Auto Repair" },
  { icon: WashingMachine, label: "Appliance Repair" },
  { icon: Drill, label: "Handyman" },
  { icon: Sparkles, label: "Cleaning" },
  { icon: Truck, label: "Moving" },
];

const trust = [
  { icon: ShieldCheck, label: "Background-checked pros" },
  { icon: BadgeCheck, label: "ID verified" },
  { icon: Lock, label: "Secure escrow payments" },
  { icon: ScrollText, label: "Licensed where required" },
];

const footerColumns = [
  {
    heading: "Company",
    links: ["About", "Our offerings", "Newsroom", "Investors", "Careers"],
  },
  {
    heading: "Services",
    links: ["Home repair", "Auto work", "Commercial", "Find a pro", "Pricing"],
  },
  {
    heading: "For pros",
    links: ["Become a pro", "Pro app", "Requirements", "Pro support", "Insurance"],
  },
  {
    heading: "Support",
    links: ["Help center", "Trust & safety", "How escrow works", "Contact", "Accessibility"],
  },
];

export default function UberDesignPreviewPage() {
  return (
    <div
      className="min-h-screen bg-white text-black"
      style={{ fontFamily: FONT_TEXT }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-8">
            <a
              href="/design-preview/uber"
              className="text-[22px] font-bold tracking-tight text-black"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Trovaar
            </a>
            <div className="hidden items-center gap-1 lg:flex">
              {["Post a job", "Find work", "How it works", "Pricing"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="rounded-full px-3 py-2 text-[16px] font-medium text-black transition-colors hover:bg-[#efefef]"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="hidden rounded-full px-4 py-2.5 text-[16px] font-medium text-black transition-colors hover:bg-[#efefef] sm:inline-flex"
            >
              Log in
            </a>
            <a
              href="#"
              className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-[16px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign up
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO (white) ────────────────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {/* Left: headline + CTAs */}
            <div>
              <p
                className="mb-5 text-[14px] font-medium uppercase tracking-[0.14em] text-[#5e5e5e]"
              >
                Stop searching, start finding.
              </p>
              <h1
                className="text-[40px] font-bold leading-[1.06] text-black sm:text-[48px] lg:text-[56px] lg:leading-[1.04]"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                The network that connects every skilled trade to every job.
              </h1>
              <p className="mt-6 max-w-xl text-[18px] font-normal leading-[1.5] text-[#5e5e5e]">
                Like Uber — but for home repairs, auto work, and commercial
                services. Post a job, watch local pros compete in real time,
                and save 20–40%.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-4 text-[16px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Post a Job
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-full bg-[#efefef] px-7 py-4 text-[16px] font-medium text-black transition-colors hover:bg-[#e2e2e2]"
                >
                  Find Work Near You
                </a>
              </div>
            </div>

            {/* Right: request-form card (Uber's signature hero card) */}
            <div className="lg:justify-self-end">
              <div className="w-full max-w-[460px] rounded-2xl bg-white p-4 shadow-[rgba(0,0,0,0.16)_0px_4px_16px_0px]">
                <div className="mb-4 flex gap-1 rounded-[36px] bg-[#efefef] p-1">
                  <span className="flex-1 rounded-[36px] bg-white px-4 py-2.5 text-center text-[16px] font-medium text-black shadow-[rgba(0,0,0,0.12)_0px_1px_3px_0px]">
                    Hire a pro
                  </span>
                  <span className="flex-1 rounded-[36px] px-4 py-2.5 text-center text-[16px] font-medium text-[#5e5e5e]">
                    Find work
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-[#efefef] px-4 py-4">
                    <Wrench className="h-5 w-5 shrink-0 text-black" strokeWidth={2} />
                    <span className="text-[16px] text-black">
                      What do you need done?
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[#efefef] px-4 py-4">
                    <Home className="h-5 w-5 shrink-0 text-black" strokeWidth={2} />
                    <span className="text-[16px] text-[#afafaf]">
                      Enter your address
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-[#efefef] px-4 py-4">
                    <Camera className="h-5 w-5 shrink-0 text-black" strokeWidth={2} />
                    <span className="text-[16px] text-[#afafaf]">
                      Add a photo (optional)
                    </span>
                  </div>
                </div>

                <a
                  href="#"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-[16px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  See competing bids
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </a>
                <p className="mt-3 text-center text-[12px] leading-5 text-[#afafaf]">
                  Free to post · No obligation until you accept a bid
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (white) ─────────────────────────────────────── */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-20">
            <h2
              className="max-w-2xl text-[32px] font-bold leading-[1.1] text-black sm:text-[36px]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              How it works
            </h2>
            <p className="mt-3 max-w-xl text-[18px] text-[#5e5e5e]">
              Three steps from problem to fixed — no phone tag, no haggling.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex flex-col rounded-2xl bg-[#efefef] p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                        <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                      </span>
                      <span
                        className="text-[20px] font-bold text-[#afafaf]"
                        style={{ fontFamily: FONT_DISPLAY }}
                      >
                        0{i + 1}
                      </span>
                    </div>
                    <h3
                      className="mt-6 text-[20px] font-bold text-black"
                      style={{ fontFamily: FONT_DISPLAY }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[16px] leading-6 text-[#5e5e5e]">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES (white) ───────────────────────────────────────── */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-20">
            <h2
              className="text-[32px] font-bold leading-[1.1] text-black sm:text-[36px]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Every trade, one network
            </h2>
            <p className="mt-3 max-w-xl text-[18px] text-[#5e5e5e]">
              From a leaky faucet to a full remodel — find the right pro.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#efefef] px-5 py-2.5 text-[14px] font-medium text-black transition-colors hover:bg-[#e2e2e2]"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BLACK PROMO BAND (stats + CTA) ───────────────────────────── */}
        <section className="bg-black text-white">
          <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-24">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
              <div>
                <h2
                  className="text-[32px] font-bold leading-[1.08] text-white sm:text-[40px]"
                  style={{ fontFamily: FONT_DISPLAY }}
                >
                  Post a job. Let the pros come to you.
                </h2>
                <p className="mt-5 max-w-md text-[18px] leading-[1.5] text-[#afafaf]">
                  Real bids from verified local tradespeople, in real time.
                  Free for consumers — always.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-medium text-black transition-opacity hover:opacity-90"
                  >
                    Post a Job
                    <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-4 text-[16px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Find Work Near You
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="bg-black px-6 py-8 sm:px-8 sm:py-10"
                  >
                    <div
                      className="text-[32px] font-bold leading-none text-white sm:text-[40px]"
                      style={{ fontFamily: FONT_DISPLAY }}
                    >
                      {s.value}
                    </div>
                    <div className="mt-2 text-[14px] text-[#afafaf]">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST (white) ────────────────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-20">
            <h2
              className="text-[32px] font-bold leading-[1.1] text-black sm:text-[36px]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Built on trust
            </h2>
            <p className="mt-3 max-w-xl text-[18px] text-[#5e5e5e]">
              Every pro is vetted. Every payment is protected.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.label}
                    className="flex items-start gap-4 rounded-2xl border border-black/10 p-6"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#efefef]">
                      <Icon className="h-5 w-5 text-black" strokeWidth={2} />
                    </span>
                    <span className="pt-2 text-[16px] font-medium leading-[1.3] text-black">
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIAL (white) ──────────────────────────────────────── */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-black"
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                ))}
              </div>
              <blockquote
                className="text-[28px] font-bold leading-[1.2] text-black sm:text-[36px]"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                “Got 4 bids within an hour of posting my roof repair. Saved over
                $800.”
              </blockquote>
              <figcaption className="mt-8 text-[16px] font-medium text-[#5e5e5e]">
                Jessica M. · Homeowner
              </figcaption>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA STRIP (white → leads into black footer) ────────── */}
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center md:px-8">
            <h2
              className="text-[24px] font-bold leading-[1.1] text-black sm:text-[28px]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Ready to stop searching and start finding?
            </h2>
            <a
              href="#"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-7 py-4 text-[16px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Post a Job
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </a>
          </div>
        </section>
      </main>

      {/* ── FOOTER (deep black) ────────────────────────────────────────── */}
      <footer className="bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-20">
          <div
            className="text-[28px] font-bold tracking-tight text-white"
            style={{ fontFamily: FONT_DISPLAY }}
          >
            Trovaar
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h3 className="text-[16px] font-medium text-white">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[14px] text-[#afafaf] transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-[12px] leading-5 text-[#afafaf]">
              © 2026 Trovaar Technologies Inc. · Stop searching, start finding.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["Privacy", "Terms", "Accessibility", "Cookie settings"].map(
                (l) => (
                  <a
                    key={l}
                    href="#"
                    className="text-[12px] text-[#afafaf] transition-colors hover:text-white"
                  >
                    {l}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
