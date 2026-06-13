---
version: 1.0
name: Trovaar-design-system
description: >
  Trovaar is "Uber for skilled trades" — a marketplace where homeowners and
  businesses post jobs and verified local pros compete in real time. The design
  language is a premium-marketplace duet: a confident blue brand (#2563EB) over
  a deep midnight-gradient canvas (#0a0f1e → #1e1b4b), with glassmorphism cards,
  pill-shaped interactive elements, and extrabold, tightly-tracked display type.
  It marries Uber's marketplace structure (pills everywhere, polarity-flip dark
  bands as depth, sentence-case weight-700 display) with Linear's premium-dark
  restraint (a single chromatic accent used intentionally, negative tracking,
  charcoal/glass panels). One canonical doc for BOTH web (Next.js/Tailwind) and
  mobile (Expo/React Native) so the two surfaces feel identical.

colors:
  # Brand — the single chromatic accent. Used on primary CTAs, links, focus,
  # active states, and gradient accents. Never decoratively on dark bands.
  primary: "#2563EB"
  primary-dark: "#1D4ED8"
  primary-light: "#3B82F6"
  on-primary: "#FFFFFF"

  # Gradient accent stack — blue → indigo → violet. Used for gradient text and
  # the signature hero headline highlight.
  accent-from: "#60A5FA"
  accent-via: "#818CF8"
  accent-to: "#A78BFA"

  # Midnight canvas — the dark-band / hero gradient. The polarity-flip surface
  # that carries the brand's premium weight (mirrors Uber's black promo bands,
  # rendered as a Trovaar gradient instead of flat black).
  midnight-1: "#0A0F1E"
  midnight-2: "#0F172A"
  midnight-3: "#1E1B4B"

  # Light surfaces
  canvas: "#FFFFFF"
  surface: "#F8FAFC"
  surface-2: "#F1F5F9"
  border: "#E2E8F0"

  # Text
  ink: "#0F172A"        # headings + body on light
  body: "#475569"       # secondary text on light
  muted: "#64748B"      # captions / metadata
  on-dark: "#F8FAFC"    # text on midnight surfaces
  on-dark-muted: "#94A3B8"

  # Glass — translucent fills layered over midnight (glassmorphism cards).
  glass-fill: "rgba(255,255,255,0.07)"
  glass-fill-hover: "rgba(255,255,255,0.12)"
  glass-border: "rgba(255,255,255,0.12)"

  # Semantic
  success: "#10B981"
  danger: "#EF4444"
  warning: "#F59E0B"

typography:
  # Display — extrabold (800), sentence-case, TIGHT negative tracking. This is
  # the brand's loudest voice. Web uses font-extrabold tracking-tight; RN uses
  # fontWeight 800 + negative letterSpacing.
  display-xl:  { fontSize: 44, fontWeight: "800", lineHeight: 46, letterSpacing: -1.0 }
  display-lg:  { fontSize: 34, fontWeight: "800", lineHeight: 38, letterSpacing: -0.8 }
  display-md:  { fontSize: 28, fontWeight: "800", lineHeight: 32, letterSpacing: -0.6 }
  headline:    { fontSize: 22, fontWeight: "700", lineHeight: 28, letterSpacing: -0.4 }
  title:       { fontSize: 18, fontWeight: "700", lineHeight: 24, letterSpacing: -0.2 }
  body-lg:     { fontSize: 17, fontWeight: "400", lineHeight: 26 }
  body:        { fontSize: 15, fontWeight: "400", lineHeight: 22 }
  body-strong: { fontSize: 15, fontWeight: "600", lineHeight: 22 }
  caption:     { fontSize: 13, fontWeight: "500", lineHeight: 18 }
  tiny:        { fontSize: 11, fontWeight: "600", lineHeight: 14, letterSpacing: 0.3 }  # uppercase eyebrow
  button:      { fontSize: 15, fontWeight: "700", lineHeight: 20 }

rounded:
  sm: 8
  md: 12
  lg: 16        # canonical card radius
  xl: 20
  "2xl": 24
  "3xl": 28
  pill: 999     # signature interactive shape — every button, chip, badge

spacing:   # 4px base
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 20
  "2xl": 24
  "3xl": 32
  "4xl": 48

elevation:
  flat:   { shadowOpacity: 0, elevation: 0 }            # default
  sm:     { shadowColor: "#0F172A", shadowOffset: [0,1], shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }
  md:     { shadowColor: "#0F172A", shadowOffset: [0,4], shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }
  lg:     { shadowColor: "#0F172A", shadowOffset: [0,8], shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 }
  brand:  { shadowColor: "#2563EB", shadowOffset: [0,8], shadowOpacity: 0.30, shadowRadius: 18, elevation: 8 }  # blue glow under primary CTA

components:
  button-primary:   { background: "{colors.primary}", text: "{colors.on-primary}", rounded: "{rounded.pill}", shadow: brand, typography: button }
  button-gradient:  { background: "linear(midnight via primary)", text: "{colors.on-primary}", rounded: "{rounded.pill}", shadow: brand }
  button-outline:   { background: transparent, border: "{colors.primary}", text: "{colors.primary}", rounded: "{rounded.pill}" }
  button-white:     { background: "{colors.canvas}", text: "{colors.primary}", rounded: "{rounded.pill}", shadow: md }   # on midnight
  button-glass:     { background: "{colors.glass-fill}", border: "{colors.glass-border}", text: "{colors.on-dark}", rounded: "{rounded.pill}" }   # on midnight
  card:             { background: "{colors.canvas}", border: "{colors.border}", rounded: "{rounded.lg}", shadow: md, padding: "{spacing.lg}" }
  card-glass:       { background: "{colors.glass-fill}", border: "{colors.glass-border}", rounded: "{rounded.xl}", padding: "{spacing.lg}" }   # on midnight
  hero-band:        { background: "linear(midnight-1 → midnight-2 → midnight-3)", text: "{colors.on-dark}", padding: "{spacing.4xl} {spacing.2xl}" }
  category-pill:    { background: "{colors.surface-2}", text: "{colors.body}", rounded: "{rounded.pill}", padding: "{spacing.sm} {spacing.md}" }
  badge:            { rounded: "{rounded.pill}", typography: tiny }
  input:            { background: "{colors.surface}", border: "{colors.border}", rounded: "{rounded.md}", text: "{colors.ink}", padding: "{spacing.lg}" }
  live-dot:         { description: "pulsing green dot + 'Live marketplace — pros bidding now' eyebrow on hero bands" }

---

## Overview

Trovaar's surface is a **premium-marketplace duet**: a confident blue brand riding
over a deep **midnight gradient**. Where Uber is a black-and-white duet, Trovaar
swaps Uber's flat-black promo bands for a **blue-tinted midnight gradient**
(`#0a0f1e → #0f172a → #1e1b4b`) and keeps Uber's structural discipline — the
**pill** is the single interactive shape, cards round to **16px**, and headlines
are **sentence-case weight-800** with tight negative tracking.

The brand's one chromatic accent is **Trovaar Blue `#2563EB`** (Linear's "single
accent, used intentionally" rule). On light surfaces it's the CTA and link color;
on midnight surfaces it becomes a **gradient highlight** (`#60a5fa → #818cf8 →
#a78bfa`) on the key word of a headline ("every skilled trade").

**Key characteristics**
- **Midnight gradient hero bands** carry every brand moment — auth screens,
  dashboard headers, CTAs. They are the polarity-flip depth cue (Uber's black
  bands, reimagined as a Trovaar gradient).
- **Glassmorphism cards** (`rgba(255,255,255,0.07)` fill + `0.12` border) float
  on midnight; flat white cards with hairline borders sit on light surfaces.
- **Pills everywhere** — primary CTA, outline CTA, category chips, status/urgency
  badges all round to 999px.
- **Live eyebrow** — a pulsing green dot beside "Live marketplace — pros bidding
  now" signals the real-time competition that is Trovaar's whole pitch.
- **Tagline**: *"Stop searching, start finding."* Hero headline pattern: *"The
  network that connects [every skilled trade] to every job."* with the bracketed
  phrase in gradient text.

## Colors

### Brand & Accent
- **Trovaar Blue** (`{colors.primary}` `#2563EB`): the only chromatic accent.
  Primary CTAs, links, active tabs, focus rings, gradient accents. One primary
  blue CTA per visible viewport is the conversion story.
- **Gradient accent** (`accent-from → accent-via → accent-to`): blue→indigo→violet,
  used ONLY for gradient text on the hero headline highlight. Never as a fill.

### Midnight (dark bands)
- `midnight-1 #0A0F1E` → `midnight-2 #0F172A` → `midnight-3 #1E1B4B`: the hero/CTA
  gradient, top-left to bottom-right (135deg). This is the premium surface.

### Light Surfaces
- `canvas #FFFFFF` default cards; `surface #F8FAFC` page background; `surface-2
  #F1F5F9` category pills & nested fills; `border #E2E8F0` hairlines.

### Text
- `ink #0F172A` headings/body on light; `body #475569` secondary; `muted #64748B`
  captions. On midnight: `on-dark #F8FAFC`, `on-dark-muted #94A3B8`.

## Typography

Display type is **extrabold (800), sentence-case, tightly tracked** (negative
letter-spacing). It is the brand's loudest voice and never carries body copy.
Body type is regular/medium with comfortable line-height. Eyebrows (`tiny`) are
the rare uppercase, letter-spaced exception.

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | 44 | 800 | -1.0 | Hero headline (auth, landing). |
| `display-lg` | 34 | 800 | -0.8 | Screen titles, big section heads. |
| `display-md` | 28 | 800 | -0.6 | Card-group headers ("Every trade. Every job."). |
| `headline` | 22 | 700 | -0.4 | Section headers. |
| `title` | 18 | 700 | -0.2 | Card titles, list headers. |
| `body` / `body-strong` | 15 | 400/600 | — | Paragraphs & emphasis. |
| `caption` | 13 | 500 | — | Metadata, helper text. |
| `tiny` | 11 | 600 | +0.3 | Uppercase eyebrow ("LIVE MARKETPLACE"). |
| `button` | 15 | 700 | — | Button labels. |

Font: system sans (SF Pro on iOS, Roboto on Android) — geometric, neutral. Web
uses Geist. No italics on display; never letter-space positive except eyebrows.

## Shapes
- **Pill `999`** — every interactive element: buttons, category chips, badges,
  tab pills, the live-dot eyebrow chip.
- **Card `16` (lg)** — canonical card radius. Glass cards on midnight go `20` (xl)
  for a softer premium feel. Hero illustration cards `24` (2xl).
- **Inputs `12` (md)**.

## Elevation & Depth
- **Flat is default** on light surfaces — lean on hairline borders + `surface`
  contrast (Uber's Level-0 discipline).
- **Brand glow** — the primary blue CTA carries a blue shadow (`elevation.brand`)
  — a soft `#2563EB` glow, the one signature shadow.
- **Midnight bands ARE the depth** — the polarity flip from light page to dark
  gradient band is the primary depth cue, not drop shadows.
- **Glass cards** read as floating on midnight via their translucent fill +
  hairline border, no heavy shadow needed.

## Signature Components
- **`hero-band`** — 135° midnight gradient, generous padding, the live eyebrow +
  display-xl headline (with gradient-text highlight) + primary/outline CTA pair.
  Used on auth screens and as the dashboard header band.
- **`card-glass`** — translucent card on midnight: `glass-fill` + `glass-border`,
  20px radius. Used for the two-sided "For Homeowners / For Contractors" cards and
  any card layered on a midnight band.
- **`category-pill`** — `surface-2` fill, pill shape, icon + label; horizontal
  scroll rows. Active state flips to `primary` fill + white text.
- **`live-dot`** — pulsing green dot in a glass chip with the "Live marketplace"
  eyebrow. The brand's real-time signal.

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` blue for primary CTAs, links, and active states.
- Render every interactive element as a `{rounded.pill}`; cards at `{rounded.lg}` 16.
- Use the midnight gradient for brand moments (auth, headers, CTAs) — it's the
  polarity-flip depth cue.
- Set headlines in `display-*` weight 800, sentence-case, with negative tracking.
- Float glass cards on midnight; use flat hairline-bordered cards on light.
- Put the live-dot eyebrow on hero bands — real-time competition is the pitch.

### Don't
- Don't introduce a second accent color. Blue + midnight + grayscale only.
- Don't use flat pure-black bands — Trovaar's dark surface is always the blue
  midnight gradient, never `#000`.
- Don't use all-caps display headlines (eyebrows excepted).
- Don't drop heavy shadows on every card — flat-on-light and glass-on-midnight
  are the defaults; the only signature shadow is the blue CTA glow.
- Don't letter-space the display face positive; tracking is tight/negative.
- Don't render the gradient accent as a fill — it's for hero headline text only.
