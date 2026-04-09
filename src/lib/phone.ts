/**
 * Phone number utilities
 *
 * We store phone numbers in E.164-ish format: digits only, optionally with a
 * leading "+".  No spaces, dashes, or parentheses are persisted.
 *
 * Examples:
 *   "(555) 867-5309"  → "5558675309"
 *   "+1 (555) 867-5309" → "+15558675309"
 *   "555-867-5309"    → "5558675309"
 */

/**
 * Strip all non-digit characters except a leading "+".
 * Returns null if the result has fewer than 7 digits (clearly invalid).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Preserve leading "+" for international numbers, strip everything else
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7) return null;
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Validates that a phone string (after normalization) looks like a real number.
 * Returns the normalized form, or throws with a user-facing error message.
 */
export function parsePhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized) {
    throw new Error("Please enter a valid phone number (at least 7 digits).");
  }
  return normalized;
}
