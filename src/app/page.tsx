"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Gavel,
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
  Boxes,
  Sparkles,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Lock,
  ScrollText,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/*
 * Trovaar homepage — Linear design language.
 * Tokens from .design-ref/design-md/linear.app/DESIGN.md: near-black canvas
 * (#010102), a four-step charcoal surface ladder, hairline borders, a single
 * lavender-blue accent (#5e6ad2) used sparingly, and display type with tight
 * negative tracking. The hero's live-bid panel keeps the original animation
 * (job posts, then bids slide in one at a time), re-skinned to these tokens.
 */

const T = {
  primary: "#5e6ad2",
  primaryHover: "#828fff",
  onPrimary: "#ffffff",
  ink: "#f7f8f8",
  inkMuted: "#d0d6e0",
  inkSubtle: "#8a8f98",
  inkTertiary: "#62666d",
  canvas: "#010102",
  surface1: "#0f1011",
  surface2: "#141516",
  surface3: "#18191a",
  hairline: "#23252a",
  hairlineStrong: "#34343a",
  success: "#27a644",
} as const;

const DISPLAY_STACK =
  'Inter, "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

type Type = Pick<CSSProperties, "fontFamily" | "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing">;
const display = (fontSize: string, letterSpacing: string, fontWeight = 600, lineHeight = 1.1): Type => ({
  fontFamily: DISPLAY_STACK, fontSize, fontWeight, lineHeight, letterSpacing,
});

const ty = {
  displayXl: display("clamp(2.5rem, 6.2vw, 5rem)", "-0.03em"),
  displayLg: display("clamp(2rem, 4.4vw, 3.5rem)", "-0.022em", 600, 1.1),
  displayMd: display("clamp(1.75rem, 3vw, 2.5rem)", "-0.018em", 600, 1.15),
  headline: display("1.75rem", "-0.021em", 600, 1.2),
  cardTitle: display("1.375rem", "-0.018em", 500, 1.25),
  subhead: { fontFamily: DISPLAY_STACK, fontSize: "1.25rem", fontWeight: 400, lineHeight: 1.4, letterSpacing: "-0.01em" } as Type,
  bodyLg: { fontSize: "1.125rem", fontWeight: 400, lineHeight: 1.5, letterSpacing: "-0.005em" } as Type,
  body: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5, letterSpacing: "-0.003em" } as Type,
  bodySm: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5, letterSpacing: "0" } as Type,
  caption: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.4, letterSpacing: "0" } as Type,
  button: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.2, letterSpacing: "0" } as Type,
  eyebrow: { fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.3, letterSpacing: "0.4px" } as Type,
} as const;

const NAV_LINKS = [
  { label: "Quote Buster", href: "/quote-buster" },
  { label: "About", href: "/about" },
  { label: "Browse Jobs", href: "/jobs" },
];

const STEPS = [
  { icon: Camera, n: "01", title: "Snap & Post", body: "Upload a photo and describe the job in under 2 minutes. No phone tag, no waiting on callbacks." },
  { icon: Gavel, n: "02", title: "Pros Compete", body: "Verified local tradespeople send competitive bids in real time. You watch the offers come in." },
  { icon: CheckCircle2, n: "03", title: "Choose & Save", body: "Pick your pro, save 20–40%, and pay nothing until you accept. No obligation, ever." },
];

const CATEGORIES = [
  { icon: Wrench, label: "Plumbing", value: "plumbing" },
  { icon: Zap, label: "Electrical", value: "electrical" },
  { icon: Wind, label: "HVAC", value: "hvac" },
  { icon: Home, label: "Roofing", value: "roofing" },
  { icon: Paintbrush, label: "Painting", value: "painting" },
  { icon: Hammer, label: "Carpentry", value: "carpentry" },
  { icon: Trees, label: "Landscaping", value: "landscaping" },
  { icon: Car, label: "Auto Repair", value: "auto_repair" },
  { icon: Refrigerator, label: "Appliance Repair", value: "appliance_repair" },
  { icon: Boxes, label: "Handyman", value: "handyman" },
  { icon: Sparkles, label: "Cleaning", value: "cleaning" },
  { icon: Truck, label: "Moving", value: "moving" },
];

const STATS = [
  { value: "149", label: "Services" },
  { value: "13", label: "Categories" },
  { value: "20–40%", label: "Average savings" },
  { value: "Free", label: "For consumers" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Background-checked pros" },
  { icon: BadgeCheck, label: "ID verified" },
  { icon: Lock, label: "Secure escrow payments" },
  { icon: ScrollText, label: "Licensed where required" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span style={{ ...ty.eyebrow, color: T.inkSubtle }} className="inline-block uppercase">{children}</span>;
}

/* ── The kept animation, re-skinned to Linear ───────────────────────────────
 * A job posts, then three bids slide in one at a time (slideInRight, staggered
 * delays — keyframes live in globals.css), then the savings card fades up. */
function AnimatedBidPanel() {
  const bids = [
    { name: "Mike R.", initials: "MR", price: "$180", time: "Tomorrow", rating: "4.9", delay: "0.6s", lead: true },
    { name: "Sarah T.", initials: "ST", price: "$155", time: "Today 5pm", rating: "4.8", delay: "1.6s", lead: false },
    { name: "Carlos M.", initials: "CM", price: "$145", time: "Tomorrow AM", rating: "5.0", delay: "2.6s", lead: false },
  ];
  return (
    <div className="mx-auto max-w-[1080px] rounded-[16px] p-2" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
      <div className="overflow-hidden rounded-[10px]" style={{ backgroundColor: T.canvas, border: `1px solid ${T.hairline}` }}>
        {/* faux app chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${T.hairline}` }}>
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: T.hairlineStrong }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: T.hairlineStrong }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: T.hairlineStrong }} />
          </span>
          <span style={{ ...ty.caption, color: T.inkTertiary }} className="ml-2 font-mono">trovaar.com/jobs/kitchen-faucet</span>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-[1fr_260px]">
          {/* live board */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[8px] px-3.5 py-3" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[8px]" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                  <Home size={16} color={T.inkMuted} strokeWidth={1.8} />
                </span>
                <div>
                  <div style={{ ...ty.bodySm, color: T.ink, fontWeight: 500 }}>Kitchen Faucet Replacement</div>
                  <div style={{ ...ty.caption, color: T.inkSubtle }}>Posted 3 min ago · Plumbing</div>
                </div>
              </div>
              <span className="rounded-full px-2 py-0.5 inline-flex items-center gap-1.5" style={{ ...ty.caption, backgroundColor: T.surface2, color: T.success }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.success }} /> Live
              </span>
            </div>

            {bids.map((bid) => (
              <div
                key={bid.name}
                className="flex items-center justify-between rounded-[8px] px-3.5 py-3"
                style={{
                  backgroundColor: T.surface1,
                  border: `1px solid ${bid.lead ? T.hairlineStrong : T.hairline}`,
                  animation: "slideInRight 0.5s ease-out forwards",
                  animationDelay: bid.delay,
                  opacity: 0,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: T.surface3, ...ty.caption, color: T.inkMuted }}>{bid.initials}</span>
                  <div>
                    <div style={{ ...ty.bodySm, color: T.ink }}>{bid.name}</div>
                    <div className="flex items-center gap-1" style={{ ...ty.caption, color: T.inkSubtle }}>
                      <Star size={11} fill={T.inkSubtle} strokeWidth={0} /> {bid.rating} · {bid.time}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ ...ty.bodySm, color: T.ink, fontWeight: 600 }}>{bid.price}</div>
                  {bid.lead && <div style={{ ...ty.caption, color: T.primary }}>Lowest bid</div>}
                </div>
              </div>
            ))}
          </div>

          {/* savings panel — fades up after the bids land */}
          <div
            className="hidden flex-col justify-between rounded-[8px] p-4 sm:flex"
            style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}`, animation: "fadeInUp 0.5s ease-out 3.6s forwards", opacity: 0 }}
          >
            <div className="space-y-1">
              <div style={{ ...ty.caption, color: T.inkSubtle }}>You save vs. big-company quote</div>
              <div style={{ ...ty.displayMd, color: T.ink }}>$255</div>
              <div style={{ ...ty.caption, color: T.success }}>37% lower</div>
            </div>
            <div style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="mt-4 grid h-9 place-items-center rounded-[8px]">Accept bid</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  const primaryCta =
    user?.role === "consumer"
      ? { href: "/jobs/new", label: "Post a Job" }
      : user?.role === "contractor"
        ? { href: "/jobs", label: "Find Jobs Near You" }
        : { href: "/signup?role=consumer", label: "Post a Job" };
  const secondaryCta =
    user?.role
      ? { href: "/jobs", label: "Browse Jobs" }
      : { href: "/signup?role=contractor", label: "Find Work Near You" };

  return (
    <div style={{ backgroundColor: T.canvas, color: T.ink, fontFamily: DISPLAY_STACK }} className="min-h-screen w-full antialiased selection:bg-[#5e6ad2]/30">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(1,1,2,0.72)", borderBottom: `1px solid ${T.hairline}` }}>
        <nav className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-9">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-[6px]" style={{ backgroundColor: T.primary }}>
                <Wrench size={14} color={T.onPrimary} strokeWidth={2.4} />
              </span>
              <span style={{ fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Trovaar</span>
            </Link>
            <div className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} style={{ ...ty.bodySm, color: T.inkSubtle }} className="transition-colors hover:text-[#f7f8f8]">{link.label}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="rounded-[8px] px-3.5 py-2 transition-colors hover:bg-[#828fff]">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" style={{ ...ty.button, color: T.inkMuted }} className="hidden rounded-[8px] px-3 py-2 transition-colors hover:text-[#f7f8f8] sm:inline-block">Sign in</Link>
                <Link href="/signup" style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="rounded-[8px] px-3.5 py-2 transition-colors hover:bg-[#828fff]">Sign up</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto max-w-[1280px] px-6">
          <div className="mx-auto max-w-[860px] pt-24 pb-16 text-center md:pt-32 md:pb-20">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: T.surface2, border: `1px solid ${T.hairline}` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.success }} />
              <span style={{ ...ty.caption, color: T.inkMuted }}>Stop searching, start finding.</span>
            </div>
            <h1 style={ty.displayXl} className="mx-auto max-w-[14ch] text-balance">The network that connects every skilled trade to every job.</h1>
            <p style={{ ...ty.bodyLg, color: T.inkSubtle }} className="mx-auto mt-7 max-w-[58ch] text-pretty">
              Like Uber — but for home repairs, auto work, and commercial services. Post a job, watch local pros compete in real time, and save 20–40%.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryCta.href} style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="inline-flex h-10 items-center gap-1.5 rounded-[8px] px-5 transition-colors hover:bg-[#828fff]">
                {primaryCta.label}<ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link href={secondaryCta.href} style={{ ...ty.button, backgroundColor: T.surface1, color: T.ink, border: `1px solid ${T.hairline}` }} className="inline-flex h-10 items-center rounded-[8px] px-5 transition-colors hover:bg-[#141516]">
                {secondaryCta.label}
              </Link>
            </div>
          </div>

          {/* the kept animation */}
          <AnimatedBidPanel />
        </section>

        {/* ── Trust row ── */}
        <section className="mx-auto max-w-[1280px] px-6">
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] md:grid-cols-4" style={{ backgroundColor: T.hairline, border: `1px solid ${T.hairline}` }}>
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-5 py-4" style={{ backgroundColor: T.canvas }}>
                <Icon size={16} color={T.inkSubtle} strokeWidth={1.8} />
                <span style={{ ...ty.bodySm, color: T.inkMuted }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="max-w-[640px]">
            <Eyebrow>How it works</Eyebrow>
            <h2 style={ty.displayLg} className="mt-4 text-balance">From photo to hired in minutes.</h2>
            <p style={{ ...ty.subhead, color: T.inkSubtle }} className="mt-4">Three steps. No middlemen, no markup, no obligation until you accept.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, n, title, body }) => (
              <div key={n} className="rounded-[12px] p-6" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-[8px]" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                    <Icon size={18} color={T.ink} strokeWidth={1.8} />
                  </span>
                  <span style={{ ...ty.caption, color: T.inkTertiary }} className="font-mono">{n}</span>
                </div>
                <h3 style={ty.cardTitle} className="mt-6">{title}</h3>
                <p style={{ ...ty.bodySm, color: T.inkSubtle }} className="mt-2.5">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="max-w-[640px]">
            <Eyebrow>Categories</Eyebrow>
            <h2 style={ty.displayLg} className="mt-4 text-balance">Every trade, one network.</h2>
            <p style={{ ...ty.subhead, color: T.inkSubtle }} className="mt-4">149 services across 13 categories — from a leaky faucet to a full commercial build-out.</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map(({ icon: Icon, label, value }) => (
              <Link key={value} href={`/jobs?category=${value}`} className="group flex items-center gap-3 rounded-[12px] px-4 py-3.5 transition-colors hover:bg-[#141516]" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                  <Icon size={16} color={T.inkMuted} strokeWidth={1.8} />
                </span>
                <span style={{ ...ty.bodySm, color: T.ink }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] md:grid-cols-4" style={{ backgroundColor: T.hairline, border: `1px solid ${T.hairline}` }}>
            {STATS.map(({ value, label }) => (
              <div key={label} className="px-6 py-10 text-center" style={{ backgroundColor: T.surface1 }}>
                <div style={{ ...ty.displayMd, color: T.ink }}>{value}</div>
                <div style={{ ...ty.bodySm, color: T.inkSubtle }} className="mt-2">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonial ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="mx-auto max-w-[820px] rounded-[12px] p-8 md:p-12" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill={T.primary} color={T.primary} strokeWidth={0} />)}
            </div>
            <blockquote style={{ ...ty.headline, color: T.ink }} className="mt-6 text-balance">
              &ldquo;Got 4 bids within an hour of posting my roof repair. Saved over $800.&rdquo;
            </blockquote>
            <div className="mt-7 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: T.surface3, ...ty.bodySm, color: T.inkMuted }}>JM</span>
              <div>
                <div style={{ ...ty.bodySm, color: T.ink, fontWeight: 500 }}>Jessica M.</div>
                <div style={{ ...ty.caption, color: T.inkSubtle }}>Homeowner</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="relative overflow-hidden rounded-[12px] px-8 py-16 text-center md:px-12 md:py-20" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
            <h2 style={ty.displayLg} className="mx-auto max-w-[20ch] text-balance">Stop searching. Start finding.</h2>
            <p style={{ ...ty.bodyLg, color: T.inkSubtle }} className="mx-auto mt-5 max-w-[52ch]">
              Post your first job in under two minutes and watch local pros compete. Free for consumers, no obligation.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryCta.href} style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="inline-flex h-10 items-center gap-1.5 rounded-[8px] px-5 transition-colors hover:bg-[#828fff]">
                {primaryCta.label}<ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link href={secondaryCta.href} style={{ ...ty.button, backgroundColor: "transparent", color: T.ink, border: `1px solid ${T.hairlineStrong}` }} className="inline-flex h-10 items-center rounded-[8px] px-5 transition-colors hover:bg-[#141516]">
                {secondaryCta.label}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mx-auto mt-24 max-w-[1280px] px-6 md:mt-32">
          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]" style={{ borderTop: `1px solid ${T.hairline}` }}>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-[6px]" style={{ backgroundColor: T.primary }}>
                  <Wrench size={14} color={T.onPrimary} strokeWidth={2.4} />
                </span>
                <span style={{ fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Trovaar</span>
              </div>
              <p style={{ ...ty.bodySm, color: T.inkSubtle }} className="mt-4 max-w-[34ch]">The network that connects every skilled trade to every job.</p>
            </div>
            {[
              { h: "Product", links: [{ label: "Post a Job", href: "/signup?role=consumer" }, { label: "Find Work", href: "/signup?role=contractor" }, { label: "Browse Jobs", href: "/jobs" }, { label: "Quote Buster", href: "/quote-buster" }] },
              { h: "Company", links: [{ label: "About", href: "/about" }, { label: "Help", href: "/help-requests" }, { label: "Referrals", href: "/referrals" }] },
              { h: "Legal", links: [{ label: "Terms", href: "/legal/terms" }, { label: "Privacy", href: "/legal/privacy" }, { label: "Guarantee", href: "/legal/guarantee" }] },
            ].map((col) => (
              <div key={col.h}>
                <div style={{ ...ty.caption, color: T.inkTertiary }} className="uppercase tracking-wider">{col.h}</div>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}><Link href={l.href} style={{ ...ty.bodySm, color: T.inkSubtle }} className="transition-colors hover:text-[#f7f8f8]">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center" style={{ borderTop: `1px solid ${T.hairline}` }}>
            <span style={{ ...ty.caption, color: T.inkTertiary }}>© 2026 Trovaar, Inc. All rights reserved.</span>
            <div className="flex gap-5">
              {[{ label: "Terms", href: "/legal/terms" }, { label: "Privacy", href: "/legal/privacy" }].map((l) => (
                <Link key={l.href} href={l.href} style={{ ...ty.caption, color: T.inkTertiary }} className="transition-colors hover:text-[#8a8f98]">{l.label}</Link>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
