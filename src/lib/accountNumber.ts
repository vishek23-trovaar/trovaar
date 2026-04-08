/**
 * Account number format:  XXXXX-NNNNNNNNNN
 *   XXXXX       = 5-char base-36 prefix deterministically derived from the user's UUID
 *   -           = separator
 *   NNNNNNNNNN  = 10-digit normalized phone (US +1 stripped, always 10 digits)
 *
 * Example:  ap3bp-4048244699
 * Total display length: 16 chars (5 alnum + dash + 10 digits)
 */

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Derive a stable 5-char base-36 prefix from a UUID string. */
function derivePrefix(userId: string): string {
  const hex = userId.replace(/-/g, "").slice(0, 10); // first 10 hex chars = 40 bits
  let n = BigInt("0x" + hex);
  const b36 = BigInt(36);
  let result = "";
  for (let i = 0; i < 5; i++) {
    result = BASE36[Number(n % b36)] + result;
    n = n / b36;
  }
  return result;
}

/** Strip everything that isn't a digit, then drop leading +1 for North-American numbers. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** Generate the account number from a userId + phone string. */
export function generateAccountNumber(userId: string, phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 7) throw new Error("Phone number too short");
  const prefix = derivePrefix(userId);
  return `${prefix}-${digits}`;
}

/** Return true if the string looks like a valid account number. */
export function isAccountNumber(value: string): boolean {
  return /^[0-9a-z]{5}-\d{7,15}$/.test(value);
}
