/**
 * Promotes a user to admin by email.
 *
 * Usage:
 *   npx ts-node scripts/make-admin.ts user@email.com
 *
 * Alternatively, run this SQL directly against the SQLite database:
 *   UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';
 *
 * The database file is located at: ./data/trovaar.db
 * (or wherever DATABASE_PATH env var points)
 */

import { getDb } from "../src/lib/db";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx ts-node scripts/make-admin.ts <email>");
  process.exit(1);
}

const db = getDb();
const result = await db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?").run(email);

if (result.changes === 0) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`${email} is now an admin.`);
console.log("They must log out and log back in for the change to take effect.");
