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
  surface: '#F8FAFC',
  surfaceDark: '#F1F5F9',
  border: '#E2E8F0',
  muted: '#64748B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
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
  surface: '#0F172A',
  surfaceDark: '#1E293B',
  border: '#334155',
  muted: '#94A3B8',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  white: '#0F172A', // intentional: 'white' semantically means "card bg" in RN styles here
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
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '700' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
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
