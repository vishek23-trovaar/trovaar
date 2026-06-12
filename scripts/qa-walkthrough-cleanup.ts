/**
 * QA Walkthrough — remove all seeded test users and their data.
 *
 * Deletes every user with email prefix `qa_wt_`. Foreign keys are
 * ON DELETE CASCADE, so their jobs, bids, messages, notifications,
 * contractor_profiles, etc. are removed along with them.
 *
 * Run: npx tsx scripts/qa-walkthrough-cleanup.ts
 */

import { Pool } from "pg";
import path from "path";
import fs from "fs";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const ids = (await pool.query("SELECT id FROM users WHERE email LIKE 'qa_wt_%'")).rows.map((r) => r.id);
  if (ids.length === 0) { console.log("No qa_wt_ users found. Nothing to clean."); await pool.end(); return; }

  console.log(`Found ${ids.length} qa_wt_ users. Deleting (cascade removes their jobs/bids/etc.)...`);

  // Belt-and-braces: clear tables that may not have a cascading FK to users
  // before deleting the users themselves.
  await pool.query("DELETE FROM analytics_events WHERE user_id = ANY($1)", [ids]);
  await pool.query("DELETE FROM job_templates WHERE consumer_id = ANY($1)", [ids]);
  await pool.query("DELETE FROM contractor_stats WHERE contractor_id = ANY($1)", [ids]);
  await pool.query("DELETE FROM completion_bonds WHERE contractor_id = ANY($1)", [ids]);

  const del = await pool.query("DELETE FROM users WHERE email LIKE 'qa_wt_%'");
  console.log(`Deleted ${del.rowCount} users and their cascaded data.`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
