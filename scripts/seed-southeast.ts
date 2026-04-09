/**
 * Southeast Region Seed + Test Script
 * Creates 5 consumers, 20 contractors, 20 jobs, and has contractors bid on them
 * Then runs full verification tests
 * Run: npx tsx scripts/seed-southeast.ts
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL not set in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function q(sql: string, params: unknown[] = []) {
  return pool.query(sql, params);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HASH = bcrypt.hashSync("Southeast2024!", 10);
const uid = () => uuidv4();
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

// ─── Southeast Cities ──────────────────────────────────────────────────────────

const SE_LOCATIONS = [
  { city: "Atlanta, GA",        address: "512 Peachtree St NE, Atlanta, GA 30308",       lat: 33.7749, lng: -84.3963 },
  { city: "Miami, FL",          address: "1450 Brickell Ave, Miami, FL 33131",            lat: 25.7617, lng: -80.1918 },
  { city: "Charlotte, NC",      address: "333 Trade St, Charlotte, NC 28202",             lat: 35.2271, lng: -80.8431 },
  { city: "Nashville, TN",      address: "200 Broadway, Nashville, TN 37201",             lat: 36.1627, lng: -86.7816 },
  { city: "Jacksonville, FL",   address: "100 N Laura St, Jacksonville, FL 32202",        lat: 30.3322, lng: -81.6557 },
  { city: "Orlando, FL",        address: "400 W Church St, Orlando, FL 32801",            lat: 28.5383, lng: -81.3792 },
  { city: "Tampa, FL",          address: "401 N Ashley Dr, Tampa, FL 33602",              lat: 27.9506, lng: -82.4572 },
  { city: "Raleigh, NC",        address: "1 E Hargett St, Raleigh, NC 27601",             lat: 35.7796, lng: -78.6382 },
  { city: "New Orleans, LA",    address: "700 Magazine St, New Orleans, LA 70130",        lat: 29.9511, lng: -90.0715 },
  { city: "Memphis, TN",        address: "149 Union Ave, Memphis, TN 38103",              lat: 35.1495, lng: -90.0490 },
  { city: "Birmingham, AL",     address: "2100 Richard Arrington Jr Blvd, Birmingham, AL 35203", lat: 33.5186, lng: -86.8104 },
  { city: "Savannah, GA",       address: "22 Bull St, Savannah, GA 31401",                lat: 32.0835, lng: -81.0998 },
  { city: "Charleston, SC",     address: "80 Broad St, Charleston, SC 29401",             lat: 32.7765, lng: -79.9311 },
  { city: "Columbia, SC",       address: "1600 Hampton St, Columbia, SC 29201",           lat: 34.0007, lng: -81.0348 },
  { city: "Knoxville, TN",      address: "400 Main St, Knoxville, TN 37902",              lat: 35.9606, lng: -83.9207 },
];

// ─── Job Data ─────────────────────────────────────────────────────────────────

const SE_JOBS = [
  { title: "AC unit not cooling — needs inspection",       category: "hvac",             urgency: "high",   budget: "$150–$400",  description: "Central AC stopped blowing cold air. House is 2,400 sq ft. Unit is 8 years old. Need someone to diagnose and quote repair or replacement." },
  { title: "Roof leak above master bedroom",               category: "roofing",          urgency: "high",   budget: "$300–$800",  description: "Water dripping during rain from ceiling in master bedroom. Roof is 12 years old with asphalt shingles. Need inspection and repair ASAP." },
  { title: "Kitchen faucet dripping — constant leak",      category: "plumbing",         urgency: "medium", budget: "$80–$200",   description: "Kitchen faucet drips all day long. Hot side seems worse. Delta single-handle model. Need repair or full replacement." },
  { title: "Electrical panel upgrade 100A → 200A",         category: "electrical",       urgency: "medium", budget: "$1200–$2000", description: "Current 100A panel is maxing out. Want to upgrade to 200A service to support new EV charger and hot tub. Pull permit, full job." },
  { title: "Lawn mowing + edging — weekly service",        category: "landscaping",      urgency: "low",    budget: "$50–$80/visit", description: "Need weekly lawn service for 0.3 acre lot. Mowing, edging sidewalks and driveway, blowing clippings. Looking for recurring weekly contractor." },
  { title: "Interior painting — 3 bedrooms",               category: "painting",         urgency: "low",    budget: "$800–$1500", description: "Need 3 bedrooms painted. Two coats, walls only (not ceilings). Provide paint or deduct from price. Colors TBD — neutral tones." },
  { title: "Deep clean before move-in",                    category: "cleaning",         urgency: "medium", budget: "$200–$400",  description: "Newly purchased home needs full deep clean before we move in. 4BR/2BA, approx 1,800 sq ft. Includes oven, fridge, all bathrooms." },
  { title: "Check engine light on — 2019 Honda Civic",     category: "auto_repair",      urgency: "medium", budget: "$100–$350",  description: "Check engine light came on two days ago. Car runs fine but light is steady on. Need diagnostic scan and repair quote." },
  { title: "Hardwood floor refinishing — living + dining", category: "flooring",         urgency: "low",    budget: "$600–$1200", description: "Original hardwood floors (oak, ~600 sq ft total) need sanding and refinishing. Several deep scratches near entryway. Want satin finish." },
  { title: "Pest control — ants and roaches throughout",   category: "pest_control",     urgency: "high",   budget: "$150–$300",  description: "German roaches spotted in kitchen and bathrooms. Also seeing fire ants coming in through gaps near doors. Need full interior/exterior treatment." },
  { title: "Drywall repair — water damage from leak",      category: "drywall",          urgency: "medium", budget: "$200–$500",  description: "Water damage left two soft spots in ceiling (each about 2x2 ft) and one wall section. Need drywall cut out, replaced, taped, mudded, ready to paint." },
  { title: "Water heater replacement — unit is 15 yrs old",category: "plumbing",         urgency: "medium", budget: "$600–$1100", description: "Tank water heater is 15 years old and starting to rust at the base. Want to replace with 50-gallon natural gas unit. Remove old, install new, bring to code." },
  { title: "Fence installation — 150 linear ft wood privacy", category: "fencing",      urgency: "low",    budget: "$1500–$3000", description: "Need 150 linear feet of 6-ft wood privacy fence installed along back and side of property. Replace existing chain link. Provide material + labor quote." },
  { title: "Pressure washing — driveway and back patio",   category: "pressure_washing", urgency: "low",    budget: "$100–$250",  description: "Driveway (double, about 600 sq ft) and back patio (400 sq ft concrete) need pressure washing. Mildew and dirt buildup from past year." },
  { title: "Smart thermostat install + HVAC tune-up",      category: "hvac",             urgency: "low",    budget: "$100–$300",  description: "Want a Nest or Ecobee installed and HVAC system serviced before summer. Change filters, check refrigerant, clean coils, calibrate thermostat." },
  { title: "Gutter cleaning + downspout inspection",       category: "gutter_cleaning",  urgency: "medium", budget: "$100–$200",  description: "Single-story home, about 180 linear ft of gutters. Full of pine needles and leaves. Need cleaning + check downspouts are clear before rainy season." },
  { title: "Tree removal — large oak near driveway",       category: "tree_service",     urgency: "medium", budget: "$800–$2000", description: "Large oak tree (approx 60 ft, 24\" trunk diameter) leaning toward driveway. Need full removal including stump grinding. Access via side gate." },
  { title: "Window cleaning — full house, 18 windows",     category: "window_cleaning",  urgency: "low",    budget: "$150–$300",  description: "18 windows total (single story + 4 second-floor windows accessible by ladder). Inside and outside, screens included." },
  { title: "Appliance repair — dryer takes 2 cycles",      category: "appliance_repair", urgency: "medium", budget: "$80–$250",   description: "Samsung electric dryer takes two full cycles to dry a load. Lint trap cleaned. Vent recently checked. Probably heating element. Need diagnosis and repair." },
  { title: "General handyman — honey-do list (6 items)",   category: "general_handyman", urgency: "low",    budget: "$150–$300",  description: "6 small jobs: fix sticky back door, patch 3 nail holes, tighten loose stair railing, re-caulk master bath tub, replace 2 outdoor light fixtures, install door sweep." },
];

// ─── Contractor Trade Specialties ─────────────────────────────────────────────

const CONTRACTOR_PROFILES = [
  { name: "Marcus Thompson",  specialty: ["hvac", "electrical"],                  bio: "15 years HVAC & electrical. Licensed in GA and FL. EPA certified.",              city: "Atlanta, GA",      rating: 4.9 },
  { name: "Carlos Rivera",    specialty: ["plumbing", "general_handyman"],         bio: "Master plumber, 12 years experience. Residential and light commercial.",         city: "Miami, FL",        rating: 4.8 },
  { name: "DeShawn Williams", specialty: ["roofing", "gutter_cleaning"],           bio: "Roofing contractor since 2008. GAF certified. Storm damage specialist.",          city: "Charlotte, NC",    rating: 4.7 },
  { name: "Brandon Lee",      specialty: ["painting", "drywall"],                  bio: "Interior/exterior painter and drywall pro. Clean, precise work guaranteed.",      city: "Nashville, TN",    rating: 4.8 },
  { name: "Tyrone Jackson",   specialty: ["landscaping", "tree_service", "fencing"], bio: "Full-service landscaping. Licensed arborist. Fence install + removal.",        city: "Jacksonville, FL", rating: 4.6 },
  { name: "Miguel Santos",    specialty: ["flooring", "carpentry"],                bio: "Hardwood, tile, and LVP flooring specialist. 10+ years of installs.",            city: "Orlando, FL",      rating: 4.9 },
  { name: "James Crawford",   specialty: ["electrical", "smart_home_install"],     bio: "Licensed electrician. Panel upgrades, EV chargers, smart home setup.",           city: "Tampa, FL",        rating: 4.7 },
  { name: "Kevin Patel",      specialty: ["cleaning", "pressure_washing"],         bio: "Residential and commercial cleaning. Fully insured, bonded, background checked.", city: "Raleigh, NC",      rating: 4.9 },
  { name: "Antoine Dupree",   specialty: ["plumbing", "hvac"],                     bio: "Dual-licensed plumber and HVAC tech. Based in New Orleans metro area.",           city: "New Orleans, LA",  rating: 4.5 },
  { name: "Robert King",      specialty: ["auto_repair"],                          bio: "ASE certified master mechanic. Mobile repair service throughout Memphis metro.",   city: "Memphis, TN",      rating: 4.8 },
  { name: "Jerome Bailey",    specialty: ["roofing", "pressure_washing"],          bio: "Roofing and exterior cleaning. Fully licensed and insured in Alabama.",           city: "Birmingham, AL",   rating: 4.6 },
  { name: "Travis Scott",     specialty: ["pest_control", "general_handyman"],     bio: "Licensed pest control operator. Also handle small handyman repairs.",             city: "Savannah, GA",     rating: 4.7 },
  { name: "William Foster",   specialty: ["carpentry", "fencing", "drywall"],      bio: "Custom carpentry and finish work. Fence builds, drywall repairs.",                city: "Charleston, SC",   rating: 4.8 },
  { name: "Darius Moore",     specialty: ["appliance_repair", "hvac"],             bio: "Factory-trained appliance tech. Also handle HVAC maintenance and tune-ups.",      city: "Columbia, SC",     rating: 4.6 },
  { name: "Nathaniel Price",  specialty: ["tree_service", "landscaping"],          bio: "ISA certified arborist. Full tree removal, trimming, landscaping design.",        city: "Knoxville, TN",    rating: 4.9 },
  { name: "Isaiah Grant",     specialty: ["window_cleaning", "gutter_cleaning", "pressure_washing"], bio: "Exterior cleaning specialist. Fully insured, great reviews.", city: "Atlanta, GA",      rating: 4.7 },
  { name: "Chris Morgan",     specialty: ["electrical", "appliance_repair"],       bio: "Electrician and appliance repair pro. Same-day service available.",               city: "Charlotte, NC",    rating: 4.5 },
  { name: "David Chen",       specialty: ["flooring", "painting", "drywall"],      bio: "Interior finishing specialist. Flooring, paint, drywall — one contractor.",       city: "Tampa, FL",        rating: 4.8 },
  { name: "Elijah Washington",specialty: ["plumbing", "water_heater"],             bio: "Plumbing specialist. Water heater replacement expert, same-day availability.",     city: "Orlando, FL",      rating: 4.7 },
  { name: "Samuel Harris",    specialty: ["general_handyman", "carpentry", "painting"], bio: "Master handyman. No job too small. Quality work, fair prices.",             city: "Nashville, TN",    rating: 4.6 },
];

const CONSUMER_PROFILES = [
  { name: "Jennifer Adams",  city: "Atlanta, GA",      address: "512 Peachtree St NE, Atlanta, GA 30308",    lat: 33.7749, lng: -84.3963 },
  { name: "Michelle Carter", city: "Miami, FL",         address: "1450 Brickell Ave, Miami, FL 33131",         lat: 25.7617, lng: -80.1918 },
  { name: "Patrick Sullivan",city: "Charlotte, NC",     address: "333 Trade St, Charlotte, NC 28202",          lat: 35.2271, lng: -80.8431 },
  { name: "Angela Brooks",   city: "Nashville, TN",     address: "200 Broadway, Nashville, TN 37201",          lat: 36.1627, lng: -86.7816 },
  { name: "Ronald Davis",    city: "Jacksonville, FL",  address: "100 N Laura St, Jacksonville, FL 32202",     lat: 30.3322, lng: -81.6557 },
];

const BID_MESSAGES = [
  "I can get this done quickly and professionally. Available this week. Price includes all materials and labor.",
  "Licensed and insured with 10+ years in this area. This price covers full job completion with a 1-year workmanship guarantee.",
  "I specialize in this type of work. Can start as early as tomorrow. Happy to do a free walkthrough before starting.",
  "Fully licensed in your state. This is a fair market price for this scope. References available on request.",
  "I've done 50+ of these in the past year. My price is firm and includes cleanup. No hidden fees.",
  "Local contractor, know the codes in your area. This quote is all-in. Ready to schedule when you are.",
  "Just finished a similar job nearby — have the equipment already loaded. Can give you the best rate in the area.",
  "I take pride in my work and stand behind it. This quote covers materials, labor, and a 6-month guarantee.",
];

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting Southeast Region Seed...\n");

  const consumerIds: string[] = [];
  const contractorIds: string[] = [];
  const jobIds: string[] = [];

  // ── Step 1: Create Consumers ─────────────────────────────────────────────────
  console.log("👥 Creating 5 Southeast consumers...");
  for (let i = 0; i < CONSUMER_PROFILES.length; i++) {
    const p = CONSUMER_PROFILES[i];
    const userId = uid();
    const email = `se.consumer${i + 1}@trovaar-test.com`;

    // Check if already exists
    const existing = await q("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      console.log(`  ⚠️  Consumer ${email} already exists — skipping`);
      consumerIds.push(existing.rows[0].id);
      continue;
    }

    await q(`
      INSERT INTO users (id, email, password_hash, name, role, location, latitude, longitude, email_verified, account_number, created_at)
      VALUES ($1,$2,$3,$4,'consumer',$5,$6,$7,1,$8,NOW())
    `, [userId, email, HASH, p.name, p.address, p.lat, p.lng, `SE-C${String(i+1).padStart(4,'0')}`]);

    consumerIds.push(userId);
    console.log(`  ✅ ${p.name} (${p.city})`);
  }

  // ── Step 2: Create Contractors ────────────────────────────────────────────────
  console.log("\n🔧 Creating 20 Southeast contractors...");
  for (let i = 0; i < CONTRACTOR_PROFILES.length; i++) {
    const p = CONTRACTOR_PROFILES[i];
    const userId = uid();
    const email = `se.contractor${i + 1}@trovaar-test.com`;
    const loc = SE_LOCATIONS.find(l => l.city === p.city) || SE_LOCATIONS[0];

    // Check if already exists
    const existing = await q("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      contractorIds.push(existingId);
      // Ensure contractor profile exists even for previously created users
      await q(`
        INSERT INTO contractor_profiles (user_id, categories, bio, years_experience, rating, rating_count, verification_status, service_radius_miles, created_at)
        VALUES ($1,$2,$3,$4,$5,0,'verified',40,NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [existingId, JSON.stringify(p.specialty), p.bio, rand(5, 18), p.rating]);
      console.log(`  ⚠️  Contractor ${email} already exists — skipping`);
      continue;
    }

    await q(`
      INSERT INTO users (id, email, password_hash, name, role, location, latitude, longitude, email_verified, account_number, created_at)
      VALUES ($1,$2,$3,$4,'contractor',$5,$6,$7,1,$8,NOW())
    `, [userId, email, HASH, p.name, loc.address, loc.lat, loc.lng, `SE-T${String(i+1).padStart(4,'0')}`]);

    // Create contractor profile
    await q(`
      INSERT INTO contractor_profiles (user_id, categories, bio, years_experience, rating, rating_count, verification_status, service_radius_miles, created_at)
      VALUES ($1,$2,$3,$4,$5,0,'verified',40,NOW())
      ON CONFLICT (user_id) DO NOTHING
    `, [userId, JSON.stringify(p.specialty), p.bio, rand(5, 18), p.rating]);

    contractorIds.push(userId);
    console.log(`  ✅ ${p.name} — ${p.specialty.join(', ')} (${p.city})`);
  }

  // ── Step 3: Create 20 Jobs ────────────────────────────────────────────────────
  console.log("\n📋 Creating 20 Southeast jobs...");
  for (let i = 0; i < SE_JOBS.length; i++) {
    const job = SE_JOBS[i];
    const loc = SE_LOCATIONS[i % SE_LOCATIONS.length];
    const consumerId = consumerIds[i % consumerIds.length];
    const jobId = uid();

    const existing = await q("SELECT id FROM jobs WHERE title = $1 AND consumer_id = $2", [job.title, consumerId]);
    if (existing.rows.length > 0) {
      console.log(`  ⚠️  Job "${job.title.substring(0,40)}..." already exists — skipping`);
      jobIds.push(existing.rows[0].id);
      continue;
    }

    await q(`
      INSERT INTO jobs (
        id, consumer_id, title, description, category, location,
        urgency, status, latitude, longitude, budget_range,
        expires_at, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,'posted',$8,$9,$10,
        $11, $12, $12
      )
    `, [
      jobId, consumerId, job.title, job.description, job.category, loc.address,
      job.urgency, loc.lat, loc.lng, job.budget,
      daysFromNow(30),
      daysAgo(rand(0, 5))
    ]);

    jobIds.push(jobId);
    console.log(`  ✅ [${loc.city}] ${job.title.substring(0, 50)}...`);
  }

  // ── Step 4: Contractors Bid on Jobs ───────────────────────────────────────────
  console.log("\n💰 Having 20 contractors bid on jobs...");
  let totalBids = 0;

  for (let jobIdx = 0; jobIdx < jobIds.length; jobIdx++) {
    const jobId = jobIds[jobIdx];
    const job = SE_JOBS[jobIdx];
    const numBids = rand(2, 4); // 2-4 bids per job

    // Find contractors that match this job's category
    const matchingContractors = CONTRACTOR_PROFILES
      .map((p, idx) => ({ ...p, idx }))
      .filter(p => p.specialty.some(s => s === job.category || job.category.includes(s) || s.includes(job.category)));

    // Fill with random contractors if not enough matching ones
    const allWithIdx = CONTRACTOR_PROFILES.map((p, idx) => ({ ...p, idx }));
    const pool_contractors = matchingContractors.length >= numBids
      ? matchingContractors
      : [...matchingContractors, ...allWithIdx.filter(p => !matchingContractors.includes(p))];

    const bidderIndices = new Set<number>();
    const selectedBidders: typeof pool_contractors = [];
    for (const contractor of pool_contractors) {
      if (selectedBidders.length >= numBids) break;
      if (!bidderIndices.has(contractor.idx)) {
        bidderIndices.add(contractor.idx);
        selectedBidders.push(contractor);
      }
    }

    for (const bidder of selectedBidders) {
      const contractorId = contractorIds[bidder.idx];
      if (!contractorId) continue;

      // Extract rough price range from budget string (e.g. "$150–$400" → 150–400)
      const budgetMatch = job.budget.replace(/[^0-9–\-]/g, '').split(/[–\-]/);
      const minPrice = parseInt(budgetMatch[0]) || 100;
      const maxPrice = parseInt(budgetMatch[1]) || minPrice * 2;
      const price = rand(Math.floor(minPrice * 0.9), Math.floor(maxPrice * 1.1));

      const bidId = uid();
      const existing = await q("SELECT id FROM bids WHERE job_id=$1 AND contractor_id=$2", [jobId, contractorId]);
      if (existing.rows.length > 0) continue;

      await q(`
        INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())
      `, [
        bidId, jobId, contractorId,
        price * 100, // store in cents
        rand(1, 7),
        daysFromNow(rand(1, 5)),
        pick(BID_MESSAGES),
      ]);

      totalBids++;
    }

    // Update job status to 'bidding' since it has bids
    await q("UPDATE jobs SET status='bidding' WHERE id=$1", [jobId]);
    console.log(`  ✅ Job ${jobIdx + 1}/20 — ${selectedBidders.length} bids placed`);
  }

  console.log(`\n  Total bids created: ${totalBids}`);

  // ── Step 5: Verification Tests ────────────────────────────────────────────────
  console.log("\n🧪 Running verification tests...\n");
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    try {
      const result = await fn();
      if (result) {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } else {
        console.log(`  ❌ FAIL: ${name}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ERROR: ${name} — ${(err as Error).message}`);
      failed++;
    }
  }

  // T1: All 5 consumers were created
  await test("5 SE consumer accounts exist", async () => {
    const res = await q("SELECT COUNT(*) FROM users WHERE email LIKE 'se.consumer%@trovaar-test.com' AND role='consumer'");
    return parseInt(res.rows[0].count) >= 5;
  });

  // T2: All 20 contractors were created
  await test("20 SE contractor accounts exist", async () => {
    const res = await q("SELECT COUNT(*) FROM users WHERE email LIKE 'se.contractor%@trovaar-test.com' AND role='contractor'");
    return parseInt(res.rows[0].count) >= 20;
  });

  // T3: All 20 jobs were created
  await test("20 SE jobs exist in database", async () => {
    const res = await q("SELECT COUNT(*) FROM jobs WHERE id = ANY($1)", [jobIds]);
    return parseInt(res.rows[0].count) >= 20;
  });

  // T4: All jobs are in SE locations
  await test("All jobs have SE coordinates (lat 24–37, lng -91 to -75)", async () => {
    const res = await q("SELECT COUNT(*) FROM jobs WHERE id = ANY($1) AND latitude BETWEEN 24 AND 37 AND longitude BETWEEN -91 AND -75", [jobIds]);
    return parseInt(res.rows[0].count) >= 20;
  });

  // T5: Every job has at least 2 bids
  await test("Every job has at least 2 bids", async () => {
    const res = await q(`
      SELECT COUNT(DISTINCT j.id) as jobs_with_2plus
      FROM jobs j
      WHERE j.id = ANY($1)
      AND (SELECT COUNT(*) FROM bids b WHERE b.job_id = j.id) >= 2
    `, [jobIds]);
    return parseInt(res.rows[0].jobs_with_2plus) >= 20;
  });

  // T6: All jobs are in 'bidding' status
  await test("All 20 jobs have status = 'bidding'", async () => {
    const res = await q("SELECT COUNT(*) FROM jobs WHERE id = ANY($1) AND status='bidding'", [jobIds]);
    return parseInt(res.rows[0].count) >= 20;
  });

  // T7: All bids are pending
  await test("All bids have status = 'pending'", async () => {
    const res = await q("SELECT COUNT(*) FROM bids WHERE job_id = ANY($1) AND status != 'pending'", [jobIds]);
    return parseInt(res.rows[0].count) === 0;
  });

  // T8: No duplicate bids (one bid per contractor per job)
  await test("No duplicate bids (1 bid per contractor per job)", async () => {
    const res = await q(`
      SELECT COUNT(*) FROM (
        SELECT job_id, contractor_id, COUNT(*) as cnt
        FROM bids WHERE job_id = ANY($1)
        GROUP BY job_id, contractor_id
        HAVING COUNT(*) > 1
      ) dupes
    `, [jobIds]);
    return parseInt(res.rows[0].count) === 0;
  });

  // T9: All bids have valid prices (stored in cents, > 0)
  await test("All bids have valid prices (> $0)", async () => {
    const res = await q("SELECT COUNT(*) FROM bids WHERE job_id = ANY($1) AND price <= 0", [jobIds]);
    return parseInt(res.rows[0].count) === 0;
  });

  // T10: Contractor profiles exist for all contractors
  await test("All 20 contractors have contractor_profiles records", async () => {
    const res = await q("SELECT COUNT(*) FROM contractor_profiles WHERE user_id = ANY($1)", [contractorIds]);
    return parseInt(res.rows[0].count) >= 20;
  });

  // T11: Jobs cover multiple SE cities (at least 5 different locations)
  await test("Jobs span at least 5 different SE cities", async () => {
    const res = await q("SELECT COUNT(DISTINCT location) FROM jobs WHERE id = ANY($1)", [jobIds]);
    return parseInt(res.rows[0].count) >= 5;
  });

  // T12: Jobs cover multiple categories (at least 8 different ones)
  await test("Jobs span at least 8 different service categories", async () => {
    const res = await q("SELECT COUNT(DISTINCT category) FROM jobs WHERE id = ANY($1)", [jobIds]);
    return parseInt(res.rows[0].count) >= 8;
  });

  // T13: Verify consumer → job relationship integrity
  await test("All jobs are linked to valid consumer accounts", async () => {
    const res = await q(`
      SELECT COUNT(*) FROM jobs j
      WHERE j.id = ANY($1)
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = j.consumer_id AND u.role = 'consumer')
    `, [jobIds]);
    return parseInt(res.rows[0].count) === 0;
  });

  // T14: Verify contractor → bid relationship integrity
  await test("All bids are linked to valid contractor accounts", async () => {
    const res = await q(`
      SELECT COUNT(*) FROM bids b
      WHERE b.job_id = ANY($1)
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.contractor_id AND u.role = 'contractor')
    `, [jobIds]);
    return parseInt(res.rows[0].count) === 0;
  });

  // T15: Total bid count is reasonable (at least 40 bids for 20 jobs)
  await test(`Total bids >= 40 (got ${totalBids})`, async () => {
    const res = await q("SELECT COUNT(*) FROM bids WHERE job_id = ANY($1)", [jobIds]);
    return parseInt(res.rows[0].count) >= 40;
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(55));

  // Get final stats
  const statsRes = await q(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE email LIKE 'se.%@trovaar-test.com' AND role='consumer') as consumers,
      (SELECT COUNT(*) FROM users WHERE email LIKE 'se.%@trovaar-test.com' AND role='contractor') as contractors,
      (SELECT COUNT(*) FROM jobs WHERE id = ANY($1)) as jobs,
      (SELECT COUNT(*) FROM bids WHERE job_id = ANY($1)) as bids,
      (SELECT ROUND(AVG(bid_count),1) FROM (SELECT COUNT(*) as bid_count FROM bids WHERE job_id = ANY($1) GROUP BY job_id) t) as avg_bids_per_job,
      (SELECT ROUND(AVG(price::numeric)/100,2) FROM bids WHERE job_id = ANY($1)) as avg_bid_dollars
  `, [jobIds]);

  const s = statsRes.rows[0];
  console.log(`\n📊 Final Stats:`);
  console.log(`   Consumers:       ${s.consumers}`);
  console.log(`   Contractors:     ${s.contractors}`);
  console.log(`   Jobs:            ${s.jobs}`);
  console.log(`   Total Bids:      ${s.bids}`);
  console.log(`   Avg bids/job:    ${s.avg_bids_per_job}`);
  console.log(`   Avg bid amount:  $${s.avg_bid_dollars}`);

  console.log(`\n🎯 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All tests passed! Southeast region is live and fully functional.\n");
  } else {
    console.log(`⚠️  ${failed} test(s) failed. See above for details.\n`);
  }

  console.log(`\n🔑 Login credentials for SE test accounts:`);
  console.log(`   Email:    se.consumer1@trovaar-test.com  (or consumer2–5)`);
  console.log(`   Email:    se.contractor1@trovaar-test.com (or contractor2–20)`);
  console.log(`   Password: Southeast2024!\n`);

  await pool.end();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
