import type { Metadata } from "next";
import {
  Search,
  MapPin,
  Globe,
  Menu,
  Wrench,
  Zap,
  Wind,
  Home,
  PaintRoller,
  Hammer,
  Trees,
  Car,
  Refrigerator,
  Plug,
  Sparkles,
  Truck,
  Camera,
  Gavel,
  BadgeCheck,
  ShieldCheck,
  Lock,
  ScrollText,
  Star,
  ArrowRight,
  Facebook,
  Twitter,
  Instagram,
} from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────────
 * Trovaar — Airbnb design-language homepage preview
 *
 * Faithful to .design-ref/design-md/airbnb/DESIGN.md:
 *   · Pure-white canvas (#ffffff), near-black ink (#222222), one Rausch accent (#ff385c)
 *   · Airbnb Cereal VF type stack at modest display weights (500–700)
 *   · Pill search bar (rounded-full) + circular Rausch search orb
 *   · Photo-first cards at rounded-md (14px), single soft shadow tier
 *   · 64px section rhythm, ~1280px max container
 * Self-contained static marketing page — no auth, no client state.
 * ─────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Trovaar — Stop searching, start finding.",
};

// Airbnb Cereal VF stack with Inter as the documented open-source substitute.
const FONT =
  "'Airbnb Cereal VF', Circular, Inter, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif";

// Token palette lifted directly from DESIGN.md.
const C = {
  primary: "#ff385c",
  primaryActive: "#e00b41",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  mutedSoft: "#929292",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
  canvas: "#ffffff",
  surfaceSoft: "#f7f7f7",
  surfaceStrong: "#f2f2f2",
  onPrimary: "#ffffff",
};

// The system's single shadow tier.
const SOFT_SHADOW =
  "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0";

type LucideIcon = typeof Search;

const CATEGORIES: { label: string; Icon: LucideIcon; tint: string; ink: string }[] = [
  { label: "Plumbing", Icon: Wrench, tint: "#fff0f3", ink: "#c13515" },
  { label: "Electrical", Icon: Zap, tint: "#fff7e6", ink: "#a86700" },
  { label: "HVAC", Icon: Wind, tint: "#eef6ff", ink: "#1f5fa8" },
  { label: "Roofing", Icon: Home, tint: "#f1f4f0", ink: "#3d6b3a" },
  { label: "Painting", Icon: PaintRoller, tint: "#f6f0ff", ink: "#6b3bb0" },
  { label: "Carpentry", Icon: Hammer, tint: "#fbf2e8", ink: "#9a5b1e" },
  { label: "Landscaping", Icon: Trees, tint: "#eef7ee", ink: "#2f7a3a" },
  { label: "Auto Repair", Icon: Car, tint: "#eef1f6", ink: "#3a4d6b" },
  { label: "Appliance Repair", Icon: Refrigerator, tint: "#eef6f6", ink: "#1f7a78" },
  { label: "Handyman", Icon: Plug, tint: "#fff0f3", ink: "#c13515" },
  { label: "Cleaning", Icon: Sparkles, tint: "#f0f7ff", ink: "#2563a8" },
  { label: "Moving", Icon: Truck, tint: "#f4f1ec", ink: "#7a5c2e" },
];

const STEPS: { n: string; label: string; copy: string; Icon: LucideIcon }[] = [
  {
    n: "1",
    label: "Snap & Post",
    copy: "Upload a photo, describe the job in under 2 minutes.",
    Icon: Camera,
  },
  {
    n: "2",
    label: "Pros Compete",
    copy: "Verified local tradespeople send competitive bids.",
    Icon: Gavel,
  },
  {
    n: "3",
    label: "Choose & Save",
    copy: "Pick your pro, save 20–40%, no obligation until you accept.",
    Icon: BadgeCheck,
  },
];

const STATS = [
  { value: "149", label: "services" },
  { value: "13", label: "categories" },
  { value: "20–40%", label: "average savings" },
  { value: "Free", label: "for consumers" },
];

const TRUST: { label: string; Icon: LucideIcon }[] = [
  { label: "Background-checked pros", Icon: ShieldCheck },
  { label: "ID verified", Icon: BadgeCheck },
  { label: "Secure escrow payments", Icon: Lock },
  { label: "Licensed where required", Icon: ScrollText },
];

export default function TrovaarAirbnbPreview() {
  return (
    <div
      style={{
        fontFamily: FONT,
        background: C.canvas,
        color: C.ink,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ── Top navigation ─────────────────────────────────────────────── */}
      <header
        style={{
          height: 80,
          background: C.canvas,
          borderBottom: `1px solid ${C.hairlineSoft}`,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            height: "100%",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Wordmark */}
          <a
            href="#"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: C.primary,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 9999,
                background: C.primary,
                color: C.onPrimary,
              }}
            >
              <MapPin size={19} strokeWidth={2.4} />
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: -0.6,
                color: C.primary,
              }}
            >
              trovaar
            </span>
          </a>

          {/* Center product tabs */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.25,
            }}
            className="trv-center-nav"
          >
            <a href="#how" style={{ color: C.ink, textDecoration: "none" }}>
              How it works
            </a>
            <a href="#categories" style={{ color: C.muted, textDecoration: "none" }}>
              Services
            </a>
            <span style={{ position: "relative" }}>
              <a href="#find" style={{ color: C.muted, textDecoration: "none" }}>
                For pros
              </a>
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  right: -26,
                  background: C.canvas,
                  border: `1px solid ${C.hairline}`,
                  borderRadius: 9999,
                  padding: "2px 6px",
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: 0.32,
                  textTransform: "uppercase",
                  color: C.ink,
                }}
              >
                New
              </span>
            </span>
          </nav>

          {/* Right utilities */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <a
              href="#find"
              className="trv-host-link"
              style={{
                display: "none",
                padding: "12px 14px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                color: C.ink,
                textDecoration: "none",
              }}
            >
              Find work
            </a>
            <button
              aria-label="Choose language"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 9999,
                background: "transparent",
                border: "none",
                color: C.ink,
                cursor: "pointer",
              }}
            >
              <Globe size={18} />
            </button>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 42,
                padding: "0 8px 0 14px",
                borderRadius: 9999,
                background: C.canvas,
                border: `1px solid ${C.hairline}`,
                color: C.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Menu size={16} />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 9999,
                  background: C.ink,
                  color: C.onPrimary,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Sign in</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "64px 24px 8px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
              gap: 56,
              alignItems: "center",
            }}
            className="trv-hero-grid"
          >
            {/* Copy column */}
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px 6px 10px",
                  borderRadius: 9999,
                  background: "#fff0f3",
                  color: C.primary,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 24,
                }}
              >
                <Sparkles size={14} strokeWidth={2.4} />
                Stop searching, start finding.
              </span>

              <h1
                style={{
                  fontSize: 52,
                  fontWeight: 600,
                  lineHeight: 1.06,
                  letterSpacing: -1.4,
                  color: C.ink,
                  margin: 0,
                }}
                className="trv-h1"
              >
                The network that connects every skilled trade to every job.
              </h1>

              <p
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: 1.55,
                  color: C.body,
                  margin: "20px 0 0",
                  maxWidth: 520,
                }}
              >
                Like Uber — but for home repairs, auto work, and commercial
                services. Post a job, watch local pros compete in real time, and
                save 20–40%.
              </p>

              {/* Pill search-style element */}
              <div
                style={{
                  marginTop: 32,
                  display: "flex",
                  alignItems: "center",
                  background: C.canvas,
                  border: `1px solid ${C.hairline}`,
                  borderRadius: 9999,
                  boxShadow: SOFT_SHADOW,
                  height: 68,
                  maxWidth: 560,
                  padding: "0 8px 0 0",
                }}
                className="trv-search"
              >
                <div
                  style={{
                    flex: "1.3 1 0",
                    padding: "10px 16px 10px 24px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                    What do you need done?
                  </div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>
                    e.g. Replace water heater
                  </div>
                </div>
                <div style={{ width: 1, height: 32, background: C.hairline }} />
                <div
                  style={{
                    flex: "1 1 0",
                    padding: "10px 16px",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                  className="trv-search-where"
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                    Where
                  </div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>
                    Your ZIP code
                  </div>
                </div>
                <button
                  aria-label="Post a job"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 52,
                    padding: "0 22px",
                    marginLeft: "auto",
                    borderRadius: 9999,
                    background: C.primary,
                    color: C.onPrimary,
                    border: "none",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Search size={18} strokeWidth={2.6} />
                  <span className="trv-search-orb-label">Post a Job</span>
                </button>
              </div>

              {/* CTAs */}
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="#how"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 48,
                    padding: "0 24px",
                    borderRadius: 8,
                    background: C.primary,
                    color: C.onPrimary,
                    fontSize: 16,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Post a Job
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#find"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 48,
                    padding: "0 23px",
                    borderRadius: 8,
                    background: C.canvas,
                    color: C.ink,
                    border: `1px solid ${C.ink}`,
                    fontSize: 16,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Find Work Near You
                </a>
              </div>
            </div>

            {/* Visual column — editorial photo-style tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "auto auto",
                gap: 16,
              }}
              className="trv-hero-visual"
            >
              <HeroTile
                tall
                tint="#fff0f3"
                ink={C.primary}
                Icon={Wrench}
                kicker="Live now"
                title="Leaky water heater"
                meta="4 pros bidding · 1.2 mi away"
              />
              <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}>
                <HeroTile
                  tint="#eef6ff"
                  ink="#1f5fa8"
                  Icon={Wind}
                  kicker="Saved $640"
                  title="AC tune-up"
                  meta="Booked in 22 min"
                />
                <HeroTile
                  tint="#eef7ee"
                  ink="#2f7a3a"
                  Icon={PaintRoller}
                  kicker="6 bids"
                  title="Repaint living room"
                  meta="Top-rated pro chosen"
                />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              marginTop: 56,
              borderTop: `1px solid ${C.hairlineSoft}`,
              borderBottom: `1px solid ${C.hairlineSoft}`,
              padding: "28px 0",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
            className="trv-stats"
          >
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: C.ink,
                    letterSpacing: -0.6,
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────── */}
        <section
          id="categories"
          style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 0" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: -0.4,
                  color: C.ink,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Browse by trade
              </h2>
              <p style={{ fontSize: 16, color: C.muted, margin: "8px 0 0" }}>
                149 services across 13 categories — find the right pro for the job.
              </p>
            </div>
            <a
              href="#categories"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.ink,
                textDecoration: "underline",
                whiteSpace: "nowrap",
              }}
              className="trv-viewall"
            >
              View all
            </a>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
            className="trv-cat-grid"
          >
            {CATEGORIES.map(({ label, Icon, tint, ink }) => (
              <a
                key={label}
                href="#categories"
                className="trv-card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: C.canvas,
                  border: `1px solid ${C.hairlineSoft}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  transition: "box-shadow 160ms ease, transform 160ms ease",
                }}
              >
                {/* Photo-style plate */}
                <div
                  style={{
                    background: tint,
                    aspectRatio: "4 / 3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: C.canvas,
                      color: ink,
                      boxShadow: "rgba(0,0,0,0.05) 0 2px 6px",
                    }}
                  >
                    <Icon size={26} strokeWidth={2} />
                  </span>
                </div>
                <div style={{ padding: "14px 16px 16px" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: C.muted,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Pros available
                    <ArrowRight size={13} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section
          id="how"
          style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 0" }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.4,
              color: C.ink,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            How Trovaar works
          </h2>
          <p style={{ fontSize: 16, color: C.muted, margin: "8px 0 32px" }}>
            From photo to hired pro in three simple steps.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
            className="trv-steps"
          >
            {STEPS.map(({ n, label, copy, Icon }) => (
              <div
                key={n}
                style={{
                  background: C.surfaceSoft,
                  borderRadius: 20,
                  padding: 32,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 52,
                      height: 52,
                      borderRadius: 9999,
                      background: C.canvas,
                      color: C.primary,
                      boxShadow: "rgba(0,0,0,0.05) 0 2px 6px",
                    }}
                  >
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      color: C.hairline,
                      letterSpacing: -1,
                      lineHeight: 1,
                    }}
                  >
                    {n}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: -0.18,
                    color: C.ink,
                    margin: "24px 0 8px",
                  }}
                >
                  {label}
                </h3>
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: C.body,
                    margin: 0,
                  }}
                >
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust row ────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 0" }}>
          <div
            style={{
              border: `1px solid ${C.hairlineSoft}`,
              borderRadius: 20,
              padding: "28px 32px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
            }}
            className="trv-trust"
          >
            {TRUST.map(({ label, Icon }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 9999,
                    background: "#fff0f3",
                    color: C.primary,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonial ──────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 0" }}>
          <div
            style={{
              background: C.surfaceSoft,
              borderRadius: 20,
              padding: "56px 48px",
              maxWidth: 880,
              margin: "0 auto",
              textAlign: "center",
            }}
            className="trv-testimonial"
          >
            <div
              style={{
                display: "inline-flex",
                gap: 4,
                marginBottom: 20,
                color: C.ink,
              }}
              aria-label="5 out of 5 stars"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={20} fill={C.ink} strokeWidth={0} />
              ))}
            </div>
            <blockquote
              style={{
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.32,
                letterSpacing: -0.4,
                color: C.ink,
                margin: 0,
              }}
            >
              “Got 4 bids within an hour of posting my roof repair. Saved over
              $800.”
            </blockquote>
            <div
              style={{
                marginTop: 24,
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 9999,
                  background: C.primary,
                  color: C.onPrimary,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                JM
              </span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                  Jessica M.
                </div>
                <div style={{ fontSize: 14, color: C.muted }}>Homeowner</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section
          id="find"
          style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}
        >
          <div
            style={{
              background: C.ink,
              borderRadius: 20,
              padding: "64px 48px",
              textAlign: "center",
              color: C.onPrimary,
            }}
            className="trv-cta"
          >
            <h2
              style={{
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: -0.8,
                lineHeight: 1.12,
                margin: 0,
                color: C.onPrimary,
              }}
            >
              Stop searching, start finding.
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "#d7d7d7",
                margin: "16px auto 0",
                maxWidth: 560,
                lineHeight: 1.55,
              }}
            >
              Post a job in two minutes and let verified local pros compete for
              your business — free for consumers, no obligation.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <a
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 48,
                  padding: "0 24px",
                  borderRadius: 8,
                  background: C.primary,
                  color: C.onPrimary,
                  fontSize: 16,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Post a Job
                <ArrowRight size={18} />
              </a>
              <a
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 48,
                  padding: "0 23px",
                  borderRadius: 8,
                  background: "transparent",
                  color: C.onPrimary,
                  border: "1px solid rgba(255,255,255,0.45)",
                  fontSize: 16,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Find Work Near You
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.hairlineSoft}`, background: C.canvas }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "48px 24px 24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: 32,
            }}
            className="trv-footer-grid"
          >
            <div>
              <a
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: C.primary,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 9999,
                    background: C.primary,
                    color: C.onPrimary,
                  }}
                >
                  <MapPin size={17} strokeWidth={2.4} />
                </span>
                <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5 }}>
                  trovaar
                </span>
              </a>
              <p
                style={{
                  fontSize: 14,
                  color: C.muted,
                  margin: "16px 0 0",
                  maxWidth: 280,
                  lineHeight: 1.5,
                }}
              >
                The network that connects every skilled trade to every job. Stop
                searching, start finding.
              </p>
            </div>

            <FooterCol
              head="Support"
              links={["Help Center", "How it works", "Safety & trust", "Cancellation"]}
            />
            <FooterCol
              head="For Pros"
              links={["Find work near you", "Become a pro", "Pro resources", "Get verified"]}
            />
            <FooterCol
              head="Trovaar"
              links={["About", "Careers", "Press", "Contact"]}
            />
          </div>

          {/* Legal band */}
          <div
            style={{
              marginTop: 40,
              paddingTop: 24,
              borderTop: `1px solid ${C.hairlineSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontSize: 13,
                color: C.muted,
                flexWrap: "wrap",
              }}
            >
              <span>© 2026 Trovaar, Inc.</span>
              <a href="#" style={{ color: C.muted, textDecoration: "none" }}>
                Privacy
              </a>
              <a href="#" style={{ color: C.muted, textDecoration: "none" }}>
                Terms
              </a>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  color: C.ink,
                }}
              >
                <Globe size={15} /> English (US)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: C.ink }}>
              <a href="#" aria-label="Facebook" style={{ color: C.ink }}>
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="X" style={{ color: C.ink }}>
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="Instagram" style={{ color: C.ink }}>
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Hover float + responsive collapses (single shadow tier, column drops). */}
      <style>{`
        .trv-card:hover {
          box-shadow: ${SOFT_SHADOW};
          transform: translateY(-2px);
        }
        @media (min-width: 880px) {
          .trv-host-link { display: inline-flex !important; }
        }
        @media (max-width: 1000px) {
          .trv-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .trv-cat-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .trv-steps { grid-template-columns: 1fr !important; }
          .trv-trust { grid-template-columns: repeat(2, 1fr) !important; }
          .trv-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 744px) {
          .trv-center-nav { display: none !important; }
          .trv-h1 { font-size: 38px !important; letter-spacing: -1px !important; }
          .trv-cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .trv-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 24px 16px !important; }
          .trv-trust { grid-template-columns: 1fr !important; }
          .trv-footer-grid { grid-template-columns: 1fr !important; }
          .trv-search-where { display: none !important; }
          .trv-testimonial { padding: 40px 24px !important; }
          .trv-cta { padding: 48px 24px !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Small presentational helpers ──────────────────────────────────────── */

function HeroTile({
  Icon,
  kicker,
  title,
  meta,
  tint,
  ink,
  tall = false,
}: {
  Icon: LucideIcon;
  kicker: string;
  title: string;
  meta: string;
  tint: string;
  ink: string;
  tall?: boolean;
}) {
  return (
    <div
      style={{
        background: tint,
        borderRadius: 14,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: tall ? 320 : 0,
        height: tall ? "100%" : "100%",
        border: `1px solid ${C.hairlineSoft}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 14,
            background: C.canvas,
            color: ink,
            boxShadow: "rgba(0,0,0,0.05) 0 2px 6px",
          }}
        >
          <Icon size={22} strokeWidth={2} />
        </span>
        <span
          style={{
            background: C.canvas,
            borderRadius: 9999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: C.ink,
            boxShadow: SOFT_SHADOW,
          }}
        >
          {kicker}
        </span>
      </div>
      <div style={{ marginTop: tall ? 0 : 18 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{meta}</div>
      </div>
    </div>
  );
}

function FooterCol({ head, links }: { head: string; links: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 500, color: C.ink, marginBottom: 14 }}>
        {head}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {links.map((l) => (
          <li key={l}>
            <a
              href="#"
              style={{ fontSize: 14, color: C.body, textDecoration: "none" }}
            >
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
