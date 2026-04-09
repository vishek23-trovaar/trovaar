import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Load .env.local so DATABASE_PATH is available when running via tsx
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), "./data/trovaar.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Delete existing DB to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Full schema matching the runtime migrations in db.ts
await `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('consumer', 'contractor')),
    phone TEXT,
    location TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    oauth_provider TEXT,
    latitude REAL,
    longitude REAL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    credit_balance_cents INTEGER NOT NULL DEFAULT 0,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    phone_verify_code TEXT,
    phone_verify_expires TEXT,
    is_senior_account INTEGER DEFAULT 0,
    family_overseer_email TEXT,
    family_oversight_enabled INTEGER DEFAULT 0,
    phone_number TEXT,
    sms_alerts_enabled INTEGER DEFAULT 0,
    account_number TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contractor_profiles (
    user_id TEXT PRIMARY KEY,
    bio TEXT,
    years_experience INTEGER DEFAULT 0,
    categories TEXT NOT NULL DEFAULT '[]',
    profile_photo TEXT,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'none',
    insurance_status TEXT NOT NULL DEFAULT 'none',
    business_established INTEGER,
    portfolio_photos TEXT NOT NULL DEFAULT '[]',
    contractor_type TEXT NOT NULL DEFAULT 'independent',
    qualifications TEXT NOT NULL DEFAULT '[]',
    stripe_account_id TEXT,
    stripe_onboarding_complete INTEGER NOT NULL DEFAULT 0,
    background_check_status TEXT NOT NULL DEFAULT 'none',
    license_number TEXT,
    license_state TEXT,
    id_document_url TEXT,
    id_verified INTEGER NOT NULL DEFAULT 0,
    service_zip_codes TEXT,
    service_radius_miles INTEGER NOT NULL DEFAULT 25,
    cancellation_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    acceptance_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    strike_count INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    suspended_until TEXT,
    headline TEXT,
    about_me TEXT,
    insurance_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    consumer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    photos TEXT NOT NULL DEFAULT '[]',
    location TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK(urgency IN ('low', 'medium', 'high', 'emergency')),
    status TEXT NOT NULL DEFAULT 'posted'
      CHECK(status IN ('posted','bidding','accepted','en_route','arrived','in_progress','completed','cancelled')),
    latitude REAL,
    longitude REAL,
    emergency_fee INTEGER NOT NULL DEFAULT 0,
    expected_completion_date TEXT,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_intent_id TEXT,
    platform_fee_cents INTEGER,
    expires_at TEXT,
    ai_questions TEXT,
    contractor_confirmed INTEGER NOT NULL DEFAULT 0,
    consumer_confirmed INTEGER NOT NULL DEFAULT 0,
    terms_accepted_at TEXT,
    reference_links TEXT,
    inspiration_photos TEXT,
    completed_at TEXT,
    certificate_generated INTEGER NOT NULL DEFAULT 0,
    first_bid_at TEXT,
    accepted_bid_at TEXT,
    before_photo_url TEXT,
    after_photo_url TEXT,
    budget_range TEXT,
    scheduled_arrival_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    contractor_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    timeline_days INTEGER NOT NULL,
    availability_date TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    labor_cents INTEGER,
    materials_json TEXT,
    parts_summary TEXT,
    equipment_json TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    contractor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    issuer TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    document_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS work_history (
    id TEXT PRIMARY KEY,
    contractor_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    role TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS oauth_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'facebook')),
    provider_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    contractor_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    photos TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(job_id, reviewer_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    job_id TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_consumer ON jobs(consumer_id);
  CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id);
  CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids(contractor_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);
  CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_codes(user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_contractor ON reviews(contractor_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);

// Password: "password123" for all demo users — all seed users are pre-verified
const hash = bcrypt.hashSync("password123", 12);

function makeReferralCode(id: string, name: string): string {
  const hex = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const initials = name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase().padEnd(2, "X");
  return hex + initials;
}

// === CONSUMERS ===
const consumer1Id = uuidv4();
const consumer2Id = uuidv4();

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(consumer1Id, "sarah@demo.com", hash, "Sarah Johnson", "consumer", "555-0101", "Austin, TX", 1, 30.2672, -97.7431, makeReferralCode(consumer1Id, "Sarah Johnson"), 0);

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(consumer2Id, "mike@demo.com", hash, "Mike Chen", "consumer", "555-0102", "Dallas, TX", 1, 32.7767, -96.7970, makeReferralCode(consumer2Id, "Mike Chen"), 5000);

// === CONTRACTORS ===
// Austin TX: 30.2672, -97.7431
// Dallas TX: 32.7767, -96.7970
const contractor1Id = uuidv4();
const contractor2Id = uuidv4();
const contractor3Id = uuidv4();

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(contractor1Id, "carlos@demo.com", hash, "Carlos Rivera", "contractor", "555-0201", "Austin, TX", 1, 30.2672, -97.7431, makeReferralCode(contractor1Id, "Carlos Rivera"), 3000);

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(contractor2Id, "jenny@demo.com", hash, "Jenny Park", "contractor", "555-0202", "Austin, TX", 1, 30.2500, -97.7500, makeReferralCode(contractor2Id, "Jenny Park"), 0);

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(contractor3Id, "dave@demo.com", hash, "Dave Wilson", "contractor", "555-0203", "Dallas, TX", 1, 32.7767, -96.7970, makeReferralCode(contractor3Id, "Dave Wilson"), 0);

// Contractor profiles
db.prepare(
  "INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count, verification_status, insurance_status, business_established, contractor_type, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(
  contractor1Id,
  "15 years as a certified mechanic. Former Honda dealership tech. I know these cars inside and out, and I charge fair prices.",
  15,
  '["auto_repair","handyman"]',
  4.8, 23,
  "approved",
  "approved",
  2009,
  "certified",
  JSON.stringify([
    { type: "certification", name: "ASE Master Technician", issuer: "ASE", number: "MT-48291" },
    { type: "certification", name: "EPA 609 Certified", issuer: "EPA" },
  ])
);

db.prepare(
  "INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count, verification_status, insurance_status, business_established, contractor_type, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(
  contractor2Id,
  "Licensed master electrician and plumber. Fast, reliable, and always honest about what needs fixing.",
  8,
  '["electrical","plumbing"]',
  4.9, 15,
  "approved",
  "none",
  2016,
  "master",
  JSON.stringify([
    { type: "license", name: "Master Electrician License", issuer: "Texas TDLR", number: "ELEC-19283" },
    { type: "license", name: "Master Plumber License", issuer: "Texas State Board", number: "PLM-77492" },
    { type: "bonded", name: "Surety Bond — $50,000", issuer: "Texas Bonding Co." },
  ])
);

db.prepare(
  "INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count, verification_status, insurance_status, business_established, contractor_type, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(
  contractor3Id,
  "Jack of all trades, master of most! Handyman work, basic plumbing, and auto maintenance. Affordable rates.",
  5,
  '["handyman","plumbing","auto_repair"]',
  4.5, 9,
  "none",
  "none",
  null,
  "independent",
  JSON.stringify([])
);

// === UNIQUE PHOTOS PER JOB ===
// Each job gets its own distinct set of Unsplash images — no repeats.
// A handful of jobs include a sample video as the first media item.

const J: Record<string, string[]> = {
  // Job 1 — Honda Civic brake pads (auto repair) — includes video
  j1: [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80",
    "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800&q=80",
  ],
  // Job 2 — Kitchen faucet leak (plumbing)
  j2: [
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    "https://images.unsplash.com/photo-1585771723403-88b9c6ebb4f6?w=800&q=80",
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
  ],
  // Job 3 — Electrical panel upgrade
  j3: [
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
    "https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
  ],
  // Job 4 — Fence repair (fencing) — includes video
  j4: [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://images.unsplash.com/photo-1558618047-f4e70e59e3b7?w=800&q=80",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  ],
  // Job 5 — Oil change / completed (auto)
  j5: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80",
  ],
  // Job 6 — Backyard sod + garden beds (landscaping)
  j6: [
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=80",
    "https://images.unsplash.com/photo-1585004607434-e7c1e3e96c3a?w=800&q=80",
  ],
  // Job 7 — Hail damage roof repair
  j7: [
    "https://images.unsplash.com/photo-1632823471565-1ecdf5c6da12?w=800&q=80",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800&q=80",
  ],
  // Job 8 — AC unit replacement (HVAC)
  j8: [
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80",
  ],
  // Job 9 — Interior painting
  j9: [
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80",
    "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&q=80",
  ],
  // Job 10 — Deep clean before sale (cleaning) — includes video
  j10: [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80",
  ],
  // Job 11 — AC tune-up completed (HVAC)
  j11: [
    "https://images.unsplash.com/photo-1536939459926-301728717817?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  ],
  // Job 12 — Living room paint completed
  j12: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80",
  ],
  // Job 13 — Lawn mowing completed
  j13: [
    "https://images.unsplash.com/photo-1589923188651-268a9765e432?w=800&q=80",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
  ],
  // Transaction lifecycle jobs
  txj1: [
    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80",
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=80",
  ],
  txj2: [
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80",
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
  ],
  txj3: [
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
  ],
  txj4: [
    "https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800&q=80",
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
  ],
  txj5: [
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80",
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80",
  ],
  txj6: [
    "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&q=80",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  ],
  // Transaction lifecycle jobs 2–7
  txj2: [
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800&q=80",
    "https://images.unsplash.com/photo-1632823471565-1ecdf5c6da12?w=800&q=80",
  ],
  txj3: [
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80",
    "https://images.unsplash.com/photo-1536939459926-301728717817?w=800&q=80",
  ],
  txj4: [
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80",
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80",
  ],
  txj5: [
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80",
    "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80",
  ],
  txj7: [
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
  ],
  // Carlos completed jobs (historical earnings)
  cj1: [
    "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800&q=80",
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80",
  ],
  cj2: [
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
    "https://images.unsplash.com/photo-1585771723403-88b9c6ebb4f6?w=800&q=80",
  ],
  cj3: [
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
  ],
  cj4: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80",
  ],
  cj5: [
    "https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  ],
};

function ph(key: string): string { return JSON.stringify(J[key] ?? []); }

// === JOBS ===
const job1Id = uuidv4();
const job2Id = uuidv4();
const job3Id = uuidv4();
const job4Id = uuidv4();
const job5Id = uuidv4(); // a completed job for demo reviews

db.prepare(
  `INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  job1Id, consumer1Id,
  "Honda Civic Brake Pads + Valve Replacement - Dealership wants $1,800!",
  "Took my 2019 Honda Civic to the dealership for an oil change. They came back with a $1,800 estimate for front brake pads ($450) and a valve cover gasket replacement ($1,350). I know this is way overpriced. Looking for an honest mechanic who can do this for a fair price.",
  "auto_repair", ph("j1"), "Austin, TX", "high", "bidding", 30.2672, -97.7431, "2026-03-22"
);

db.prepare(
  `INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  job2Id, consumer1Id,
  "Kitchen Faucet Leaking - Constant Drip",
  "My kitchen faucet has been dripping non-stop for 2 days. I tried tightening it but no luck. Might need a new faucet or cartridge. Water is pooling under the sink too.",
  "plumbing", ph("j2"), "Austin, TX", "medium", "posted", 30.2672, -97.7431, "2026-03-20"
);

db.prepare(
  `INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  job3Id, consumer2Id,
  "Electrical Panel Upgrade - 100A to 200A",
  "Need to upgrade my home electrical panel from 100 amps to 200 amps. House was built in 1985 and we keep tripping breakers with modern appliances. Need a licensed electrician.",
  "electrical", ph("j3"), "Dallas, TX", "low", "posted", 32.7767, -96.7970, "2026-04-15"
);

db.prepare(
  `INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  job4Id, consumer2Id,
  "Fence Repair + Gate Installation",
  "Storm knocked down a 20-foot section of my wooden privacy fence. Also need a new gate installed. Looking for someone who can match the existing fence style.",
  "fencing", ph("j4"), "Dallas, TX", "high", "bidding", 32.7767, -96.7970, "2026-03-19"
);

// A completed job for demo review data
db.prepare(
  `INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  job5Id, consumer1Id,
  "Oil Change + Tire Rotation",
  "Standard oil change (synthetic) and tire rotation for a 2020 Toyota Camry.",
  "auto_repair", ph("j5"), "Austin, TX", "low", "completed", 30.2672, -97.7431, null, "2026-03-05"
);

// === BIDS ===
db.prepare(
  `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  uuidv4(), job1Id, contractor1Id, 65000, 1, "2026-03-16",
  "I was a Honda dealership tech for 8 years. Front brake pads on a Civic take me about 45 minutes, and the valve cover gasket is a 2-hour job. $650 total for both, parts included. I use OEM Honda parts. Can do it this Saturday.",
  "pending"
);

db.prepare(
  `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  uuidv4(), job1Id, contractor3Id, 55000, 2, "2026-03-18",
  "I can handle both jobs for $550. I use quality aftermarket parts (same specs, fraction of the cost). Available next Tuesday. I'll come to your location.",
  "pending"
);

db.prepare(
  `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  uuidv4(), job4Id, contractor3Id, 120000, 3, "2026-03-17",
  "I've done dozens of fence repairs. For a 20-foot section plus a new gate, $1,200 covers materials and labor. I'll match your existing fence style. Can start this weekend.",
  "pending"
);

// Accepted bid on completed job
const completedBidId = uuidv4();
db.prepare(
  `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  completedBidId, job5Id, contractor1Id, 8500, 1, "2026-03-01",
  "I'll handle the full service — synthetic oil, filter, and rotate all 4 tires. I come to you!",
  "accepted"
);

// === REVIEWS ===
// Sarah reviewed Carlos on the completed job
const reviewId = uuidv4();
db.prepare(
  `INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, photos) VALUES (?, ?, ?, ?, ?, ?, ?)`
).run(
  reviewId, job5Id, consumer1Id, contractor1Id, 5,
  "Carlos was fantastic! Showed up on time, did everything quickly, and even checked my brake fluid. Highly recommend.",
  "[]"
);

// Update Carlos's aggregate rating to include this review
db.prepare(
  `UPDATE contractor_profiles SET
    rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE contractor_id = ?),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE contractor_id = ?)
  WHERE user_id = ?`
).run(contractor1Id, contractor1Id, contractor1Id);

// === 5 ADDITIONAL CONSUMERS ===
// San Antonio TX: 29.4241, -98.4936  |  Houston TX: 29.7604, -95.3698
// Phoenix AZ:     33.4484, -112.0740 |  Denver CO:  39.7392, -104.9903
// Chicago IL:     41.8781, -87.6298
const consumer3Id = uuidv4();
const consumer4Id = uuidv4();
const consumer5Id = uuidv4();
const consumer6Id = uuidv4();
const consumer7Id = uuidv4();

const insertUser = db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, credit_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

insertUser.run(consumer3Id, "emma@demo.com",    hash, "Emma Rodriguez",   "consumer", "555-0103", "San Antonio, TX", 1, 29.4241,  -98.4936,  makeReferralCode(consumer3Id, "Emma Rodriguez"),   0);
insertUser.run(consumer4Id, "james@demo.com",   hash, "James Thompson",   "consumer", "555-0104", "Houston, TX",     1, 29.7604,  -95.3698,  makeReferralCode(consumer4Id, "James Thompson"),   0);
insertUser.run(consumer5Id, "priya@demo.com",   hash, "Priya Patel",      "consumer", "555-0105", "Phoenix, AZ",     1, 33.4484, -112.0740,  makeReferralCode(consumer5Id, "Priya Patel"),      0);
insertUser.run(consumer6Id, "brandon@demo.com", hash, "Brandon Scott",    "consumer", "555-0106", "Denver, CO",      1, 39.7392, -104.9903,  makeReferralCode(consumer6Id, "Brandon Scott"),    2500);
insertUser.run(consumer7Id, "lisa@demo.com",    hash, "Lisa Martinez",    "consumer", "555-0107", "Chicago, IL",     1, 41.8781,  -87.6298,  makeReferralCode(consumer7Id, "Lisa Martinez"),    0);

// === 5 ADDITIONAL CONTRACTORS ===
const contractor4Id = uuidv4();
const contractor5Id = uuidv4();
const contractor6Id = uuidv4();
const contractor7Id = uuidv4();
const contractor8Id = uuidv4();

insertUser.run(contractor4Id, "marcus@demo.com",  hash, "Marcus Johnson", "contractor", "555-0204", "Houston, TX",     1, 29.7604,  -95.3698,  makeReferralCode(contractor4Id, "Marcus Johnson"),  0);
insertUser.run(contractor5Id, "rachel@demo.com",  hash, "Rachel Kim",     "contractor", "555-0205", "San Antonio, TX", 1, 29.4241,  -98.4936,  makeReferralCode(contractor5Id, "Rachel Kim"),      0);
insertUser.run(contractor6Id, "tony@demo.com",    hash, "Tony Reyes",     "contractor", "555-0206", "Phoenix, AZ",     1, 33.4484, -112.0740,  makeReferralCode(contractor6Id, "Tony Reyes"),      0);
insertUser.run(contractor7Id, "amanda@demo.com",  hash, "Amanda Walsh",   "contractor", "555-0207", "Denver, CO",      1, 39.7392, -104.9903,  makeReferralCode(contractor7Id, "Amanda Walsh"),    0);
insertUser.run(contractor8Id, "derek@demo.com",   hash, "Derek Foster",   "contractor", "555-0208", "Chicago, IL",     1, 41.8781,  -87.6298,  makeReferralCode(contractor8Id, "Derek Foster"),    0);

const insertProfile = db.prepare(
  "INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count, verification_status, insurance_status, business_established, contractor_type, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

// Marcus Johnson — HVAC
insertProfile.run(
  contractor4Id,
  "Certified HVAC technician with 12 years in residential and light commercial systems. I handle installs, repairs, and annual tune-ups with speed and honesty. Houston heat is no joke — I'm here when you need me.",
  12, '["hvac","appliance_repair"]', 4.7, 31, "approved", "approved", 2012, "certified",
  JSON.stringify([
    { type: "certification", name: "NATE Certified HVAC Technician", issuer: "NATE", number: "NATE-88271" },
    { type: "certification", name: "EPA 608 Universal Certification", issuer: "EPA" },
    { type: "license", name: "Texas HVAC Contractor License", issuer: "Texas TDLR", number: "HVAC-55432" },
  ])
);

// Rachel Kim — Painting & Flooring
insertProfile.run(
  contractor5Id,
  "7 years of interior and exterior painting plus hardwood and tile flooring installs. I do detailed prep work so the finish lasts. No hidden fees, no subcontractors — just me and clean results.",
  7, '["painting","flooring"]', 4.6, 18, "approved", "none", 2017, "licensed",
  JSON.stringify([
    { type: "license", name: "Texas Painting Contractor License", issuer: "Texas TDLR", number: "PAINT-30128" },
    { type: "certification", name: "Lead-Safe Certified Renovator", issuer: "EPA", number: "TX-R-2241" },
  ])
);

// Tony Reyes — Roofing
insertProfile.run(
  contractor6Id,
  "10-year roofing veteran specializing in storm damage, full replacements, and leak repairs. Licensed in Arizona, always pull permits, and work with most insurance adjusters. No storm chasers — I'm local and I stand behind my work.",
  10, '["roofing"]', 4.8, 42, "approved", "approved", 2014, "licensed",
  JSON.stringify([
    { type: "license", name: "Arizona Roofing Contractor License", issuer: "Arizona ROC", number: "ROC-278819" },
    { type: "bonded", name: "Surety Bond — $100,000", issuer: "Southwest Bonding Co." },
    { type: "membership", name: "National Roofing Contractors Association", issuer: "NRCA" },
  ])
);

// Amanda Walsh — Landscaping
insertProfile.run(
  contractor7Id,
  "Passionate about creating beautiful outdoor spaces in the Denver metro. I specialize in lawn care, garden design, sod installation, and seasonal clean-ups. Available for one-time jobs and weekly maintenance contracts.",
  4, '["landscaping"]', 4.4, 11, "none", "none", null, "independent",
  JSON.stringify([
    { type: "certification", name: "Colorado Pesticide Applicator License", issuer: "Colorado Dept of Agriculture" },
  ])
);

// Derek Foster — Cleaning & Handyman
insertProfile.run(
  contractor8Id,
  "Your go-to for deep cleans and general home repairs in Chicago. I handle move-out cleans, post-construction clean-ups, drywall patches, fixture installs, and more. Available 7 days a week with same-week scheduling.",
  6, '["cleaning","handyman"]', 4.3, 8, "pending", "none", 2020, "independent",
  JSON.stringify([])
);

// === NEW JOBS (5 from new consumers) ===
const job6Id  = uuidv4();
const job7Id  = uuidv4();
const job8Id  = uuidv4();
const job9Id  = uuidv4();
const job10Id = uuidv4();

const insertJob = db.prepare(
  "INSERT INTO jobs (id, consumer_id, title, description, category, photos, location, urgency, status, latitude, longitude, expected_completion_date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

insertJob.run(
  job6Id, consumer3Id,
  "Backyard Landscaping Overhaul — Sod + Garden Beds",
  "My backyard is mostly dead grass and weeds after the drought. I want about 800 sq ft of new sod (St. Augustine or Bermuda) and two raised garden beds built along the back fence. Also need the existing beds edged and mulched.",
  "landscaping", ph("j6"), "San Antonio, TX", "low", "bidding", 29.4241, -98.4936, "2026-04-30", null
);

insertJob.run(
  job7Id, consumer4Id,
  "Roof Inspection + Hail Damage Repair After Last Week's Storm",
  "We had a major hail storm last Tuesday. I can see missing shingles from the ground and my neighbor already filed an insurance claim. I need a licensed roofer to do a proper inspection and give me a written estimate I can submit to my insurer.",
  "roofing", ph("j7"), "Houston, TX", "high", "bidding", 29.7604, -95.3698, "2026-03-25", null
);

insertJob.run(
  job8Id, consumer5Id,
  "Central AC Unit Replacement — 3 Ton, Carrier or Trane",
  "Our 2008 Carrier unit finally gave out. Two HVAC companies quoted us $7,200 and $8,400 for a 3-ton Trane unit with installation. Looking for a certified tech who can beat that price with comparable equipment. House is 1,800 sq ft single story.",
  "hvac", ph("j8"), "Phoenix, AZ", "medium", "posted", 33.4484, -112.0740, "2026-04-10", null
);

insertJob.run(
  job9Id, consumer6Id,
  "Interior Painting — 3 Bedroom House, All Common Areas",
  "Moving into a new house and want everything painted before furniture arrives. 3 bedrooms, living room, hallway, and dining room. About 1,400 sq ft total. I'll supply the paint (Benjamin Moore Regal Select). Just need labor and prep work.",
  "painting", ph("j9"), "Denver, CO", "low", "bidding", 39.7392, -104.9903, "2026-04-20", null
);

insertJob.run(
  job10Id, consumer7Id,
  "Full Deep Clean Before Home Sale (4BR / 2BA)",
  "Listing my home in 2 weeks and want it spotless for showings. 4 bed, 2 bath, roughly 2,000 sq ft. I need every surface cleaned including inside cabinets, oven, fridge, baseboards, and windows. The house is empty — no furniture.",
  "cleaning", ph("j10"), "Chicago, IL", "medium", "posted", 41.8781, -87.6298, "2026-03-28", null
);

// === BIDS ON NEW JOBS ===
const insertBid = db.prepare(
  "INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);

insertBid.run(
  uuidv4(), job6Id, contractor7Id, 340000, 5, "2026-04-15",
  "800 sq ft of Bermuda sod plus two 4×8 raised cedar beds comes to $3,400 — sod, materials, delivery, and labor included. I'll edge, prep the soil, and lay everything. Can start April 15 and finish in a day and a half.",
  "pending"
);

insertBid.run(
  uuidv4(), job7Id, contractor6Id, 0, 1, "2026-03-21",
  "I do free hail damage inspections for insurance claims — I've worked with State Farm, Allstate, and USAA adjusters dozens of times. I'll give you a full written report. If repairs are needed my pricing is typically $150–$400 per square depending on damage. Let me take a look first.",
  "pending"
);

insertBid.run(
  uuidv4(), job7Id, contractor3Id, 55000, 2, "2026-03-23",
  "I can do a full roof inspection and patch any damaged sections for $550. I'll document everything with photos for your insurance claim.",
  "pending"
);

insertBid.run(
  uuidv4(), job9Id, contractor5Id, 260000, 4, "2026-04-07",
  "1,400 sq ft of walls and ceilings — labor only with customer-supplied paint — is $2,600. That covers full prep, two coats everywhere, and clean-up. I've done dozens of homes in Denver. Can start April 7 and have it done in 4 days.",
  "pending"
);

insertBid.run(
  uuidv4(), job10Id, contractor8Id, 37500, 1, "2026-03-25",
  "Full move-out deep clean on a 2,000 sq ft empty home is $375. Includes inside all cabinets, appliances, bathrooms, baseboards, windows, and floors. I work alone so you're not paying a crew markup. I can have it sparkling in one day.",
  "pending"
);

// === COMPLETED JOBS + REVIEWS for new contractors ===
const job11Id = uuidv4();
const job12Id = uuidv4();
const job13Id = uuidv4();

insertJob.run(
  job11Id, consumer5Id,
  "AC Tune-Up + Refrigerant Recharge",
  "Annual tune-up and refrigerant top-off on a 5-year-old Trane unit.",
  "hvac", ph("j11"), "Phoenix, AZ", "low", "completed", 33.4484, -112.0740, null, "2026-02-20"
);

insertJob.run(
  job12Id, consumer6Id,
  "Living Room + Dining Room Paint — Two Accent Walls",
  "Paint living room and dining room, two accent walls in a bold color.",
  "painting", ph("j12"), "Denver, CO", "low", "completed", 39.7392, -104.9903, null, "2026-01-25"
);

insertJob.run(
  job13Id, consumer3Id,
  "Weekly Lawn Mowing + Edge Trimming — April",
  "Four weekly visits for mow and edge on a 6,000 sq ft corner lot.",
  "landscaping", ph("j13"), "San Antonio, TX", "low", "completed", 29.4241, -98.4936, null, "2026-03-10"
);

const completedBid2Id = uuidv4();
const completedBid3Id = uuidv4();
const completedBid4Id = uuidv4();

insertBid.run(completedBid2Id, job11Id, contractor4Id, 18500, 1, "2026-02-14",
  "Tune-up, coil clean, filter swap, and refrigerant check — $185 flat. I'll have you cooling again same day.", "accepted");

insertBid.run(completedBid3Id, job12Id, contractor5Id, 95000, 3, "2026-01-15",
  "Two-room paint with two accent walls, full prep and two coats — $950. I'll tape, prime the accent walls, and leave clean edges.", "accepted");

insertBid.run(completedBid4Id, job13Id, contractor7Id, 22000, 1, "2026-03-01",
  "Four weekly visits, mow + edge + blow — $55/visit, $220 total for the month. I bring all equipment.", "accepted");

const insertReview = db.prepare(
  "INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, photos) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

insertReview.run(uuidv4(), job11Id, consumer5Id, contractor4Id, 5,
  "Marcus was early, diagnosed a low refrigerant issue immediately, and had everything fixed in under 2 hours. Very fair price and super professional. Already booked him for next year's tune-up.", "[]");

insertReview.run(uuidv4(), job12Id, consumer6Id, contractor5Id, 4,
  "Rachel did a beautiful job on both rooms. The accent walls came out perfect and she finished a day early. Only minor note: cleanup could have been a bit more thorough, but the paint work itself is flawless.", "[]");

insertReview.run(uuidv4(), job13Id, consumer3Id, contractor7Id, 5,
  "Amanda is reliable, punctual, and my lawn has never looked better. She noticed a drainage issue along the fence and flagged it for me without being asked. Will absolutely keep her on for the summer.", "[]");

// Update aggregate ratings for new contractors
const updateRating = db.prepare(`
  UPDATE contractor_profiles SET
    rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE contractor_id = ?),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE contractor_id = ?)
  WHERE user_id = ?
`);
updateRating.run(contractor4Id, contractor4Id, contractor4Id);
updateRating.run(contractor5Id, contractor5Id, contractor5Id);
updateRating.run(contractor7Id, contractor7Id, contractor7Id);

// ================================================================
// === FULL TRANSACTION LIFECYCLE — consumer ↔ contractor pairs ===
// ================================================================
// Each block: job posted → competing bids → one accepted → job advances
// States covered: accepted, in_progress, completed (with reviews)

// ── 1. Emma (San Antonio) + Amanda Walsh — ACCEPTED (about to start) ──
const txJob1Id = uuidv4();
const txBid1aId = uuidv4();
const txBid1bId = uuidv4();
insertJob.run(
  txJob1Id, consumer3Id,
  "Lawn Aeration, Overseeding + Spring Cleanup",
  "My front and back yard need a full spring refresh — aeration, overseeding with Bermuda grass, raking out thatch, and edging the beds. About 5,000 sq ft total. Also need the winter leaves cleared from the beds along the fence.",
  "landscaping", ph("txj1"), "San Antonio, TX", "low", "accepted", 29.4241, -98.4936, "2026-04-05", null
);
insertBid.run(txBid1aId, txJob1Id, contractor7Id, 62000, 2, "2026-04-01",
  "Aeration, overseeding, thatch rake, and bed cleanup for 5,000 sq ft — $620. I'll bring the aerator and seed. Can be there April 1st and finish in two days.", "accepted");
insertBid.run(txBid1bId, txJob1Id, contractor8Id, 75000, 3, "2026-04-03",
  "I can handle all of this for $750. Full aeration, overseeding, cleanup. Available April 3rd.", "rejected");

// ── 2. James (Houston) + Tony Reyes — IN PROGRESS (work underway) ──
const txJob2Id = uuidv4();
const txBid2aId = uuidv4();
const txBid2bId = uuidv4();
insertJob.run(
  txJob2Id, consumer4Id,
  "Full Roof Replacement — 2,200 sq ft Ranch Home",
  "My 1998 roof is at end of life. Insurance adjuster confirmed full replacement after the hail storm. Need a licensed AZ/TX roofer who can work with my insurer (State Farm). House is 2,200 sq ft single story, 4:12 pitch. Prefer Owens Corning Duration shingles.",
  "roofing", ph("txj2"), "Houston, TX", "high", "in_progress", 29.7604, -95.3698, "2026-03-30", null
);
insertBid.run(txBid2aId, txJob2Id, contractor6Id, 1140000, 3, "2026-03-20",
  "Full replacement on a 2,200 sq ft ranch — tear-off, new underlayment, Owens Corning Duration shingles, new flashing, and cleanup — $11,400. I've worked with State Farm dozens of times and will handle the supplement paperwork. Can start March 20.", "accepted");
insertBid.run(txBid2bId, txJob2Id, contractor3Id, 980000, 4, "2026-03-22",
  "I can do the full replacement for $9,800 with comparable materials. Available March 22nd.", "rejected");

// ── 3. Priya (Phoenix) + Marcus Johnson — IN PROGRESS ──
const txJob3Id = uuidv4();
const txBid3aId = uuidv4();
const txBid3bId = uuidv4();
insertJob.run(
  txJob3Id, consumer5Id,
  "Mini-Split Installation — Master Bedroom + Home Office",
  "Adding two 12,000 BTU mini-splits to a master bedroom and home office that aren't connected to the central system. Mitsubishi or Daikin preferred. Need a certified HVAC tech who can pull permits and handle the electrical tie-in.",
  "hvac", ph("txj3"), "Phoenix, AZ", "medium", "in_progress", 33.4484, -112.0740, "2026-03-28", null
);
insertBid.run(txBid3aId, txJob3Id, contractor4Id, 430000, 2, "2026-03-18",
  "Two 12,000 BTU Mitsubishi mini-splits installed, permitted, and running — $4,300 parts and labor. I handle the electrical tie-in and all permit paperwork. EPA certified, NATE certified. Can start March 18th.", "accepted");
insertBid.run(txBid3bId, txJob3Id, contractor8Id, 390000, 3, "2026-03-21",
  "I can do both units for $3,900 using Daikin equipment. Available March 21st.", "rejected");

// ── 4. Brandon (Denver) + Rachel Kim — COMPLETED + review ──
const txJob4Id = uuidv4();
const txBid4aId = uuidv4();
const txBid4bId = uuidv4();
insertJob.run(
  txJob4Id, consumer6Id,
  "Full Exterior Paint — 2-Story Colonial, ~2,800 sq ft",
  "My house hasn't been painted in 12 years and the paint is chipping on the south and west sides. 2-story colonial, roughly 2,800 sq ft of paintable surface. Need full prep (scrape, sand, prime bare spots), caulk windows, and two coats exterior acrylic. I'll pick the colors.",
  "painting", ph("txj4"), "Denver, CO", "medium", "completed", 39.7392, -104.9903, null, "2026-03-08"
);
insertBid.run(txBid4aId, txJob4Id, contractor5Id, 520000, 5, "2026-03-01",
  "Exterior paint on a 2-story colonial — full scrape, sand, spot prime, caulk, and two coats of Sherwin-Williams Emerald Exterior — $5,200. I'll handle all the prep properly so it lasts. Can start March 1st and finish in 5 days weather permitting.", "accepted");
insertBid.run(txBid4bId, txJob4Id, contractor7Id, 480000, 7, "2026-03-05",
  "I can do the exterior for $4,800 using Benjamin Moore Aura. Available March 5th.", "rejected");
insertReview.run(uuidv4(), txJob4Id, consumer6Id, contractor5Id, 5,
  "Rachel did an outstanding job. The prep work alone took two full days — she scraped every flake, primed every bare spot, and caulked every gap before touching a brush. The finish looks factory-new. Worth every penny.", "[]");

// ── 5. Lisa (Chicago) + Derek Foster — COMPLETED + review ──
const txJob5Id = uuidv4();
const txBid5aId = uuidv4();
const txBid5bId = uuidv4();
insertJob.run(
  txJob5Id, consumer7Id,
  "Post-Renovation Deep Clean — Kitchen + 2 Bathrooms Gutted",
  "Just finished a kitchen and two bathroom gut renovation. Construction dust is everywhere — cabinets, floors, vents, windows, grout lines. Need a crew or experienced cleaner who has done post-construction cleans before. About 1,600 sq ft of active work area.",
  "cleaning", ph("txj5"), "Chicago, IL", "medium", "completed", 41.8781, -87.6298, null, "2026-03-10"
);
insertBid.run(txBid5aId, txJob5Id, contractor8Id, 58000, 1, "2026-03-05",
  "Post-construction deep clean on 1,600 sq ft with kitchen and 2 baths — $580. I specialize in these. I bring my own HEPA vacuum, microfiber system, and grout cleaning tools. Can have it done in one long day. Available March 5th.", "accepted");
insertBid.run(txBid5bId, txJob5Id, contractor7Id, 65000, 2, "2026-03-07",
  "I can do the post-reno clean for $650. Two days to be thorough. Available March 7th.", "rejected");
insertReview.run(uuidv4(), txJob5Id, consumer7Id, contractor8Id, 4,
  "Derek did a solid job on a genuinely difficult post-construction mess. The kitchen and bathrooms came out spotless. Grout lines were perfect. Only reason I'm not giving 5 stars is the living room baseboards still had some drywall dust — but he came back and fixed it same evening. Would hire again.", "[]");

// ── 6. Sarah (Austin) + Carlos Rivera — IN PROGRESS ──
const txJob6Id = uuidv4();
const txBid6aId = uuidv4();
insertJob.run(
  txJob6Id, consumer1Id,
  "2019 Honda Civic — Full Tune-Up + AC Recharge",
  "My Civic is due for spark plugs, air filter, cabin filter, and the AC has been blowing warm. Dealership quoted $680. Looking for an honest mechanic who can do all of it at a fair price. Happy to drop the car off.",
  "auto_repair", ph("txj6"), "Austin, TX", "medium", "in_progress", 30.2672, -97.7431, "2026-03-22", null
);
insertBid.run(txBid6aId, txJob6Id, contractor1Id, 28000, 1, "2026-03-17",
  "Spark plugs (NGK iridium), air and cabin filters, and full AC service including refrigerant recharge — $280 parts and labor. I was a Honda tech for 8 years. Can do it this Monday.", "accepted");

// ── 7. Mike (Dallas) + Jenny Park — COMPLETED + review ──
const txJob7Id = uuidv4();
const txBid7aId = uuidv4();
const txBid7bId = uuidv4();
insertJob.run(
  txJob7Id, consumer2Id,
  "Recessed Lighting — Living Room + Kitchen (12 cans total)",
  "Want to add recessed lighting to my living room (8 cans) and kitchen (4 cans). House is single story with attic access. Need a licensed electrician who can tie into the existing panel — I have a 200A service that was upgraded last year.",
  "electrical", ph("txj7"), "Dallas, TX", "low", "completed", 32.7767, -96.7970, null, "2026-03-01"
);
insertBid.run(txBid7aId, txJob7Id, contractor2Id, 240000, 2, "2026-02-20",
  "12 recessed LED cans (6-inch Halo, dimmable), new dimmer switches, all wiring and trim — $2,400. With attic access this is a clean job. I'm licensed and insured. Can start Feb 20th and finish in 2 days.", "accepted");
insertBid.run(txBid7bId, txJob7Id, contractor3Id, 210000, 3, "2026-02-23",
  "I can do 12 cans for $2,100. Available Feb 23rd.", "rejected");
insertReview.run(uuidv4(), txJob7Id, consumer2Id, contractor2Id, 5,
  "Jenny was exceptional. Showed up exactly on time both days, ran all the wiring through the attic without a single drywall cut, and the dimmer control is smooth on every circuit. I've hired a lot of electricians — she's the best I've worked with. Already booked her for the master bedroom.", "[]");

// ── 8–12. Additional COMPLETED jobs for Carlos Rivera (earnings history) ──
const cJob1Id = uuidv4();
const cJob2Id = uuidv4();
const cJob3Id = uuidv4();
const cJob4Id = uuidv4();
const cJob5Id = uuidv4();

insertJob.run(
  cJob1Id, consumer1Id,
  "Brake Pads + Rotors — 2017 Toyota RAV4",
  "Brakes are squealing really bad, especially the front. Dealership wants $800 for pads and rotors. Car has 68k miles. Need someone who can do it for a fair price and use decent parts.",
  "auto_repair", ph("cj1"), "Austin, TX", "high", "completed", 30.2672, -97.7431, null, "2026-01-12"
);
insertBid.run(uuidv4(), cJob1Id, contractor1Id, 35000, 1, "2026-01-10",
  "Front brake pads and rotors on a RAV4 — straightforward job. $350 covers OEM-equivalent pads, premium rotors, and labor. About 90 minutes start to finish. Can do it Saturday morning.", "accepted");
insertReview.run(uuidv4(), cJob1Id, consumer1Id, contractor1Id, 5,
  "Carlos knocked this out in about an hour. Parts were quality and he even showed me the old rotors so I could see the wear. Half the price of the dealer. Will use him again for sure.", "[]");

insertJob.run(
  cJob2Id, consumer2Id,
  "Garbage Disposal Replacement — InSinkErator",
  "Our garbage disposal died — it just hums but the blades don't spin. It's an old 1/3 HP unit. Want to upgrade to a 3/4 HP InSinkErator. Need someone to remove the old one and install the new one. I can buy the unit.",
  "plumbing", ph("cj2"), "Dallas, TX", "medium", "completed", 32.7767, -96.7970, null, "2026-01-24"
);
insertBid.run(uuidv4(), cJob2Id, contractor1Id, 17500, 1, "2026-01-22",
  "Disposal swap is quick — disconnect old, mount new InSinkErator, test connections. $175 labor. Takes about 45 minutes. I can come by this Wednesday.", "accepted");
insertReview.run(uuidv4(), cJob2Id, consumer2Id, contractor1Id, 5,
  "Super fast and clean. Carlos had the old disposal out and the new one running in under an hour. No leaks, no mess. Great price too.", "[]");

insertJob.run(
  cJob3Id, consumer1Id,
  "Water Heater Flush + Anode Rod Replacement",
  "Our hot water has been rusty colored lately. Water heater is a 50 gal Rheem, about 6 years old. Pretty sure it needs a flush and new anode rod. Never had it maintained since we moved in.",
  "plumbing", ph("cj3"), "Austin, TX", "medium", "completed", 30.2672, -97.7431, null, "2026-02-08"
);
insertBid.run(uuidv4(), cJob3Id, contractor1Id, 22000, 1, "2026-02-05",
  "Full drain and flush plus magnesium anode rod replacement — $220 including the rod. This will clear up that rusty water and add years to the tank. Can do it this weekend.", "accepted");
insertReview.run(uuidv4(), cJob3Id, consumer1Id, contractor1Id, 4,
  "Carlos did a thorough flush — the amount of sediment that came out was unreal. Water is crystal clear now. Took about an hour and a half. Only reason for 4 stars is he showed up 30 min late, but he called ahead.", "[]");

insertJob.run(
  cJob4Id, consumer2Id,
  "AC Compressor Replacement — 2016 Honda Accord",
  "AC blows warm air. Mechanic friend says it's the compressor. Car has 92k miles. Dealership quoted $1,400. Looking for someone who actually knows Honda AC systems.",
  "auto_repair", ph("cj4"), "Dallas, TX", "high", "completed", 32.7767, -96.7970, null, "2026-02-22"
);
insertBid.run(uuidv4(), cJob4Id, contractor1Id, 65000, 1, "2026-02-18",
  "AC compressor replacement on a 2016 Accord — $650 for a new Denso compressor (OEM supplier), receiver/drier, expansion valve, and full system recharge. I do these all the time. Available this Saturday.", "accepted");
insertReview.run(uuidv4(), cJob4Id, consumer2Id, contractor1Id, 5,
  "Absolutely the right call hiring Carlos. AC is ice cold now. He replaced the compressor, drier, and expansion valve, and explained everything he was doing. Less than half the dealership price.", "[]");

insertJob.run(
  cJob5Id, consumer1Id,
  "Bathroom Faucet Replacement + Running Toilet Fix",
  "Need two things done: bathroom sink faucet is corroded and needs replacing (I bought a new Moen faucet), and the toilet in the same bathroom runs constantly. Probably needs a new flapper or fill valve.",
  "plumbing", ph("cj5"), "Austin, TX", "low", "completed", 30.2672, -97.7431, null, "2026-03-04"
);
insertBid.run(uuidv4(), cJob5Id, contractor1Id, 18500, 1, "2026-03-02",
  "Faucet swap with customer-supplied fixture plus toilet rebuild kit — $185 total. I'll replace the fill valve and flapper so it's fully sorted. Can be there Saturday afternoon.", "accepted");
insertReview.run(uuidv4(), cJob5Id, consumer1Id, contractor1Id, 5,
  "Carlos is my go-to now. Fixed both issues in about an hour. The faucet install was clean and the toilet doesn't run anymore. Fair price, good work, shows up when he says he will.", "[]");

// One more completed job for Carlos — deck power washing
const cJob6Id = uuidv4();
insertJob.run(
  cJob6Id, consumer2Id,
  "Deck Power Wash + Seal — 400 sqft Cedar",
  "Our back deck is looking pretty rough after winter. It's about 400 sqft of cedar decking. Needs a good power wash and then sealed. Last time it was done was maybe 4 years ago. Some boards are starting to turn gray.",
  "deck_patio", '[]', "Dallas, TX", "low", "completed", 32.7767, -96.7970, null, "2026-03-01"
);
insertBid.run(uuidv4(), cJob6Id, contractor1Id, 55000, 2, "2026-02-25",
  "400 sqft cedar deck — power wash, let it dry overnight, then two coats of Thompson's WaterSeal. $550 covers everything including materials. Can start this Friday.", "accepted");
insertReview.run(uuidv4(), cJob6Id, consumer2Id, contractor1Id, 5,
  "Deck looks brand new. Carlos was meticulous with the power washer — didn't damage the wood at all. The sealant is even and the cedar grain really pops now. Great value.", "[]");

// Another completed job for Carlos — higher value
const cJob7Id = uuidv4();
insertJob.run(
  cJob7Id, consumer1Id,
  "Garage Door Opener Replacement — LiftMaster Belt Drive",
  "Our garage door opener died. It's a 20 year old chain drive that's been getting louder and louder. Want to upgrade to a belt drive. I bought a LiftMaster 8550W but don't have the tools or know-how to install it. Two car garage, standard height.",
  "garage_doors", '[]', "Austin, TX", "medium", "completed", 30.2672, -97.7431, null, "2026-03-12"
);
insertBid.run(uuidv4(), cJob7Id, contractor1Id, 27500, 1, "2026-03-08",
  "Garage door opener swap — remove old chain drive, install your LiftMaster 8550W, program remotes, and set travel limits — $275 labor. Straightforward job, about 2 hours. Can do it Saturday.", "accepted");
insertReview.run(uuidv4(), cJob7Id, consumer1Id, contractor1Id, 5,
  "Carlos had the old opener down and the new one up and running in under 2 hours. Programmed both remotes and the keypad. Belt drive is whisper quiet. So glad I didn't try to DIY this.", "[]");

// ── 14. Cancelled job for status variety ──
const cancelledJobId = uuidv4();
insertJob.run(
  cancelledJobId, consumer3Id,
  "Deck Power Wash + Stain — 300 sqft",
  "Want to get my back deck power washed and re-stained before spring. It's about 300 sqft of cedar decking. Last stained maybe 3 years ago. Starting to look gray and weathered.",
  "deck_patio", '[]', "San Antonio, TX", "low", "cancelled", 29.4241, -98.4936, "2026-04-15", null
);

// Update ratings for contractors who got new reviews
updateRating.run(contractor5Id, contractor5Id, contractor5Id);
updateRating.run(contractor8Id, contractor8Id, contractor8Id);
updateRating.run(contractor2Id, contractor2Id, contractor2Id);
updateRating.run(contractor1Id, contractor1Id, contractor1Id);

console.log("Seed data inserted successfully!");
console.log("\nDemo accounts (password: password123) — all pre-verified:");
console.log("  Consumers:   sarah@demo.com, mike@demo.com, emma@demo.com, james@demo.com, priya@demo.com, brandon@demo.com, lisa@demo.com");
console.log("  Contractors: carlos@demo.com, jenny@demo.com, dave@demo.com, marcus@demo.com, rachel@demo.com, tony@demo.com, amanda@demo.com, derek@demo.com");
console.log("\nJobs: 28 total across all transaction stages (posted, bidding, accepted, in_progress, completed, cancelled)");
console.log("Contractor badges: Carlos=Verified+Insured, Jenny=Verified, Marcus=Verified+Insured, Rachel=Verified, Tony=Verified+Insured");
console.log("\nCarlos Rivera earnings: 8 completed jobs, ~$2,490 total");
console.log("\nTransaction pairs:");
console.log("  Emma → Amanda Walsh (lawn aeration — accepted)");
console.log("  James → Tony Reyes (roof replacement — in_progress)");
console.log("  Priya → Marcus Johnson (mini-split install — in_progress)");
console.log("  Brandon → Rachel Kim (exterior paint — completed ★★★★★)");
console.log("  Lisa → Derek Foster (post-reno clean — completed ★★★★)");
console.log("  Sarah → Carlos Rivera (tune-up + AC — in_progress)");
console.log("  Mike → Jenny Park (recessed lighting — completed ★★★★★)");
console.log("  Carlos Rivera: 5 additional completed jobs (brake pads, disposal, water heater, AC compressor, bathroom plumbing)");
console.log("\nTo make a user admin: UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';");

// === CONTRACTOR CERTIFICATIONS & WORK HISTORY (Trust System) ===
const insertCert = db.prepare(
  "INSERT INTO certifications (id, contractor_id, name, issuer, issue_date, expiry_date, verified) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
insertCert.run(uuidv4(), contractor1Id, "EPA Section 608 Universal", "EPA", "2018-03-15", "2028-03-15", 1);
insertCert.run(uuidv4(), contractor1Id, "ASE Master Technician", "ASE", "2019-06-01", "2024-06-01", 1);
insertCert.run(uuidv4(), contractor1Id, "OSHA 30-Hour Construction Safety", "OSHA", "2020-01-10", null, 1);

const insertWork = db.prepare(
  "INSERT INTO work_history (id, contractor_id, company_name, role, start_date, end_date, verified) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
insertWork.run(uuidv4(), contractor1Id, "Honda of Austin", "Lead Technician", "2014-01-01", "2022-06-30", 1);
insertWork.run(uuidv4(), contractor1Id, "ServiceMaster Restore", "Field Technician", "2012-03-01", "2014-01-01", 0);

// Jenny Park certifications
insertCert.run(uuidv4(), contractor2Id, "Master Electrician License", "Texas TDLR", "2017-05-20", "2027-05-20", 1);
insertCert.run(uuidv4(), contractor2Id, "NFPA 70E Arc Flash Safety", "NFPA", "2021-08-15", "2024-08-15", 1);

insertWork.run(uuidv4(), contractor2Id, "Mr. Electric", "Senior Electrician", "2015-01-01", "2021-12-31", 1);

// Marcus Johnson certifications
insertCert.run(uuidv4(), contractor4Id, "NATE Certified HVAC Technician", "NATE", "2018-04-01", "2026-04-01", 1);
insertCert.run(uuidv4(), contractor4Id, "EPA Section 608 Universal", "EPA", "2016-09-10", "2026-09-10", 1);

insertWork.run(uuidv4(), contractor4Id, "Carrier Factory Authorized", "HVAC Installer", "2016-01-01", "2023-06-30", 1);

// Update contractor headlines
await db.prepare("UPDATE contractor_profiles SET headline = ?, about_me = ?, background_check_status = 'approved' WHERE user_id = ?").run(
  "ASE Master Tech — 12 Years Honda & Toyota Specialist",
  "Former Honda dealership lead tech with 12 years of experience. I specialize in Japanese vehicles but work on all makes. Mobile service — I come to you. OEM parts, dealership quality, half the price.",
  contractor1Id
);
await db.prepare("UPDATE contractor_profiles SET headline = ?, about_me = ? WHERE user_id = ?").run(
  "Licensed Master Electrician — Residential & Light Commercial",
  "Licensed master electrician with 10+ years experience. From panel upgrades to smart home wiring, I do it all. Clean, code-compliant work with a 2-year warranty on all labor.",
  contractor2Id
);
await db.prepare("UPDATE contractor_profiles SET headline = ?, about_me = ?, background_check_status = 'approved' WHERE user_id = ?").run(
  "NATE Certified HVAC Tech — Installations, Repairs & Maintenance",
  "Carrier factory-trained HVAC technician. I handle everything from tune-ups to full system replacements. EPA certified, NATE certified, and insured. Fair pricing with no hidden fees.",
  contractor4Id
);

db.close();
