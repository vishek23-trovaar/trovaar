// Trovaar Design System
// Shared theme constants matching the web application

// ---------------------------------------------------------------------------
// Colors — light (default, exported as `colors` for backward compatibility)
// ---------------------------------------------------------------------------

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#0F172A',
  text: '#0F172A',
  body: '#475569',
  surface: '#F8FAFC',
  surfaceDark: '#F1F5F9',
  border: '#E2E8F0',
  muted: '#64748B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  // On-midnight text (for hero/dark bands — see DESIGN.md)
  onDark: '#F8FAFC',
  onDarkMuted: '#94A3B8',
} as const;

// ---------------------------------------------------------------------------
// Gradients — the brand's premium surfaces (see DESIGN.md). Arrays are ready
// to pass straight to expo-linear-gradient's `colors` prop. Default direction
// is 135° (top-left → bottom-right): start={{x:0,y:0}} end={{x:1,y:1}}.
// ---------------------------------------------------------------------------

export const gradients = {
  // Midnight hero / dark band — the polarity-flip depth surface.
  midnight: ['#0A0F1E', '#0F172A', '#1E1B4B'] as const,
  // Tighter midnight for compact headers.
  midnightCompact: ['#0A0F1E', '#1E1B4B'] as const,
  // Blue brand CTA gradient.
  brand: ['#2563EB', '#4338CA'] as const,
  // Quote-buster / accent CTA band.
  brandBright: ['#1D4ED8', '#2563EB', '#3B82F6'] as const,
  // Hero headline gradient-text stops (blue → indigo → violet).
  accentText: ['#60A5FA', '#818CF8', '#A78BFA'] as const,
} as const;

// Glassmorphism tokens for cards/buttons layered on midnight surfaces.
export const glass = {
  fill: 'rgba(255,255,255,0.07)',
  fillHover: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.12)',
} as const;

// ---------------------------------------------------------------------------
// Colors — dark palette. Keep keys identical to `colors` so either palette
// can be swapped in via the useAppTheme() hook without branching at use sites.
// ---------------------------------------------------------------------------

// Deliberately typed as Record<K, string> (not `as const`) so TypeScript
// treats dark and light palettes as structurally compatible when swapped
// through a single union type.
export type ColorPalette = { [K in keyof typeof colors]: string };

export const darkColors: ColorPalette = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  secondary: '#F8FAFC',
  text: '#F8FAFC',
  body: '#CBD5E1',
  surface: '#0F172A',
  surfaceDark: '#1E293B',
  border: '#334155',
  muted: '#94A3B8',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  white: '#0F172A', // intentional: 'white' semantically means "card bg" in RN styles here
  onDark: '#F8FAFC',
  onDarkMuted: '#94A3B8',
};

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

export const statusColors: Record<string, { bg: string; text: string }> = {
  posted: { bg: '#DBEAFE', text: '#1D4ED8' },
  bidding: { bg: '#E0E7FF', text: '#4338CA' },
  accepted: { bg: '#F3E8FF', text: '#7C3AED' },
  in_progress: { bg: '#FEF3C7', text: '#D97706' },
  completed: { bg: '#D1FAE5', text: '#059669' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

// ---------------------------------------------------------------------------
// Urgency badge colors
// ---------------------------------------------------------------------------

export const urgencyColors: Record<string, { bg: string; text: string }> = {
  emergency: { bg: '#FEE2E2', text: '#B91C1C' },
  high: { bg: '#FFEDD5', text: '#C2410C' },
  medium: { bg: '#FEF9C3', text: '#A16207' },
  low: { bg: '#D1FAE5', text: '#15803D' },
};

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  // Legacy scale (kept for existing screens — do not remove).
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '700' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },

  // Display scale (DESIGN.md) — extrabold, sentence-case, tight negative
  // tracking. Use these for brand moments / new screens.
  displayXl: { fontSize: 44, fontWeight: '800' as const, lineHeight: 46, letterSpacing: -1.0 },
  displayLg: { fontSize: 34, fontWeight: '800' as const, lineHeight: 38, letterSpacing: -0.8 },
  displayMd: { fontSize: 28, fontWeight: '800' as const, lineHeight: 32, letterSpacing: -0.6 },
  headline: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.4 },
  title: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.2 },
  bodyLg: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.6 },
  button: { fontSize: 15, fontWeight: '700' as const, lineHeight: 20 },
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
// Border radius
// ---------------------------------------------------------------------------

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
} as const;

// ---------------------------------------------------------------------------
// Shadows (React Native format)
// ---------------------------------------------------------------------------

export const shadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, string> = {
  Plumbing: '\u{1F527}',
  Electrical: '\u26A1',
  HVAC: '\u2744\uFE0F',
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
