/**
 * Mini Load Test Seed Script
 * Adds 20 clients (client101-120) + 20 contractors (contractor101-120) + 3 jobs each
 * Run: npx tsx scripts/seed-mini-test.ts
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

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

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const passwordHash = bcrypt.hashSync("password123", 10);

const firstNames = [
  "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
];
const lastNames = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
];

const cities = [
  { name: "Austin", state: "TX", lat: 30.2672, lng: -97.7431 },
  { name: "Dallas", state: "TX", lat: 32.7767, lng: -96.7970 },
  { name: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.0740 },
  { name: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  { name: "Atlanta", state: "GA", lat: 33.7490, lng: -84.3880 },
  { name: "Miami", state: "FL", lat: 25.7617, lng: -80.1918 },
  { name: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { name: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  { name: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816 },
  { name: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  { name: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936 },
  { name: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  { name: "Orlando", state: "FL", lat: 28.5383, lng: -81.3792 },
  { name: "Tampa", state: "FL", lat: 27.9506, lng: -82.4572 },
  { name: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382 },
  { name: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.2650 },
  { name: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398 },
  { name: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988 },
];

const categories = [
  "auto_repair","plumbing","electrical","hvac","painting",
  "landscaping","roofing","fencing","cleaning","handyman",
];
const categoryNames: Record<string, string> = {
  auto_repair: "Auto Repair", plumbing: "Plumbing", electrical: "Electrical",
  hvac: "HVAC", painting: "Painting", landscaping: "Landscaping",
  roofing: "Roofing", fencing: "Fencing", cleaning: "Cleaning", handyman: "Handyman",
};
const jobTemplates: Record<string, Array<{ title: string; desc: string; minPrice: number; maxPrice: number }>> = {
  auto_repair: [
    { title: "Brake Pads Replacement", desc: "Need front and rear brake pads replaced. Squeaking when braking.", minPrice: 15000, maxPrice: 35000 },
    { title: "AC Not Blowing Cold", desc: "Car AC stopped blowing cold air. May need recharge.", minPrice: 10000, maxPrice: 45000 },
    { title: "Check Engine Light On", desc: "Check engine light on. Need diagnostic and repair.", minPrice: 8000, maxPrice: 30000 },
  ],
  plumbing: [
    { title: "Leaking Kitchen Faucet", desc: "Kitchen faucet drips constantly. May need cartridge replacement.", minPrice: 8000, maxPrice: 25000 },
    { title: "Clogged Main Drain", desc: "Slow drainage throughout the house. Need main line cleared.", minPrice: 15000, maxPrice: 40000 },
    { title: "Water Heater Replacement", desc: "50-gallon water heater leaking. Need replacement.", minPrice: 80000, maxPrice: 200000 },
  ],
  electrical: [
    { title: "Install Ceiling Fan", desc: "Replace light fixture with ceiling fan in bedroom.", minPrice: 10000, maxPrice: 25000 },
    { title: "Panel Upgrade", desc: "Need electrical panel upgraded from 100A to 200A.", minPrice: 150000, maxPrice: 350000 },
    { title: "Outdoor Lighting", desc: "Install landscape lighting along driveway.", minPrice: 20000, maxPrice: 60000 },
  ],
  hvac: [
    { title: "AC Not Cooling", desc: "Central AC running but not cooling house.", minPrice: 15000, maxPrice: 50000 },
    { title: "Furnace Inspection", desc: "Need annual furnace tune-up before winter.", minPrice: 8000, maxPrice: 15000 },
    { title: "Ductwork Cleaning", desc: "Ducts not cleaned in 5+ years. Allergies worsening.", minPrice: 20000, maxPrice: 50000 },
  ],
  painting: [
    { title: "Interior Room Paint", desc: "Paint living room and dining room. ~800 sq ft.", minPrice: 30000, maxPrice: 80000 },
    { title: "Exterior House Paint", desc: "2-story home exterior needs full repaint.", minPrice: 200000, maxPrice: 600000 },
    { title: "Cabinet Refinishing", desc: "Kitchen cabinets need sanding and repainting.", minPrice: 150000, maxPrice: 400000 },
  ],
  landscaping: [
    { title: "Weekly Lawn Maintenance", desc: "Weekly mowing, edging for 1/4 acre lot.", minPrice: 3000, maxPrice: 8000 },
    { title: "Tree Removal", desc: "Dead oak tree needs removal.", minPrice: 50000, maxPrice: 150000 },
    { title: "Sprinkler System Install", desc: "Install in-ground sprinkler for front/back yard.", minPrice: 200000, maxPrice: 500000 },
  ],
  roofing: [
    { title: "Roof Leak Repair", desc: "Leak over master bedroom during rain.", minPrice: 20000, maxPrice: 80000 },
    { title: "Full Roof Replacement", desc: "30-year shingles need full tear-off and replacement.", minPrice: 500000, maxPrice: 1500000 },
    { title: "Gutter Installation", desc: "Install seamless aluminum gutters.", minPrice: 80000, maxPrice: 200000 },
  ],
  fencing: [
    { title: "Privacy Fence Installation", desc: "6ft cedar privacy fence, ~150 linear feet.", minPrice: 200000, maxPrice: 600000 },
    { title: "Fence Gate Repair", desc: "Wooden gate sagging and won't close.", minPrice: 10000, maxPrice: 30000 },
    { title: "New Wood Fence", desc: "Replace chain link with wood privacy fence.", minPrice: 300000, maxPrice: 800000 },
  ],
  cleaning: [
    { title: "Deep Clean House", desc: "Full deep clean of 3-bed, 2-bath home.", minPrice: 15000, maxPrice: 40000 },
    { title: "Post-Construction Cleanup", desc: "Kitchen remodel done. Need post-construction cleaning.", minPrice: 20000, maxPrice: 50000 },
    { title: "Carpet Cleaning", desc: "All carpets need cleaning. Some pet stains.", minPrice: 10000, maxPrice: 30000 },
  ],
  handyman: [
    { title: "Furniture Assembly", desc: "3 pieces of IKEA furniture need assembly.", minPrice: 10000, maxPrice: 25000 },
    { title: "Drywall Repair", desc: "Holes in drywall from removed shelving.", minPrice: 10000, maxPrice: 30000 },
    { title: "Door Installation", desc: "Interior door needs replacement.", minPrice: 8000, maxPrice: 20000 },
  ],
};

const reviewComments = [
  "Excellent work! Very professional and clean. Would hire again.",
  "Great job, finished on time and within budget. Highly recommend.",
  "Very knowledgeable and thorough. Explained everything clearly.",
  "Did a fantastic job. Quality exceeded my expectations.",
  "Prompt, professional, and fairly priced. Couldn't be happier.",
  "Solid work. Clean job site when done. Fair pricing.",
  "Very satisfied. Professional from start to finish.",
];
const bidMessages = [
  "I have extensive experience with this type of work. Happy to discuss details.",
  "I can start this week. I use quality materials and guarantee my work.",
  "Been doing this for years. I'll get it done right the first time.",
  "Would love to take this on. I always aim for 100% customer satisfaction.",
];
const contractorBios = [
  "Licensed and insured professional with a passion for quality work.",
  "Family-owned business serving the community for over a decade.",
  "Certified specialist committed to exceeding customer expectations.",
  "Experienced tradesperson offering reliable service at fair prices.",
];

function uuid(): string { return crypto.randomUUID(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genPhone(index: number): string {
  const area = 400 + Math.floor(index / 100);
  return `${area}-${100 + (index % 100)}-${1000 + index}`;
}

console.log("🚀 Starting mini load test (20 clients + 20 contractors)...");
console.log(`   Database: ${dbPath}`);
const startTime = Date.now();

const seedAll = db.transaction(() => {
  // ─── 20 Clients ─────────────────────────────────────────────────────────
  console.log("\n📦 Creating 20 clients (client101–client120)...");
  const clientIds: string[] = [];
  const clientCities: Array<typeof cities[0]> = [];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, location, latitude, longitude,
      email_verified, phone_verified, referral_code, account_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
  `);

  for (let i = 0; i < 20; i++) {
    const id = uuid();
    const idx = i + 101; // client101 ... client120
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const email = `client${idx}@test.com`;
    const phone = genPhone(i + 400);
    const city = cities[i % cities.length];
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.lng + (Math.random() - 0.5) * 0.1;
    const refCode = `CLT${idx}`;
    const acctNum = `OJ-${String(idx).padStart(4, "0")}-MINI`;
    const createdAt = new Date(Date.now() - randInt(1, 30) * 86400000).toISOString();
    insertUser.run(id, email, passwordHash, name, "consumer", phone, `${city.name}, ${city.state}`, lat, lng, refCode, acctNum, createdAt);
    clientIds.push(id);
    clientCities.push(city);
  }
  console.log(`   ✅ 20 clients created`);

  // ─── 20 Contractors ─────────────────────────────────────────────────────
  console.log("📦 Creating 20 contractors (contractor101–contractor120)...");
  const contractorIds: string[] = [];
  const contractorCats: string[][] = [];

  const insertProfile = db.prepare(`
    INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count,
      verification_status, insurance_status, business_established, contractor_type, qualifications,
      background_check_status, service_radius_miles, completion_count, acceptance_count, insurance_verified)
    VALUES (?, ?, ?, ?, ?, ?, 'approved', 'approved', ?, ?, '[]', 'approved', 30, 0, 0, 1)
  `);
  const insertStats = db.prepare(`
    INSERT INTO contractor_stats (contractor_id, avg_response_hours, total_bids, accepted_bids)
    VALUES (?, ?, 0, 0)
  `);

  for (let i = 0; i < 20; i++) {
    const id = uuid();
    const idx = i + 101;
    const name = `${firstNames[(i + 10) % firstNames.length]} ${lastNames[(i + 10) % lastNames.length]}`;
    const email = `contractor${idx}@test.com`;
    const phone = genPhone(i + 600);
    const city = cities[i % cities.length];
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.lng + (Math.random() - 0.5) * 0.1;
    const refCode = `PRO${idx}`;
    const acctNum = `OJ-${String(idx).padStart(4, "0")}-PRO`;
    const createdAt = new Date(Date.now() - randInt(30, 180) * 86400000).toISOString();
    insertUser.run(id, email, passwordHash, name, "contractor", phone, `${city.name}, ${city.state}`, lat, lng, refCode, acctNum, createdAt);

    const numCats = randInt(2, 4);
    const myCats = [...categories].sort(() => Math.random() - 0.5).slice(0, numCats);
    contractorCats.push(myCats);

    const yrsExp = randInt(2, 20);
    const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
    insertProfile.run(id, pick(contractorBios), yrsExp, JSON.stringify(myCats), rating, randInt(5, 40), 2024 - yrsExp, Math.random() > 0.6 ? "business" : "independent");
    insertStats.run(id, Math.round(Math.random() * 4 * 10) / 10);
    contractorIds.push(id);
  }
  console.log(`   ✅ 20 contractors created`);

  // ─── 3 Jobs per Client (60 total) ───────────────────────────────────────
  console.log("📦 Creating 60 transactions (3 per client)...");

  const insertJob = db.prepare(`
    INSERT INTO jobs (id, consumer_id, title, description, category, location, latitude, longitude,
      urgency, status, payment_status, photos, contractor_confirmed, consumer_confirmed,
      before_photo_url, after_photo_url, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'paid', '[]', 1, 1, ?, ?, ?, ?, ?)
  `);
  const insertBidAccepted = db.prepare(`
    INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'accepted', ?)
  `);
  const insertBidRejected = db.prepare(`
    INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'rejected', ?)
  `);
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, job_id, sender_id, receiver_id, content, read, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, job_id, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (invoice_number, job_id, contractor_id, consumer_id, subtotal_cents, platform_fee_cents, total_cents, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)
  `);
  const insertTaxRecord = db.prepare(`
    INSERT OR IGNORE INTO tax_records (contractor_id, tax_year, total_earned_cents, total_jobs, contractor_name, contractor_email)
    VALUES (?, ?, 0, 0, '', '')
  `);
  const updateTaxRecord = db.prepare(`
    UPDATE tax_records SET total_earned_cents = total_earned_cents + ?, total_jobs = total_jobs + 1,
      contractor_name = ?, contractor_email = ?
    WHERE contractor_id = ? AND tax_year = ?
  `);
  const updateProfileStats = db.prepare(`
    UPDATE contractor_profiles SET completion_count = completion_count + 1, acceptance_count = acceptance_count + 1
    WHERE user_id = ?
  `);
  const updateContractorStats = db.prepare(`
    UPDATE contractor_stats SET total_bids = total_bids + 1, accepted_bids = accepted_bids + 1
    WHERE contractor_id = ?
  `);
  const insertClientRecord = db.prepare(`
    INSERT OR IGNORE INTO contractor_clients (contractor_id, consumer_id, first_job_date, last_job_date, total_jobs, total_earned_cents)
    VALUES (?, ?, ?, ?, 0, 0)
  `);
  const updateClientRecord = db.prepare(`
    UPDATE contractor_clients SET total_jobs = total_jobs + 1, total_earned_cents = total_earned_cents + ?, last_job_date = ?
    WHERE contractor_id = ? AND consumer_id = ?
  `);

  // Get current max invoice number
  const maxInv = db.prepare("SELECT COALESCE(MAX(CAST(REPLACE(invoice_number, 'INV-', '') AS INTEGER)), 20000) as m FROM invoices").get() as { m: number };
  let invoiceNum = maxInv.m;

  let jobCount = 0, bidCount = 0, reviewCount = 0;

  for (let ci = 0; ci < 20; ci++) {
    const clientId = clientIds[ci];
    const city = clientCities[ci];

    for (let txn = 0; txn < 3; txn++) {
      const cat = pick(categories);
      const template = pick(jobTemplates[cat]);
      const jobId = uuid();
      const daysAgo = randInt(5, 45);
      const jobCreated = new Date(Date.now() - daysAgo * 86400000);
      const jobCreatedStr = jobCreated.toISOString();
      const completed = new Date(jobCreated.getTime() + randInt(2, 10) * 86400000);
      const completedStr = completed.toISOString();
      const location = `${randInt(100, 9999)} Test St, ${city.name}, ${city.state}`;
      const lat = city.lat + (Math.random() - 0.5) * 0.1;
      const lng = city.lng + (Math.random() - 0.5) * 0.1;

      insertJob.run(jobId, clientId, template.title, template.desc, cat, location, lat, lng,
        pick(["low","medium","high"]),
        `https://picsum.photos/800/600?random=${randInt(1, 9999)}`,
        `https://picsum.photos/800/600?random=${randInt(10000, 19999)}`,
        completedStr, jobCreatedStr, completedStr);
      jobCount++;

      // Pick a winning contractor
      const eligible = contractorIds.filter((_, idx) => contractorCats[idx].includes(cat));
      const winnerId = eligible.length > 0 ? pick(eligible) : contractorIds[ci % 20];
      const winnerIdx = contractorIds.indexOf(winnerId);
      const winnerName = `${firstNames[(winnerIdx + 10) % firstNames.length]} ${lastNames[(winnerIdx + 10) % lastNames.length]}`;
      const winnerEmail = `contractor${winnerIdx + 101}@test.com`;

      const bidPrice = randInt(template.minPrice, template.maxPrice);
      const bidDate = new Date(jobCreated.getTime() + randInt(0, 2) * 86400000);
      const availDate = new Date(bidDate.getTime() + randInt(1, 5) * 86400000);

      insertBidAccepted.run(uuid(), jobId, winnerId, bidPrice, randInt(1, 7), availDate.toISOString(), pick(bidMessages), bidDate.toISOString());
      bidCount++;

      // 1 losing bid from a different contractor
      const loser = contractorIds[(winnerIdx + 1) % 20];
      const loserDate = new Date(bidDate.getTime() + randInt(1, 24) * 3600000);
      insertBidRejected.run(uuid(), jobId, loser, randInt(template.minPrice, template.maxPrice), randInt(1, 10), availDate.toISOString(), pick(bidMessages), loserDate.toISOString());
      bidCount++;

      // Review
      const reviewDate = new Date(completed.getTime() + randInt(1, 48) * 3600000);
      insertReview.run(uuid(), jobId, clientId, winnerId, Math.random() > 0.15 ? randInt(4, 5) : 3, pick(reviewComments), reviewDate.toISOString());
      reviewCount++;

      // Messages
      const numMsgs = randInt(2, 4);
      for (let m = 0; m < numMsgs; m++) {
        const fromClient = m % 2 === 0;
        const msgDate = new Date(bidDate.getTime() + m * randInt(2, 8) * 3600000);
        insertMessage.run(uuid(), jobId, fromClient ? clientId : winnerId, fromClient ? winnerId : clientId,
          fromClient ? pick(["When can you start?", "Sounds good!", "What materials do you need?"]) : pick(["I can start this week!", "All done! Please review.", "Bringing all materials."]),
          msgDate.toISOString());
      }

      // Notifications
      insertNotif.run(uuid(), clientId, "job_completed", "Job Completed", `Your ${categoryNames[cat]} job is done.`, jobId, completedStr);
      insertNotif.run(uuid(), winnerId, "bid_accepted", "Bid Accepted!", `Your bid on "${template.title}" was accepted.`, jobId, bidDate.toISOString());

      // Invoice
      invoiceNum++;
      const platformFee = Math.round(bidPrice * 0.20);
      insertInvoice.run(`INV-${invoiceNum}`, jobId, winnerId, clientId, bidPrice, platformFee, bidPrice + platformFee, completedStr);

      // Tax record
      const taxYear = completed.getFullYear();
      insertTaxRecord.run(winnerId, taxYear);
      updateTaxRecord.run(bidPrice, winnerName, winnerEmail, winnerId, taxYear);

      updateProfileStats.run(winnerId);
      updateContractorStats.run(winnerId);
      insertClientRecord.run(winnerId, clientId, jobCreatedStr, completedStr);
      updateClientRecord.run(bidPrice, completedStr, winnerId, clientId);
    }
  }

  console.log(`   ✅ ${jobCount} jobs, ${bidCount} bids, ${reviewCount} reviews created`);

  // Update ratings
  console.log("\n📊 Updating contractor ratings...");
  const updateRating = db.prepare(`
    UPDATE contractor_profiles SET
      rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE contractor_id = ?), rating),
      rating_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE contractor_id = ?), rating_count)
    WHERE user_id = ?
  `);
  for (const id of contractorIds) {
    updateRating.run(id, id, id);
  }
  console.log(`   ✅ Ratings updated for ${contractorIds.length} contractors`);
});

seedAll();

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ─── Summary ────────────────────────────────────────────────────────────────
const totalUsers      = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
const totalConsumers  = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'consumer'").get() as { c: number }).c;
const totalContractors= (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'contractor'").get() as { c: number }).c;
const totalJobs       = (db.prepare("SELECT COUNT(*) as c FROM jobs").get() as { c: number }).c;
const completedJobs   = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").get() as { c: number }).c;
const totalBids       = (db.prepare("SELECT COUNT(*) as c FROM bids").get() as { c: number }).c;
const totalReviews    = (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }).c;
const totalMessages   = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number }).c;
const totalRevenue    = (db.prepare("SELECT COALESCE(SUM(platform_fee_cents), 0) as c FROM invoices").get() as { c: number }).c;

console.log("\n" + "═".repeat(52));
console.log("📊 MINI LOAD TEST COMPLETE");
console.log("═".repeat(52));
console.log(`  This run:     20 clients + 20 contractors + 60 jobs`);
console.log("─".repeat(52));
console.log(`  Total users:  ${totalUsers} (${totalConsumers} clients + ${totalContractors} contractors)`);
console.log(`  Total jobs:   ${totalJobs} (${completedJobs} completed)`);
console.log(`  Total bids:   ${totalBids}`);
console.log(`  Total reviews:${totalReviews}`);
console.log(`  Total msgs:   ${totalMessages}`);
console.log(`  Platform rev: $${(totalRevenue / 100).toLocaleString()}`);
console.log(`  Time:         ${elapsed}s`);
console.log("═".repeat(52));
console.log("\n🔑 New test accounts (password: password123)");
console.log("   Clients:     client101@test.com ... client120@test.com");
console.log("   Contractors: contractor101@test.com ... contractor120@test.com");

db.close();
