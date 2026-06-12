/**
 * QA Walkthrough — seed 50 consumers + 50 contractors.
 *
 * All users are tagged with email prefix `qa_wt_` and name suffix `[QA-WT]`
 * so they can be removed in one command (see qa-walkthrough-cleanup.ts).
 *
 * Seeds DIRECTLY into the DB (not via the signup API) to avoid the 5/hr
 * signup rate limit and to skip the Resend verification email send.
 *
 * Run: npx tsx scripts/qa-walkthrough-seed.ts
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
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
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

const PASSWORD = "Test123!";
const TAG = "[QA-WT]";
const PREFIX = "qa_wt_";

// Portfolio photos so contractors clear the ">= 3 photos to bid" gate.
const PORTFOLIO = JSON.stringify([
  "https://placehold.co/600x400?text=Work+1",
  "https://placehold.co/600x400?text=Work+2",
  "https://placehold.co/600x400?text=Work+3",
]);

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping",
  "carpentry", "flooring", "auto_repair", "appliance_repair", "handyman", "cleaning",
];

const CITIES = [
  "Miami, FL 33101", "Orlando, FL 32801", "Tampa, FL 33602", "Atlanta, GA 30303",
  "Charlotte, NC 28202", "Nashville, TN 37203", "Austin, TX 78701", "Dallas, TX 75201",
];

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  // Unique phone space for QA users: 9xx-prefixed, very unlikely to collide.
  let phoneSeq = 9_000_000_000;

  const consumers: string[] = [];
  const contractors: string[] = [];

  console.log("Seeding 50 consumers...");
  for (let i = 1; i <= 50; i++) {
    const uid = uuidv4();
    const email = `${PREFIX}consumer_${i}@trovaar-qa.test`;
    const phone = String(phoneSeq++);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, referral_code, account_number, token_version)
       VALUES ($1,$2,$3,$4,'consumer',$5,$6,1,$7,$8,0)
       ON CONFLICT (email) DO NOTHING`,
      [uid, email, hash, `QA Consumer ${i} ${TAG}`, phone, pick(CITIES), `QAWTC${i}${uid.slice(0, 4)}`, `QAWT${100000 + i}`]
    );
    consumers.push(email);
  }

  console.log("Seeding 50 contractors (with portfolios so they can bid)...");
  for (let i = 1; i <= 50; i++) {
    const uid = uuidv4();
    const email = `${PREFIX}contractor_${i}@trovaar-qa.test`;
    const phone = String(phoneSeq++);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, referral_code, account_number, token_version)
       VALUES ($1,$2,$3,$4,'contractor',$5,$6,1,$7,$8,0)
       ON CONFLICT (email) DO NOTHING`,
      [uid, email, hash, `QA Contractor ${i} ${TAG}`, phone, pick(CITIES), `QAWTK${i}${uid.slice(0, 4)}`, `QAWT${200000 + i}`]
    );
    // Real row id (in case of conflict the insert was skipped — fetch the id)
    const row = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0];
    const realId = row?.id ?? uid;

    const cats = JSON.stringify([pick(CATEGORIES), pick(CATEGORIES)]);
    await pool.query(
      `INSERT INTO contractor_profiles
         (user_id, bio, years_experience, categories, portfolio_photos, rating, rating_count,
          verification_status, contractor_type, background_check_status, service_radius_miles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'approved','independent','clear',50)
       ON CONFLICT (user_id) DO UPDATE SET portfolio_photos = EXCLUDED.portfolio_photos, categories = EXCLUDED.categories`,
      [realId, `QA test contractor ${i}. ${TAG}`, 5 + (i % 15), cats, PORTFOLIO, 4 + Math.random(), 5 + (i % 30)]
    );
    contractors.push(email);
  }

  const total = (await pool.query("SELECT COUNT(*) FROM users WHERE email LIKE $1", [`${PREFIX}%`])).rows[0].count;
  console.log(`\nDone. ${consumers.length} consumers + ${contractors.length} contractors seeded.`);
  console.log(`Total qa_wt_ users in DB: ${total}`);
  console.log(`Password for all: ${PASSWORD}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
