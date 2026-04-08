/**
 * PostgreSQL Seed Script
 * Seeds the Neon database with realistic test data
 * Run: npx tsx scripts/seed-pg.ts
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

async function query(sql: string, params: unknown[] = []) {
  return pool.query(sql, params);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hash = bcrypt.hashSync("password123", 10);

function id() { return uuidv4(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "painting", "landscaping",
  "roofing", "cleaning", "handyman", "auto-repair", "fencing",
  "flooring", "appliance-repair"
];

const LOCATIONS = [
  { city: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { city: "Dallas, TX", lat: 32.7767, lng: -96.7970 },
  { city: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { city: "San Antonio, TX", lat: 29.4241, lng: -98.4936 },
  { city: "Phoenix, AZ", lat: 33.4484, lng: -112.0740 },
  { city: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { city: "Atlanta, GA", lat: 33.7490, lng: -84.3880 },
];

const FIRST_NAMES = ["James", "Maria", "Robert", "Sarah", "Michael", "Jennifer", "David", "Lisa", "Carlos", "Emily", "Marcus", "Ashley", "Kevin", "Nicole", "Brandon", "Rachel", "Tyler", "Amanda", "Derek", "Megan"];
const LAST_NAMES = ["Johnson", "Williams", "Brown", "Davis", "Martinez", "Garcia", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Harris", "Clark", "Robinson", "Walker", "Young", "King"];

const JOB_TITLES: Record<string, string[]> = {
  plumbing: ["Leaky faucet repair", "Toilet won't flush", "Water heater replacement", "Clogged drain", "Pipe burst in basement"],
  electrical: ["Install ceiling fan", "Outlet not working", "Panel upgrade needed", "Outdoor lighting setup", "Flickering lights throughout house"],
  hvac: ["AC not cooling", "Furnace making noise", "Thermostat replacement", "Duct cleaning needed", "Heat pump installation"],
  painting: ["Interior paint - living room", "Exterior house painting", "Cabinet refinishing", "Accent wall design", "Deck staining"],
  landscaping: ["Weekly lawn mowing", "Tree trimming needed", "Sprinkler system install", "Garden bed design", "Fence line cleanup"],
  roofing: ["Roof leak repair", "Shingle replacement", "Gutter installation", "Roof inspection needed", "Skylight repair"],
  cleaning: ["Deep clean - 3BR house", "Move-out cleaning", "Office cleaning weekly", "Post-construction cleanup", "Carpet deep clean"],
  handyman: ["Assemble IKEA furniture", "Drywall patch repair", "Door won't close properly", "Shelf installation", "TV wall mount"],
  "auto-repair": ["Oil change + inspection", "Brake pads replacement", "Check engine light on", "AC not blowing cold", "Tire rotation and balance"],
  fencing: ["Privacy fence installation", "Gate repair", "Chain link fence", "Fence post replacement", "Vinyl fence quote"],
  flooring: ["Hardwood floor refinish", "Tile installation - bathroom", "Laminate flooring install", "Carpet replacement", "Vinyl plank in kitchen"],
  "appliance-repair": ["Dishwasher not draining", "Washer making loud noise", "Refrigerator not cooling", "Dryer not heating", "Oven won't heat up"],
};

const BIOS = [
  "Licensed and insured with over {years} years of experience. Customer satisfaction is my top priority.",
  "Family-owned business serving the local community for {years} years. We treat every home like our own.",
  "Certified master technician with {years} years in the trade. Free estimates on all jobs.",
  "Veteran-owned small business. {years} years of reliable, honest service. Ask about our military discount.",
  "Top-rated professional with {years} years experience. Same-day service available for emergencies.",
];

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting PostgreSQL seed...\n");

  // Clear all tables (in dependency order)
  console.log("🗑️  Clearing existing data...");
  const tables = [
    "analytics_events", "job_templates", "tax_records", "push_subscriptions",
    "contractor_blocked_dates", "contractor_availability", "work_history",
    "certifications", "support_tickets", "admin_notifications", "subscription_visits",
    "user_subscriptions", "subscription_plans", "group_job_bids", "group_job_participants",
    "group_jobs", "dispute_resolutions", "admin_audit_log", "schedule_change_requests",
    "job_alert_preferences", "admin_categories", "help_applications", "help_requests",
    "job_receipts", "call_logs", "contractor_penalties", "no_show_reports",
    "contractor_stats", "completion_certificates", "earnings", "portfolio_items",
    "change_orders", "tips", "saved_contractors", "messages", "notifications",
    "consumer_reviews", "reviews", "verification_codes", "oauth_accounts",
    "bids", "referral_rewards", "satisfaction_claims", "invoices", "contractor_clients",
    "jobs", "contractor_profiles", "disputes", "users"
  ];
  for (const t of tables) {
    try { await query(`DELETE FROM ${t}`); } catch { /* table might not exist */ }
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  console.log("👤 Creating users...");

  // Admin user
  const adminId = id();
  await query(
    `INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, is_admin, latitude, longitude, account_number, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [adminId, "admin@trovaar.com", hash, "Admin User", "consumer", "555-000-0000", "Austin, TX", 1, 1, 30.2672, -97.7431, "ACC-ADMIN-001", daysAgo(180)]
  );

  // Consumers (20)
  const consumers: { id: string; name: string; loc: typeof LOCATIONS[0] }[] = [];
  for (let i = 0; i < 20; i++) {
    const uid = id();
    const fname = FIRST_NAMES[i % FIRST_NAMES.length];
    const lname = LAST_NAMES[i % LAST_NAMES.length];
    const loc = LOCATIONS[i % LOCATIONS.length];
    const name = `${fname} ${lname}`;

    await query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, account_number, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid, `consumer${i + 1}@test.com`, hash, name, "consumer", `555-100-${String(i).padStart(4, "0")}`, loc.city, 1, loc.lat + (Math.random() - 0.5) * 0.1, loc.lng + (Math.random() - 0.5) * 0.1, `REF-C${i + 1}`, `ACC-C${String(i + 1).padStart(3, "0")}`, daysAgo(rand(30, 180))]
    );
    consumers.push({ id: uid, name, loc });
  }

  // Contractors (20)
  const contractors: { id: string; name: string; categories: string[]; loc: typeof LOCATIONS[0] }[] = [];
  for (let i = 0; i < 20; i++) {
    const uid = id();
    const fname = FIRST_NAMES[(i + 10) % FIRST_NAMES.length];
    const lname = LAST_NAMES[(i + 5) % LAST_NAMES.length];
    const loc = LOCATIONS[i % LOCATIONS.length];
    const name = `${fname} ${lname}`;
    const cats = [CATEGORIES[i % CATEGORIES.length], CATEGORIES[(i + 3) % CATEGORIES.length]];
    const years = rand(3, 25);
    const rating = (3.5 + Math.random() * 1.5).toFixed(1);
    const ratingCount = rand(5, 80);

    await query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, location, email_verified, latitude, longitude, referral_code, account_number, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid, `contractor${i + 1}@test.com`, hash, name, "contractor", `555-200-${String(i).padStart(4, "0")}`, loc.city, 1, loc.lat + (Math.random() - 0.5) * 0.1, loc.lng + (Math.random() - 0.5) * 0.1, `REF-P${i + 1}`, `ACC-P${String(i + 1).padStart(3, "0")}`, daysAgo(rand(60, 365))]
    );

    const bio = pick(BIOS).replace("{years}", String(years));
    const verification = i < 12 ? "verified" : i < 16 ? "pending" : "none";
    const bgCheck = i < 10 ? "passed" : i < 14 ? "pending" : "none";

    await query(
      `INSERT INTO contractor_profiles (user_id, bio, years_experience, categories, rating, rating_count, verification_status, insurance_status, background_check_status, contractor_type, headline, about_me, service_radius_miles, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [uid, bio, years, JSON.stringify(cats), parseFloat(rating), ratingCount, verification, i < 14 ? "verified" : "none", bgCheck, i % 3 === 0 ? "company" : "independent", `Expert ${cats[0]} professional`, bio, rand(10, 50), daysAgo(rand(60, 365))]
    );

    // Contractor stats
    await query(
      `INSERT INTO contractor_stats (contractor_id, avg_response_minutes, total_bids, total_jobs_completed, on_time_percentage, badge, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [uid, rand(5, 120), rand(20, 200), rand(10, 150), 85 + Math.random() * 15, i < 5 ? "elite" : i < 12 ? "trusted" : "none"]
    );

    contractors.push({ id: uid, name, categories: cats, loc });
  }

  console.log(`   ✅ ${consumers.length} consumers, ${contractors.length} contractors, 1 admin`);

  // ─── Jobs + Bids + Reviews ────────────────────────────────────────────────

  console.log("📋 Creating jobs, bids, reviews...");

  const allJobs: { id: string; consumerId: string; contractorId: string; category: string; status: string }[] = [];

  for (let i = 0; i < 60; i++) {
    const consumer = consumers[i % consumers.length];
    const category = pick(CATEGORIES);
    const title = pick(JOB_TITLES[category] || ["General service request"]);
    const urgency = pick(["low", "medium", "high", "emergency"]);
    const daysOld = rand(1, 90);

    // Determine status
    let status: string;
    if (i < 25) status = "completed";
    else if (i < 35) status = "in_progress";
    else if (i < 45) status = "accepted";
    else if (i < 52) status = "bidding";
    else status = "posted";

    const jobId = id();
    const budgetMin = rand(50, 500) * 100;
    const budgetMax = budgetMin + rand(100, 1000) * 100;

    await query(
      `INSERT INTO jobs (id, consumer_id, title, description, category, location, urgency, status, latitude, longitude, budget_range, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [jobId, consumer.id, title, `Need help with: ${title}. Please provide your best estimate. Located in ${consumer.loc.city}.`, category, consumer.loc.city, urgency, status, consumer.loc.lat, consumer.loc.lng, `${budgetMin}-${budgetMax}`, daysAgo(daysOld), daysAgo(Math.max(0, daysOld - 2))]
    );

    // Add 2-4 bids per job (if not just posted)
    if (status !== "posted") {
      const numBids = rand(2, 4);
      const eligibleContractors = contractors.filter(c => c.categories.includes(category) || Math.random() > 0.5);
      const bidders = eligibleContractors.slice(0, numBids);
      let winnerIdx = 0;

      for (let b = 0; b < bidders.length; b++) {
        const contractor = bidders[b];
        const bidId = id();
        const price = rand(5000, 50000);
        const bidStatus = (status !== "bidding" && b === winnerIdx) ? "accepted" : (status !== "bidding" && b !== winnerIdx) ? "rejected" : "pending";

        await query(
          `INSERT INTO bids (id, job_id, contractor_id, price, timeline_days, availability_date, message, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [bidId, jobId, contractor.id, price, rand(1, 14), daysAgo(daysOld - 1), `I can handle this ${title.toLowerCase()} job. I have extensive experience in ${category}.`, bidStatus, daysAgo(daysOld - 1)]
        );

        if (bidStatus === "accepted") {
          allJobs.push({ id: jobId, consumerId: consumer.id, contractorId: contractor.id, category, status });

          // Messages between consumer and contractor
          const msgCount = rand(2, 6);
          for (let m = 0; m < msgCount; m++) {
            const isConsumer = m % 2 === 0;
            const msgs = isConsumer
              ? ["When can you start?", "Can you send photos of similar work?", "What's included in the price?", "Sounds good, let's proceed!", "Do you offer a warranty?", "Thanks for the quick response!"]
              : ["I can start this week!", "Here's my portfolio link.", "Price includes all materials and labor.", "Great, I'll schedule you in.", "Yes, 1-year warranty on all work.", "Happy to help!"];
            await query(
              `INSERT INTO messages (id, job_id, sender_id, receiver_id, content, read, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [id(), jobId, isConsumer ? consumer.id : contractor.id, isConsumer ? contractor.id : consumer.id, pick(msgs), 1, daysAgo(daysOld - 1 - m)]
            );
          }
        }
      }
    } else {
      allJobs.push({ id: jobId, consumerId: consumer.id, contractorId: "", category, status });
    }
  }

  // Add reviews for completed jobs
  const completedJobs = allJobs.filter(j => j.status === "completed");
  for (const job of completedJobs) {
    if (job.contractorId && Math.random() > 0.2) {
      const rating = rand(3, 5);
      const comments = [
        "Excellent work! Very professional and on time.",
        "Good job overall. Would hire again.",
        "Fantastic quality work. Exceeded my expectations!",
        "Very reliable and communicative throughout the project.",
        "Did a great job. Fair pricing too.",
        "Amazing attention to detail. Highly recommend!",
        "Solid work. Cleaned up after themselves too.",
        "Professional and efficient. Five stars!",
      ];

      await query(
        `INSERT INTO reviews (id, job_id, reviewer_id, contractor_id, rating, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id(), job.id, job.consumerId, job.contractorId, rating, pick(comments), daysAgo(rand(1, 30))]
      );
    }
  }

  console.log(`   ✅ ${allJobs.length} jobs, ${completedJobs.length} completed with reviews`);

  // ─── Notifications ──────────────────────────────────────────────────────

  console.log("🔔 Creating notifications...");
  const notifTypes = [
    { type: "new_bid", title: "New Bid Received", msg: "A contractor has placed a bid on your job." },
    { type: "bid_accepted", title: "Bid Accepted!", msg: "Your bid has been accepted. Time to get to work!" },
    { type: "job_completed", title: "Job Completed", msg: "The job has been marked as complete." },
    { type: "new_message", title: "New Message", msg: "You have a new message." },
    { type: "review_received", title: "New Review", msg: "Someone left you a review!" },
  ];

  for (let i = 0; i < 50; i++) {
    const user = Math.random() > 0.5 ? pick(consumers) : pick(contractors);
    const notif = pick(notifTypes);
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id(), user.id, notif.type, notif.title, notif.msg, Math.random() > 0.3 ? 1 : 0, daysAgo(rand(0, 30))]
    );
  }
  console.log("   ✅ 50 notifications");

  // ─── Categories ─────────────────────────────────────────────────────────

  console.log("📂 Creating admin categories...");
  for (const cat of CATEGORIES) {
    const displayName = cat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    await query(
      `INSERT INTO admin_categories (category, display_name, platform_fee_percent, enabled, min_bid_cents, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT (category) DO NOTHING`,
      [cat, displayName, cat === "emergency" ? 25 : 20, 1, 2500]
    );
  }
  console.log(`   ✅ ${CATEGORIES.length} categories`);

  // ─── Earnings ───────────────────────────────────────────────────────────

  console.log("💰 Creating earnings records...");
  for (const job of completedJobs) {
    if (!job.contractorId) continue;
    const gross = rand(5000, 50000);
    const fee = Math.floor(gross * 0.2);
    await query(
      `INSERT INTO earnings (id, contractor_id, job_id, gross_cents, platform_fee_cents, net_cents, tip_cents, status, paid_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id(), job.contractorId, job.id, gross, fee, gross - fee, Math.random() > 0.5 ? rand(500, 2000) : 0, "paid", daysAgo(rand(1, 20)), daysAgo(rand(1, 30))]
    );
  }
  console.log(`   ✅ ${completedJobs.length} earning records`);

  // ─── Disputes ───────────────────────────────────────────────────────────

  console.log("⚖️  Creating disputes...");
  const disputeReasons = ["Work not completed as described", "Contractor didn't show up", "Price disagreement", "Quality issues", "Timeline not met"];
  for (let i = 0; i < 5; i++) {
    const job = completedJobs[i];
    if (!job) continue;
    await query(
      `INSERT INTO disputes (id, job_id, reporter_id, reason, details, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id(), job.id, job.consumerId, pick(disputeReasons), "I need this issue resolved. Please review.", i < 2 ? "resolved" : "open", daysAgo(rand(5, 30)), daysAgo(rand(0, 5))]
    );
  }
  console.log("   ✅ 5 disputes");

  // ─── Support Tickets ────────────────────────────────────────────────────

  console.log("🎫 Creating support tickets...");
  const ticketSubjects = ["Can't update my profile", "Payment not received", "How do I verify my account?", "Bug: photos won't upload", "Request to delete my account"];
  for (let i = 0; i < 8; i++) {
    const user = Math.random() > 0.5 ? pick(consumers) : pick(contractors);
    await query(
      `INSERT INTO support_tickets (id, user_id, subject, message, category, status, priority, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id(), user.id, ticketSubjects[i % ticketSubjects.length], "Please help with this issue. Details above.", pick(["general", "billing", "technical"]), i < 3 ? "resolved" : i < 5 ? "in_progress" : "open", pick(["low", "normal", "high"]), daysAgo(rand(1, 30))]
    );
  }
  console.log("   ✅ 8 support tickets");

  // ─── Done ───────────────────────────────────────────────────────────────

  console.log("\n🎉 Seed complete!\n");
  console.log("Test accounts (password: password123):");
  console.log("  Admin:      admin@trovaar.com");
  console.log("  Consumers:  consumer1@test.com → consumer20@test.com");
  console.log("  Contractors: contractor1@test.com → contractor20@test.com");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  pool.end();
  process.exit(1);
});
