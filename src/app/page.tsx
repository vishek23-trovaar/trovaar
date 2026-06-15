"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Gavel,
  CheckCircle2,
  Home,
  ShieldCheck,
  BadgeCheck,
  Lock,
  ScrollText,
  Star,
  Sparkles,
  Wrench,
  ClipboardCheck,
  Award,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES as ALL_CATEGORIES } from "@/lib/constants";

/*
 * Trovaar homepage — Linear design language.
 * Tokens from .design-ref/design-md/linear.app/DESIGN.md: near-black canvas
 * (#010102), a four-step charcoal surface ladder, hairline borders, a single
 * lavender-blue accent (#5e6ad2) used sparingly, and display type with tight
 * negative tracking. The hero's live-bid panel keeps the original animation
 * (job posts, then bids slide in one at a time), re-skinned to these tokens.
 */

const T = {
  // Linear's system, but with Trovaar's brand blue as the single accent
  // (matches the custom logo) instead of Linear's lavender.
  primary: "#3B82F6",
  primaryHover: "#60A5FA",
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

const TIERS = [
  { icon: Wrench, name: "Independent Pro", body: "Skilled local pro taking jobs on the side — no formal credentials needed, just talent and fair pricing." },
  { icon: ClipboardCheck, name: "Licensed Professional", body: "State- or trade-licensed for permitted, professional work." },
  { icon: Award, name: "Certified Specialist", body: "Industry-certified, insured, and running jobs full-time." },
  { icon: Star, name: "Master Tradesperson", body: "Top-rated with a proven track record — the pros clients trust most." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span style={{ ...ty.eyebrow, color: T.inkSubtle }} className="inline-block uppercase">{children}</span>;
}

/* ── Category marquee — a row of chips scrolls continuously; hover pauses.
 * (marqueeLeft/marqueeRight keyframes live in globals.css.) Re-skinned to
 * Linear: charcoal chips, hairline borders, no emoji. */
function MarqueeRow({
  items,
  direction,
  duration,
}: {
  items: { value: string; label: string }[];
  direction: "left" | "right";
  duration: number;
}) {
  const animation = direction === "left" ? "marqueeLeft" : "marqueeRight";
  return (
    <div className="group/marquee overflow-hidden">
      <div
        className="flex w-max gap-3 group-hover/marquee:[animation-play-state:paused]"
        style={{ animation: `${animation} ${duration}s linear infinite` }}
      >
        {[...items, ...items].map((cat, i) => (
          <Link
            key={`${cat.value}-${i}`}
            href={`/jobs?category=${cat.value}`}
            className="shrink-0 rounded-[8px] px-4 py-2 transition-colors hover:bg-[#141516]"
            style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}`, ...ty.bodySm, color: T.inkMuted }}
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
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
    <div className="w-full rounded-[16px] p-2" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
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

        <div className="space-y-3 p-4">
          {/* live board */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[8px] px-3.5 py-3" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[8px]" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                  <Home size={16} color={T.inkMuted} strokeWidth={1.8} />
                </span>
                <div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.014em", color: T.ink }}>Kitchen Faucet Replacement</div>
                  <div style={{ ...ty.bodySm, color: T.inkSubtle }}>Posted 3 min ago · Plumbing</div>
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

          {/* savings bar — fades up after the bids land */}
          <div
            className="flex items-center justify-between gap-4 rounded-[8px] p-4"
            style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}`, animation: "fadeInUp 0.5s ease-out 3.6s forwards", opacity: 0 }}
          >
            <div>
              <div style={{ ...ty.caption, color: T.inkSubtle }}>You save vs. big-company quote</div>
              <div className="flex items-baseline gap-2">
                <span style={{ ...ty.displayMd, color: T.ink }}>$255</span>
                <span style={{ ...ty.caption, color: T.success }}>37% lower</span>
              </div>
            </div>
            <div style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="grid h-9 shrink-0 place-items-center rounded-[8px] px-4">Accept bid</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Split all 149 services into 3 roughly-equal marquee rows (module-level —
// the list is static).
const marqueeRows: { value: string; label: string }[][] = [[], [], []];
ALL_CATEGORIES.forEach((c, i) => marqueeRows[i % 3].push({ value: c.value, label: c.label }));

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
              <Image src="/trovaar-icon.png" alt="Trovaar" width={30} height={22} priority style={{ height: 22, width: "auto" }} />
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
          <div className="grid items-center gap-10 pt-20 pb-16 md:pt-24 md:pb-20 lg:grid-cols-[1fr_minmax(420px,500px)] lg:gap-14">
            {/* left — copy + CTAs */}
            <div className="text-center lg:text-left">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: T.surface2, border: `1px solid ${T.hairline}` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.success }} />
                <span style={{ ...ty.caption, color: T.inkMuted }}>Stop searching, start finding.</span>
              </div>
              <h1 style={ty.displayXl} className="mx-auto max-w-[15ch] text-balance lg:mx-0">The network that connects every skilled trade to every job.</h1>
              <p style={{ ...ty.bodyLg, color: T.inkSubtle }} className="mx-auto mt-7 max-w-[52ch] text-pretty lg:mx-0">
                Like Uber — but for home repairs, auto work, and commercial services. Post a job, watch local pros compete in real time, and save 20–40%.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href={primaryCta.href} style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="inline-flex h-10 items-center gap-1.5 rounded-[8px] px-5 transition-colors hover:bg-[#828fff]">
                  {primaryCta.label}<ArrowRight size={16} strokeWidth={2.2} />
                </Link>
                <Link href={secondaryCta.href} style={{ ...ty.button, backgroundColor: T.surface1, color: T.ink, border: `1px solid ${T.hairline}` }} className="inline-flex h-10 items-center rounded-[8px] px-5 transition-colors hover:bg-[#141516]">
                  {secondaryCta.label}
                </Link>
              </div>
            </div>

            {/* right — the kept live-bid animation, now above the fold */}
            <div className="w-full">
              <AnimatedBidPanel />
            </div>
          </div>
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

        {/* ── Categories (marquee) ── */}
        <section className="pt-24 md:pt-32">
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="max-w-[640px]">
              <Eyebrow>Categories</Eyebrow>
              <h2 style={ty.displayLg} className="mt-4 text-balance">Every trade, one network.</h2>
              <p style={{ ...ty.subhead, color: T.inkSubtle }} className="mt-4">149 services across 13 categories — hover to pause, click to browse.</p>
            </div>
          </div>
          {/* full-bleed scrolling chip rows with edge fades */}
          <div className="relative mt-12 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(to right, ${T.canvas}, transparent)` }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(to left, ${T.canvas}, transparent)` }} />
            <div className="space-y-3 px-6">
              <MarqueeRow items={marqueeRows[0]} direction="left" duration={70} />
              <MarqueeRow items={marqueeRows[1]} direction="right" duration={88} />
              <MarqueeRow items={marqueeRows[2]} direction="left" duration={60} />
            </div>
          </div>
        </section>

        {/* ── Quote Buster ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="relative overflow-hidden rounded-[16px] p-8 md:p-12" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
            <div className="grid gap-10 md:grid-cols-[1.25fr_1fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                  <Sparkles size={13} color={T.primary} strokeWidth={2} />
                  <span style={{ ...ty.caption, color: T.inkMuted }}>Quote Buster</span>
                </div>
                <h2 style={ty.displayMd} className="mt-5 max-w-[18ch] text-balance">Already got a quote? Find out if it&apos;s fair.</h2>
                <p style={{ ...ty.bodyLg, color: T.inkSubtle }} className="mt-4 max-w-[52ch]">
                  Paste a price you were quoted and Trovaar checks it against real local bids — so you know in seconds whether you&apos;re being overcharged, before you commit a cent.
                </p>
                <Link href="/quote-buster" style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-[8px] px-5 transition-colors hover:bg-[#828fff]">
                  Check a quote<ArrowRight size={16} strokeWidth={2.2} />
                </Link>
              </div>
              {/* mini visual: a flagged quote vs. fair range */}
              <div className="rounded-[12px] p-5" style={{ backgroundColor: T.canvas, border: `1px solid ${T.hairline}` }}>
                <div className="flex items-center justify-between">
                  <span style={{ ...ty.caption, color: T.inkSubtle }}>Their quote</span>
                  <span className="rounded-full px-2 py-0.5" style={{ ...ty.caption, backgroundColor: "rgba(248,113,113,0.14)", color: "#fca5a5" }}>58% high</span>
                </div>
                <div style={{ ...ty.displayMd, color: T.ink }} className="mt-1">$1,200</div>
                <div className="my-4 h-px" style={{ backgroundColor: T.hairline }} />
                <div className="flex items-center justify-between">
                  <span style={{ ...ty.caption, color: T.inkSubtle }}>Fair local range</span>
                  <span className="inline-flex items-center gap-1.5" style={{ ...ty.caption, color: T.success }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.success }} />6 bids
                  </span>
                </div>
                <div style={{ ...ty.headline, color: T.ink }} className="mt-1">$620 – $760</div>
              </div>
            </div>
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

        {/* ── For professionals (tiers) ── */}
        <section className="mx-auto max-w-[1280px] px-6 pt-24 md:pt-32">
          <div className="max-w-[680px]">
            <Eyebrow>For professionals</Eyebrow>
            <h2 style={ty.displayLg} className="mt-4 text-balance">From hustle to mastery.</h2>
            <p style={{ ...ty.subhead, color: T.inkSubtle }} className="mt-4">
              Side jobs or a full-time trade business — there&apos;s a tier for your level. No lead fees, set your own rates, and build a reputation that wins better work.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map(({ icon: Icon, name, body }) => (
              <div key={name} className="rounded-[12px] p-6" style={{ backgroundColor: T.surface1, border: `1px solid ${T.hairline}` }}>
                <span className="grid h-10 w-10 place-items-center rounded-[8px]" style={{ backgroundColor: T.surface3, border: `1px solid ${T.hairline}` }}>
                  <Icon size={18} color={T.primary} strokeWidth={1.8} />
                </span>
                <h3 style={{ ...ty.bodyLg, color: T.ink, fontWeight: 600 }} className="mt-5">{name}</h3>
                <p style={{ ...ty.bodySm, color: T.inkSubtle }} className="mt-2">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-9">
            <Link href="/signup?role=contractor" style={{ ...ty.button, backgroundColor: T.primary, color: T.onPrimary }} className="inline-flex h-10 items-center gap-1.5 rounded-[8px] px-5 transition-colors hover:bg-[#828fff]">
              Join as a Pro<ArrowRight size={16} strokeWidth={2.2} />
            </Link>
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
                <Image src="/trovaar-icon.png" alt="Trovaar" width={30} height={22} style={{ height: 22, width: "auto" }} />
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
