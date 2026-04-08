/**
 * Load Test Seed Script
 * Adds 100 clients + 100 contractors + 3 completed transactions each
 * Run: npx tsx scripts/seed-load-test.ts
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
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

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), "./data/servicerequest.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const passwordHash = bcrypt.hashSync("password123", 10);

// ─── Data pools ─────────────────────────────────────────────────────────────
const firstNames = [
  "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
  "Christopher","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
  "Donald","Ashley","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
  "Kenneth","Carol","Kevin","Amanda","Brian","Dorothy","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
  "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
  "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
  "Benjamin","Samantha","Samuel","Katherine","Gregory","Christine","Alexander","Debra","Frank","Rachel",
  "Patrick","Carolyn","Raymond","Janet","Jack","Catherine","Dennis","Maria","Jerry","Heather",
];

const lastNames = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
  "Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper",
  "Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson",
  "Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes",
  "Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez",
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
  "auto_repair", "plumbing", "electrical", "hvac", "painting",
  "landscaping", "roofing", "fencing", "cleaning", "handyman",
  "deck_patio", "garage_doors",
];

const categoryNames: Record<string, string> = {
  auto_repair: "Auto Repair & Maintenance",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  painting: "Painting",
  landscaping: "Landscaping",
  roofing: "Roofing",
  fencing: "Fencing",
  cleaning: "Cleaning",
  handyman: "Handyman",
  deck_patio: "Deck & Patio",
  garage_doors: "Garage Doors",
};

const jobTemplates: Record<string, Array<{ title: string; desc: string; minPrice: number; maxPrice: number }>> = {
  auto_repair: [
    { title: "Brake Pads Replacement", desc: "Need front and rear brake pads replaced on my sedan. Squeaking when braking.", minPrice: 15000, maxPrice: 35000 },
    { title: "AC Not Blowing Cold", desc: "Car AC stopped blowing cold air. Might need a recharge or compressor check.", minPrice: 10000, maxPrice: 45000 },
    { title: "Check Engine Light On", desc: "Check engine light came on yesterday. Need diagnostic and repair.", minPrice: 8000, maxPrice: 30000 },
  ],
  plumbing: [
    { title: "Leaking Kitchen Faucet", desc: "Kitchen faucet drips constantly. May need new cartridge or full replacement.", minPrice: 8000, maxPrice: 25000 },
    { title: "Clogged Main Drain", desc: "Slow drainage throughout the house. Need main line cleared.", minPrice: 15000, maxPrice: 40000 },
    { title: "Water Heater Replacement", desc: "50-gallon water heater is 15 years old and leaking. Need replacement.", minPrice: 80000, maxPrice: 200000 },
  ],
  electrical: [
    { title: "Install Ceiling Fan", desc: "Replace light fixture with ceiling fan in master bedroom.", minPrice: 10000, maxPrice: 25000 },
    { title: "Panel Upgrade 100A to 200A", desc: "Need electrical panel upgraded for home addition.", minPrice: 150000, maxPrice: 350000 },
    { title: "Outdoor Lighting Installation", desc: "Install landscape lighting along driveway and backyard patio.", minPrice: 20000, maxPrice: 60000 },
  ],
  hvac: [
    { title: "AC Unit Not Cooling", desc: "Central AC running but not cooling. Thermostat set to 72 but house is 82.", minPrice: 15000, maxPrice: 50000 },
    { title: "Furnace Annual Inspection", desc: "Need annual furnace tune-up before winter.", minPrice: 8000, maxPrice: 15000 },
    { title: "Ductwork Cleaning", desc: "Haven't cleaned ducts in 5+ years. Allergies getting worse.", minPrice: 20000, maxPrice: 50000 },
  ],
  painting: [
    { title: "Interior Living Room Paint", desc: "Paint living room and dining room. ~800 sq ft total. Walls and ceiling.", minPrice: 30000, maxPrice: 80000 },
    { title: "Exterior House Painting", desc: "2-story home exterior needs full repaint. Approx 2500 sq ft.", minPrice: 200000, maxPrice: 600000 },
    { title: "Cabinet Refinishing", desc: "Kitchen cabinets need sanding and repainting. 30 cabinet doors.", minPrice: 150000, maxPrice: 400000 },
  ],
  landscaping: [
    { title: "Weekly Lawn Maintenance", desc: "Need weekly mowing, edging, and blowing for 1/4 acre lot.", minPrice: 3000, maxPrice: 8000 },
    { title: "Tree Removal", desc: "Dead oak tree in backyard needs to be cut down and removed.", minPrice: 50000, maxPrice: 150000 },
    { title: "Sprinkler System Install", desc: "Install in-ground sprinkler system for front and back yard.", minPrice: 200000, maxPrice: 500000 },
  ],
  roofing: [
    { title: "Roof Leak Repair", desc: "Leak over master bedroom during rain. Need inspection and repair.", minPrice: 20000, maxPrice: 80000 },
    { title: "Full Roof Replacement", desc: "30-year shingles past their life. Need full tear-off and replacement.", minPrice: 500000, maxPrice: 1500000 },
    { title: "Gutter Installation", desc: "House has no gutters. Need seamless aluminum gutters installed.", minPrice: 80000, maxPrice: 200000 },
  ],
  fencing: [
    { title: "Privacy Fence Installation", desc: "Need 6ft cedar privacy fence around backyard. Approx 150 linear feet.", minPrice: 200000, maxPrice: 600000 },
    { title: "Fence Gate Repair", desc: "Wooden gate is sagging and won't close properly.", minPrice: 10000, maxPrice: 30000 },
    { title: "Chain Link to Wood Conversion", desc: "Replace existing chain link fence with wood privacy fence.", minPrice: 300000, maxPrice: 800000 },
  ],
  cleaning: [
    { title: "Deep Clean 3BR House", desc: "Need full deep clean of 3-bedroom, 2-bath home before move-in.", minPrice: 15000, maxPrice: 40000 },
    { title: "Post-Construction Cleanup", desc: "Kitchen remodel just finished. Need thorough post-construction cleaning.", minPrice: 20000, maxPrice: 50000 },
    { title: "Carpet Cleaning", desc: "Need all carpets cleaned in 4-bedroom home. Some pet stains.", minPrice: 10000, maxPrice: 30000 },
  ],
  handyman: [
    { title: "Assemble IKEA Furniture", desc: "Have 3 pieces of IKEA furniture that need assembly. Wardrobe, desk, bookshelf.", minPrice: 10000, maxPrice: 25000 },
    { title: "Drywall Repair", desc: "Several holes in drywall from removed shelving. Need patched and painted.", minPrice: 10000, maxPrice: 30000 },
    { title: "Door Installation", desc: "Need interior door replaced. Have the new door already.", minPrice: 8000, maxPrice: 20000 },
  ],
  deck_patio: [
    { title: "Deck Staining", desc: "12x20 wood deck needs power washing and re-staining.", minPrice: 20000, maxPrice: 60000 },
    { title: "Paver Patio Installation", desc: "Install 15x20 paver patio in backyard with seating wall.", minPrice: 300000, maxPrice: 800000 },
    { title: "Deck Railing Replacement", desc: "Replace old wood railing with composite. About 40 linear feet.", minPrice: 40000, maxPrice: 100000 },
  ],
  garage_doors: [
    { title: "Garage Door Opener Install", desc: "Need new belt-drive opener installed. Single car garage.", minPrice: 20000, maxPrice: 50000 },
    { title: "Spring Replacement", desc: "Garage door spring broke. Door won't open.", minPrice: 15000, maxPrice: 35000 },
    { title: "New Garage Door", desc: "Replace old single-car garage door with insulated steel.", minPrice: 80000, maxPrice: 200000 },
  ],
};

const reviewComments = [
  "Excellent work! Very professional and clean. Would hire again.",
  "Great job, finished on time and within budget. Highly recommend.",
  "Very knowledgeable and thorough. Explained everything clearly.",
  "Did a fantastic job. The quality exceeded my expectations.",
  "Prompt, professional, and fairly priced. Couldn't be happier.",
  "Good work overall. Minor delay but communicated well about it.",
  "Solid work. Clean job site when done. Fair pricing.",
  "Very satisfied with the results. Professional from start to finish.",
  "Above and beyond! Fixed additional issues they noticed at no extra charge.",
  "Reliable and skilled. This is my go-to pro now.",
  "Quick response time and quality workmanship. A+ service.",
  "Friendly, on time, and did great work. What more could you ask for?",
  "Professional crew, cleaned up after themselves. Very impressed.",
  "Fair price for high quality work. Already recommended to neighbors.",
  "Showed up when promised and delivered exactly what was quoted.",
];

const bidMessages = [
  "I have extensive experience with this type of work. Happy to discuss details.",
  "I can start this week. I use quality materials and guarantee my work.",
  "Been doing this for years. I'll get it done right the first time.",
  "I'm available and can give you a great price. Let me know if you have questions.",
  "This is right in my wheelhouse. I'll take great care of your project.",
  "I can handle this efficiently. My reviews speak for themselves.",
  "Would love to take this on. I always aim for 100% customer satisfaction.",
  "Competitive pricing with top-quality work. Free estimate included.",
];

const contractorBios = [
  "Licensed and insured professional with a passion for quality work.",
  "Family-owned business serving the community for over a decade.",
  "Certified specialist committed to exceeding customer expectations.",
  "Experienced tradesperson offering reliable service at fair prices.",
  "Detail-oriented professional who takes pride in every project.",
];

const qualificationTypes = [
  { type: "license", name: "State Contractor License" },
  { type: "certification", name: "EPA Section 608 Universal" },
  { type: "certification", name: "OSHA 30-Hour Safety" },
  { type: "certification", name: "ASE Master Technician" },
  { type: "license", name: "Master Electrician License" },
  { type: "license", name: "Master Plumber License" },
  { type: "certification", name: "HVAC Excellence Certification" },
  { type: "certification", name: "Lead-Safe Renovator" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, daysAgo));
  d.setHours(randInt(8, 18), randInt(0, 59), 0, 0);
  return d.toISOString();
}

function genAccountNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-4);
  return `OJ-${digits}-${randInt(1000, 9999)}`;
}

function genPhone(index: number): string {
  const area = 200 + Math.floor(index / 100);
  const mid = 100 + (index % 100);
  const last = 1000 + index;
  return `${area}-${mid}-${last}`;
}

// ─── Main Seed Logic ────────────────────────────────────────────────────────
console.log("🚀 Starting load test seed...");
console.log(`   Database: ${dbPath}`);

const startTime = Date.now();

// Wrap everything in a transaction for speed
const seedAll = db.transaction(() => {
  // ─── Create 100 Clients ─────────────────────────────────────────────────
  console.log("\n📦 Creating 100 clients...");
  const clientIds: string[] = [];
  const clientCities: Array<typeof cities[0]> = [];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, location, latitude, longitude,
      email_verified, phone_verified, referral_code, account_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
  `);

  for (let i = 0; i < 100; i++) {
    const id = uuid();
    const first = firstNames[i % firstNames.length];
    const last = lastNames[i % lastNames.length];
    const name = `${first} ${last}`;
    const email = `client${i + 1}@test.com`;
    const phone = genPhone(i);
    const city = cities[i % cities.length];
    const location = `${city.name}, ${city.state}`;
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.lng + (Math.random() - 0.5) * 0.1;
    const refCode = `CLT${String(i + 1).padStart(3, "0")}`;
    const acctNum = genAccountNumber(phone);
    const createdAt = randDate(90);

    insertUser.run(id, email, passwordHash, name, "consumer", phone, location, lat, lng, refCode, acctNum, createdAt);
    clientIds.push(id);
    clientCities.push(city);
  }
  console.log(`   ✅ 100 clients created`);

  // ─── Create 100 Contractors ─────────────────────────────────────────────
  console.log("📦 Creating 100 contractors...");
  const contractorIds: string[] = [];
  const contractorCategories: string[][] = [];

  const insertProfile = db.prepare(`
    INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count,
      verification_status, insurance_status, business_established, contractor_type, qualifications,
      background_check_status, service_radius_miles, completion_count, acceptance_count, insurance_verified)
    VALUES (?, ?, ?, ?, ?, ?, 'approved', 'approved', ?, ?, ?, 'approved', ?, 0, 0, 1)
  `);

  const insertStats = db.prepare(`
    INSERT INTO contractor_stats (contractor_id, avg_response_hours, total_bids, accepted_bids)
    VALUES (?, ?, 0, 0)
  `);

  for (let i = 0; i < 100; i++) {
    const id = uuid();
    const first = firstNames[(i + 50) % firstNames.length];
    const last = lastNames[(i + 50) % lastNames.length];
    const name = `${first} ${last}`;
    const email = `contractor${i + 1}@test.com`;
    const phone = genPhone(i + 200);
    const city = cities[i % cities.length];
    const location = `${city.name}, ${city.state}`;
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.lng + (Math.random() - 0.5) * 0.1;
    const refCode = `PRO${String(i + 1).padStart(3, "0")}`;
    const acctNum = genAccountNumber(phone);
    const createdAt = randDate(180);

    insertUser.run(id, email, passwordHash, name, "contractor", phone, location, lat, lng, refCode, acctNum, createdAt);

    // Assign 2-4 random categories
    const numCats = randInt(2, 4);
    const shuffled = [...categories].sort(() => Math.random() - 0.5);
    const myCats = shuffled.slice(0, numCats);
    contractorCategories.push(myCats);

    const bio = pick(contractorBios);
    const yrsExp = randInt(2, 25);
    const rating = (3.5 + Math.random() * 1.5);
    const ratingCount = randInt(5, 80);
    const established = 2024 - yrsExp;
    const type = Math.random() > 0.6 ? "business" : "independent";
    const numQuals = randInt(1, 3);
    const quals = [...qualificationTypes].sort(() => Math.random() - 0.5).slice(0, numQuals);
    const radius = randInt(15, 50);

    insertProfile.run(id, bio, yrsExp, JSON.stringify(myCats), Math.round(rating * 10) / 10, ratingCount,
      established, type, JSON.stringify(quals), radius);
    insertStats.run(id, Math.round(Math.random() * 4 * 10) / 10);

    contractorIds.push(id);
  }
  console.log(`   ✅ 100 contractors created`);

  // ─── Create 3 completed transactions per client (300 total) ─────────────
  console.log("📦 Creating 300 transactions (3 per client)...");

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

  const insertBidPending = db.prepare(`
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

  let jobCount = 0;
  let bidCount = 0;
  let reviewCount = 0;
  let invoiceNum = 10000;

  for (let clientIdx = 0; clientIdx < 100; clientIdx++) {
    const clientId = clientIds[clientIdx];
    const city = clientCities[clientIdx];

    for (let txn = 0; txn < 3; txn++) {
      const cat = pick(categories);
      const templates = jobTemplates[cat];
      const template = pick(templates);

      const jobId = uuid();
      const urgency = pick(["low", "medium", "high"]);
      const location = `${randInt(100, 9999)} ${pick(["Main", "Oak", "Elm", "Cedar", "Maple", "Pine", "Birch", "Walnut"])} ${pick(["St", "Ave", "Blvd", "Dr", "Ln"])}, ${city.name}, ${city.state} ${randInt(10000, 99999)}`;
      const lat = city.lat + (Math.random() - 0.5) * 0.1;
      const lng = city.lng + (Math.random() - 0.5) * 0.1;

      const daysAgo = randInt(5, 60);
      const jobCreated = new Date();
      jobCreated.setDate(jobCreated.getDate() - daysAgo);
      const jobCreatedStr = jobCreated.toISOString();

      const completedDate = new Date(jobCreated);
      completedDate.setDate(completedDate.getDate() + randInt(2, 14));
      const completedStr = completedDate.toISOString();

      const updatedStr = completedStr;

      insertJob.run(jobId, clientId, template.title, template.desc, cat, location, lat, lng,
        urgency, "https://picsum.photos/800/600?random=" + randInt(1, 9999),
        "https://picsum.photos/800/600?random=" + randInt(10000, 19999),
        completedStr, jobCreatedStr, updatedStr);
      jobCount++;

      // Pick a winning contractor (prefer same city or nearby)
      const sameCityContractors = contractorIds.filter((_, idx) => {
        const cCity = cities[idx % cities.length];
        return cCity.name === city.name && contractorCategories[idx].includes(cat);
      });
      const eligibleContractors = sameCityContractors.length > 0
        ? sameCityContractors
        : contractorIds.filter((_, idx) => contractorCategories[idx].includes(cat));

      const winnerId = eligibleContractors.length > 0 ? pick(eligibleContractors) : contractorIds[clientIdx % 100];
      const winnerIdx = contractorIds.indexOf(winnerId);
      const winnerName = `${firstNames[(winnerIdx + 50) % firstNames.length]} ${lastNames[(winnerIdx + 50) % lastNames.length]}`;
      const winnerEmail = `contractor${winnerIdx + 1}@test.com`;

      // Winning bid
      const bidPrice = randInt(template.minPrice, template.maxPrice);
      const bidId = uuid();
      const bidDate = new Date(jobCreated);
      bidDate.setDate(bidDate.getDate() + randInt(0, 2));
      const bidDateStr = bidDate.toISOString();
      const availDate = new Date(bidDate);
      availDate.setDate(availDate.getDate() + randInt(1, 5));

      insertBidAccepted.run(bidId, jobId, winnerId, bidPrice, randInt(1, 7), availDate.toISOString(), pick(bidMessages), bidDateStr);
      bidCount++;

      // 1-2 losing bids
      const numLosers = randInt(1, 2);
      for (let l = 0; l < numLosers; l++) {
        let loserId = contractorIds[(winnerIdx + l + 1) % 100];
        if (loserId === winnerId) loserId = contractorIds[(winnerIdx + l + 5) % 100];
        const loserPrice = randInt(template.minPrice, template.maxPrice);
        const loserDate = new Date(bidDate);
        loserDate.setHours(loserDate.getHours() + randInt(1, 48));
        insertBidPending.run(uuid(), jobId, loserId, loserPrice, randInt(1, 10), availDate.toISOString(), pick(bidMessages), loserDate.toISOString());
        bidCount++;
      }

      // Review
      const rating = Math.random() > 0.15 ? randInt(4, 5) : randInt(3, 4);
      const reviewDate = new Date(completedDate);
      reviewDate.setHours(reviewDate.getHours() + randInt(1, 72));
      insertReview.run(uuid(), jobId, clientId, winnerId, rating, pick(reviewComments), reviewDate.toISOString());
      reviewCount++;

      // Messages (2-4 per job)
      const numMsgs = randInt(2, 4);
      for (let m = 0; m < numMsgs; m++) {
        const isFromClient = m % 2 === 0;
        const senderId = isFromClient ? clientId : winnerId;
        const receiverId = isFromClient ? winnerId : clientId;
        const msgDate = new Date(bidDate);
        msgDate.setHours(msgDate.getHours() + m * randInt(2, 12));
        const content = isFromClient
          ? pick(["When can you start?", "Sounds good, let's proceed.", "Can you provide more details?", "What materials do you recommend?"])
          : pick(["I can start this week!", "Here's my plan for the project.", "All done! Please check the work.", "I'll bring all materials needed."]);
        insertMessage.run(uuid(), jobId, senderId, receiverId, content, msgDate.toISOString());
      }

      // Notifications
      insertNotif.run(uuid(), clientId, "job_completed", "Job Completed", `Your ${categoryNames[cat]} job has been completed.`, jobId, completedStr);
      insertNotif.run(uuid(), winnerId, "bid_accepted", "Bid Accepted!", `Your bid on "${template.title}" was accepted.`, jobId, bidDateStr);

      // Invoice
      invoiceNum++;
      const platformFee = Math.round(bidPrice * 0.20);
      const totalCents = bidPrice + platformFee;
      insertInvoice.run(`INV-${invoiceNum}`, jobId, winnerId, clientId, bidPrice, platformFee, totalCents, completedStr);

      // Tax record
      const taxYear = completedDate.getFullYear();
      insertTaxRecord.run(winnerId, taxYear);
      updateTaxRecord.run(bidPrice, winnerName, winnerEmail, winnerId, taxYear);

      // Update contractor stats
      updateProfileStats.run(winnerId);
      updateContractorStats.run(winnerId);

      // Client record
      insertClientRecord.run(winnerId, clientId, jobCreatedStr, completedStr);
      updateClientRecord.run(bidPrice, completedStr, winnerId, clientId);
    }

    if ((clientIdx + 1) % 25 === 0) {
      console.log(`   ... ${(clientIdx + 1) * 3} / 300 transactions`);
    }
  }

  console.log(`   ✅ ${jobCount} jobs created`);
  console.log(`   ✅ ${bidCount} bids created`);
  console.log(`   ✅ ${reviewCount} reviews created`);

  // Update contractor ratings based on actual reviews
  console.log("\n📊 Recalculating contractor ratings...");
  const contractors = db.prepare("SELECT id FROM users WHERE role = 'contractor'").all() as { id: string }[];
  const updateRating = db.prepare(`
    UPDATE contractor_profiles SET
      rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE contractor_id = ?), rating),
      rating_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE contractor_id = ?), rating_count)
    WHERE user_id = ?
  `);
  for (const c of contractors) {
    updateRating.run(c.id, c.id, c.id);
  }
  console.log(`   ✅ Ratings updated for ${contractors.length} contractors`);
});

// Execute the transaction
seedAll();

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ─── Summary ──────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log("📊 LOAD TEST SEED COMPLETE");
console.log("═".repeat(50));

const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
const totalConsumers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'consumer'").get() as { c: number }).c;
const totalContractors = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'contractor'").get() as { c: number }).c;
const totalJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs").get() as { c: number }).c;
const completedJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").get() as { c: number }).c;
const totalBids = (db.prepare("SELECT COUNT(*) as c FROM bids").get() as { c: number }).c;
const totalReviews = (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }).c;
const totalMessages = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number }).c;
const totalRevenue = (db.prepare("SELECT COALESCE(SUM(platform_fee_cents), 0) as c FROM invoices").get() as { c: number }).c;

console.log(`  Users:        ${totalUsers} (${totalConsumers} clients + ${totalContractors} contractors)`);
console.log(`  Jobs:         ${totalJobs} (${completedJobs} completed)`);
console.log(`  Bids:         ${totalBids}`);
console.log(`  Reviews:      ${totalReviews}`);
console.log(`  Messages:     ${totalMessages}`);
console.log(`  Revenue:      $${(totalRevenue / 100).toLocaleString()}`);
console.log(`  Time:         ${elapsed}s`);
console.log("═".repeat(50));
console.log("\n🔑 All test accounts use password: password123");
console.log("   Client logins:     client1@test.com ... client100@test.com");
console.log("   Contractor logins: contractor1@test.com ... contractor100@test.com");

db.close();
