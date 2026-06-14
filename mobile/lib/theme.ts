// Trovaar Design System — Linear language (dark)
// Matches the web app's Linear rebuild: near-black canvas, charcoal surface
// ladder, hairline borders, a single blue accent used sparingly. No gradients,
// no glassmorphism, no glows. Depth comes from hairline borders + the surface
// step, not shadow or color wash.
//
// The app ships dark-only (mirrors the web, which dropped light mode). Both the
// static `colors` export AND `darkColors` resolve to the same Linear palette so
// every screen — whether it does `import { colors }` or `useAppTheme()` —
// renders identically. There is no light palette to fall back to.

// ---------------------------------------------------------------------------
// Linear palette. Semantic keys are kept stable so existing screens keep
// working; the VALUES are re-pointed to Linear's dark ladder.
//
//   canvas      #010102  deepest — hero bands, behind everything
//   surface     #08090A  page / screen background
//   white       #121316  raised card surface (semantic "card bg", not literal)
//   surfaceDark #1A1B1F  inset well on a card (inputs, chips, code)
//   border      #23252A  hairline
//   borderStrong#34343A  hairline on hover/focus/active
// ---------------------------------------------------------------------------

export const colors = {
  primary: '#3B82F6',       // single blue accent
  primaryDark: '#2563EB',   // pressed
  primaryLight: '#60A5FA',  // hover / bright accent
  secondary: '#F7F8F8',     // headings (was near-black on light; now light)
  text: '#F7F8F8',          // primary text
  body: '#C9CDD3',          // body copy
  surface: '#08090A',       // page / screen background
  surfaceDark: '#1A1B1F',   // inset well (inputs, chips)
  border: '#23252A',        // hairline border
  borderStrong: '#34343A',  // hairline on hover/focus
  canvas: '#010102',        // deepest — hero bands
  muted: '#8A8F98',         // Linear's muted gray
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  white: '#121316',         // semantic: "card bg" (NOT literal white)
  // On-dark aliases (kept for back-compat with hero/band code).
  onDark: '#F7F8F8',
  onDarkMuted: '#8A8F98',
} as const;

// ---------------------------------------------------------------------------
// Gradients — Linear has none. These exports are kept so older call sites and
// expo-linear-gradient props don't break, but every "gradient" is now a flat
// two-stop of identical colors (renders as a solid). Prefer plain Views.
// ---------------------------------------------------------------------------

export const gradients = {
  midnight: ['#0F1011', '#0F1011'] as const,        // hero band → flat charcoal
  midnightCompact: ['#0F1011', '#0F1011'] as const,
  brand: ['#3B82F6', '#3B82F6'] as const,           // CTA → flat blue
  brandBright: ['#3B82F6', '#3B82F6'] as const,
  accentText: ['#60A5FA', '#60A5FA'] as const,
} as const;

// Surface tokens for chips/cards layered on charcoal bands. No translucency —
// Linear uses solid fills + hairline borders, not glass.
export const glass = {
  fill: '#18191B',
  fillHover: '#1F2024',
  border: '#23252A',
} as const;

// ---------------------------------------------------------------------------
// Colors — dark palette. Identical to `colors`: the app is dark-only. Kept as a
// separate export so useAppTheme() / appTheme.tsx imports keep resolving.
// ---------------------------------------------------------------------------

export type ColorPalette = { [K in keyof typeof colors]: string };

export const darkColors: ColorPalette = { ...colors };

// ---------------------------------------------------------------------------
// Status badge colors — dark-surface tints (subtle fill + bright text).
// ---------------------------------------------------------------------------

export const statusColors: Record<string, { bg: string; text: string }> = {
  posted: { bg: 'rgba(59,130,246,0.14)', text: '#93C5FD' },
  bidding: { bg: 'rgba(129,140,248,0.16)', text: '#A5B4FC' },
  accepted: { bg: 'rgba(168,85,247,0.16)', text: '#D8B4FE' },
  in_progress: { bg: 'rgba(251,191,36,0.15)', text: '#FCD34D' },
  completed: { bg: 'rgba(52,211,153,0.15)', text: '#6EE7B7' },
  cancelled: { bg: 'rgba(138,143,152,0.15)', text: '#C0C4CC' },
};

// ---------------------------------------------------------------------------
// Urgency badge colors — dark-surface tints.
// ---------------------------------------------------------------------------

export const urgencyColors: Record<string, { bg: string; text: string }> = {
  emergency: { bg: 'rgba(248,113,113,0.16)', text: '#FCA5A5' },
  high: { bg: 'rgba(251,146,60,0.16)', text: '#FDBA74' },
  medium: { bg: 'rgba(251,191,36,0.16)', text: '#FCD34D' },
  low: { bg: 'rgba(52,211,153,0.16)', text: '#6EE7B7' },
};

// ---------------------------------------------------------------------------
// Typography — tight negative tracking on display type (Linear's signature).
// ---------------------------------------------------------------------------

export const typography = {
  // Legacy scale (kept for existing screens — do not remove).
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h4: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },

  // Display scale — extrabold, sentence-case, tight negative tracking.
  displayXl: { fontSize: 44, fontWeight: '800' as const, lineHeight: 46, letterSpacing: -1.4 },
  displayLg: { fontSize: 34, fontWeight: '800' as const, lineHeight: 38, letterSpacing: -1.0 },
  displayMd: { fontSize: 28, fontWeight: '800' as const, lineHeight: 32, letterSpacing: -0.8 },
  headline: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.5 },
  title: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.3 },
  bodyLg: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.6 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 2,
  sm: 4,
  smd: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
} as const;

// ---------------------------------------------------------------------------
// Border radius — Linear leans tighter than the old pill-heavy scale.
// ---------------------------------------------------------------------------

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

// ---------------------------------------------------------------------------
// Shadows — Linear barely uses them; depth comes from hairline borders + the
// surface step. Kept minimal and near-black so they don't wash out on canvas.
// ---------------------------------------------------------------------------

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, string> = {
  Plumbing: '\u{1F527}',
  Electrical: '⚡',
  HVAC: '❄️',
  Roofing: '\u{1F3E0}',
  Painting: '\u{1F3A8}',
  Landscaping: '\u{1F33F}',
  Cleaning: '\u{1F9F9}',
  Moving: '\u{1F4E6}',
  'Auto Repair': '\u{1F697}',
  Handyman: '\u{1F528}',
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const defaultBadge = { bg: colors.surfaceDark, text: colors.muted };

export function getStatusColor(status: string): { bg: string; text: string } {
  return statusColors[status] ?? defaultBadge;
}

export function getUrgencyColor(urgency: string): { bg: string; text: string } {
  return urgencyColors[urgency] ?? defaultBadge;
}

export function getCategoryIcon(category: string): string {
  return categoryIcons[category] ?? '\u{1F529}';
}
