/**
 * Generate a unique referral code for a user.
 * Format: first 8 hex chars of UUID (uppercased) + 2 uppercase initials from name
 * Example: "A3F92B1C" + "JO" = "A3F92B1CJO"
 */
export function generateReferralCode(userId: string, name: string): string {
  const hex = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const initials = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  return hex + initials;
}
