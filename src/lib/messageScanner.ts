/**
 * Off-platform contact detection
 * Scans message content for phone numbers, emails, payment apps,
 * and social handles that could be used to take transactions off-platform.
 */

export interface ScanResult {
  flagged: boolean;
  reasons: string[];
}

// Phone: US formats — (555) 123-4567 / 555-123-4567 / 5551234567 / +1 555 123 4567
const PHONE_RE =
  /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

// Email addresses
const EMAIL_RE =
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Off-platform payment keywords (case-insensitive)
const PAYMENT_KEYWORDS = [
  "venmo", "cash app", "cashapp", "zelle", "paypal", "pay pal",
  "apple pay", "applepay", "google pay", "googlepay", "chime",
  "western union", "money order", "wire transfer", "bitcoin", "crypto",
];

// Social / messaging platform handles
const SOCIAL_KEYWORDS = [
  "whatsapp", "telegram", "snapchat", "instagram", "facebook",
  "messenger", "signal", "dm me", "dm's", "slide into",
  "my snap", "my insta", "my fb", "@gmail", "@yahoo", "@hotmail",
  "@icloud", "@outlook",
];

// Phrases that suggest moving off-platform
const REDIRECT_PHRASES = [
  "text me", "call me", "reach me at", "contact me at", "my number is",
  "my cell", "my phone", "my email is", "email me at",
  "off the app", "off app", "outside the app", "outside this app",
  "off platform", "off-platform", "cash only", "pay me cash",
  "pay in cash", "skip the fee", "avoid the fee", "no fee",
  "direct payment", "pay directly", "pay me direct",
  "my handle", "find me on", "look me up",
];

export function scanMessage(content: string): ScanResult {
  const lower = content.toLowerCase();
  const reasons: string[] = [];

  // Phone number
  if (PHONE_RE.test(content)) {
    reasons.push("phone number");
  }
  PHONE_RE.lastIndex = 0; // reset stateful regex

  // Email
  if (EMAIL_RE.test(content)) {
    reasons.push("email address");
  }
  EMAIL_RE.lastIndex = 0;

  // Payment platforms
  for (const kw of PAYMENT_KEYWORDS) {
    if (lower.includes(kw)) {
      reasons.push(`payment app (${kw})`);
      break; // one reason is enough per category
    }
  }

  // Social handles
  for (const kw of SOCIAL_KEYWORDS) {
    if (lower.includes(kw)) {
      reasons.push(`social handle / external messaging`);
      break;
    }
  }

  // Off-platform redirect phrases
  for (const phrase of REDIRECT_PHRASES) {
    if (lower.includes(phrase)) {
      reasons.push(`off-platform language ("${phrase}")`);
      break;
    }
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}

// ─── Redaction patterns ──────────────────────────────────────────────────────

const REDACT_PATTERNS: RegExp[] = [
  // Phone numbers (many formats)
  /(\+?1?\s?)?(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/g,
  // Email addresses
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  // "call me", "text me", "reach me", "my number is", etc.
  /\b(call me|text me|reach me|my number|my email|my phone|DM me|message me on|find me on|hit me up)\b/gi,
  // Social handles (@username)
  /@[a-zA-Z0-9_]{2,}/g,
  // Venmo/Cash App/Zelle/PayPal/Apple Pay mentions
  /\b(venmo|cashapp|cash app|zelle|paypal|apple pay)\b/gi,
];

export interface RedactResult {
  redacted: string;
  wasRedacted: boolean;
}

/**
 * Silently replaces detected contact info patterns with [contact info removed].
 * Returns both the cleaned text and a flag indicating whether any redaction occurred.
 */
export function redactContactInfo(text: string): RedactResult {
  let result = text;
  let wasRedacted = false;
  for (const pattern of REDACT_PATTERNS) {
    // Reset stateful regex before each use
    pattern.lastIndex = 0;
    const cleaned = result.replace(pattern, "[contact info removed]");
    if (cleaned !== result) wasRedacted = true;
    result = cleaned;
    pattern.lastIndex = 0;
  }
  return { redacted: result, wasRedacted };
}

// ─────────────────────────────────────────────────────────────────────────────

/** Lightweight version for client-side real-time preview (no regex flags to worry about) */
export function clientScanMessage(content: string): string[] {
  const lower = content.toLowerCase();
  const warnings: string[] = [];

  // Simple phone check: 10 consecutive digits (with optional separators)
  if (/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/.test(content)) {
    warnings.push("phone number");
  }

  if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(content)) {
    warnings.push("email address");
  }

  for (const kw of PAYMENT_KEYWORDS) {
    if (lower.includes(kw)) { warnings.push(`payment app mention`); break; }
  }
  for (const kw of SOCIAL_KEYWORDS) {
    if (lower.includes(kw)) { warnings.push(`external contact info`); break; }
  }
  for (const phrase of REDIRECT_PHRASES) {
    if (lower.includes(phrase)) { warnings.push(`off-platform language`); break; }
  }

  return warnings;
}
