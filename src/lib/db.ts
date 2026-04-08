import { Pool, PoolClient } from "pg";

// ─── Connection Pool ─────────────────────────────────────────────────────────

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://localhost:5432/trovaar";
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DATABASE_SSL === "false"
      ? false
      : connectionString.includes("neon.tech") || connectionString.includes("supabase")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return pool;
}

// ─── SQLite-compatible async wrapper ─────────────────────────────────────────
// Converts `?` placeholders to `$1, $2, ...` for Postgres
// Provides .all(), .get(), .run() methods matching the old SQLite API

function sqliteToPostgres(sql: string): string {
  let idx = 0;
  // Replace ? placeholders with $1, $2, etc.
  let converted = sql.replace(/\?/g, () => `$${++idx}`);
  // SQLite datetime('now') → Postgres NOW()
  converted = converted.replace(/datetime\('now'\)/gi, "NOW()");
  // SQLite datetime(col, '+N days') → Postgres (col + INTERVAL 'N days')
  converted = converted.replace(
    /datetime\(([^,]+),\s*'\+(\d+)\s+days'\)/gi,
    "($1 + INTERVAL '$2 days')"
  );
  // SQLite LIKE is case-insensitive by default; Postgres LIKE is case-sensitive
  // Use ILIKE for case-insensitive matching
  converted = converted.replace(/\bLIKE\b/g, "ILIKE");
  // SQLite INTEGER PRIMARY KEY → keep as-is (we use TEXT PRIMARY KEY)
  // SQLite boolean (0/1) works fine in Postgres with INTEGER columns
  return converted;
}

interface RunResult {
  changes: number;
  lastInsertRowid?: string | number;
}

interface PreparedStatement {
  all(...params: unknown[]): Promise<unknown[]>;
  get(...params: unknown[]): Promise<unknown | undefined>;
  run(...params: unknown[]): Promise<RunResult>;
}

export interface AsyncDatabase {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (db: AsyncDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function createPreparedStatement(
  poolOrClient: Pool | PoolClient,
  sql: string
): PreparedStatement {
  const pgSql = sqliteToPostgres(sql);

  return {
    async all(...params: unknown[]): Promise<unknown[]> {
      const result = await poolOrClient.query(pgSql, params);
      return result.rows;
    },
    async get(...params: unknown[]): Promise<unknown | undefined> {
      const result = await poolOrClient.query(pgSql, params);
      return result.rows[0];
    },
    async run(...params: unknown[]): Promise<RunResult> {
      const result = await poolOrClient.query(pgSql, params);
      return {
        changes: result.rowCount ?? 0,
        lastInsertRowid: result.rows?.[0]?.id,
      };
    },
  };
}

function createAsyncDb(poolOrClient: Pool | PoolClient): AsyncDatabase {
  return {
    prepare(sql: string): PreparedStatement {
      return createPreparedStatement(poolOrClient, sql);
    },
    async exec(sql: string): Promise<void> {
      // exec can run multiple statements — split on semicolons
      // But Postgres can handle multi-statement strings in a single query
      const pgSql = sqliteToPostgres(sql);
      await poolOrClient.query(pgSql);
    },
    async transaction<T>(fn: (db: AsyncDatabase) => Promise<T>): Promise<T> {
      const p = getPool();
      const client = await p.connect();
      try {
        await client.query("BEGIN");
        const txDb = createAsyncDb(client);
        const result = await fn(txDb);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async close(): Promise<void> {
      if (pool) {
        await pool.end();
        pool = null;
      }
    },
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

let _db: AsyncDatabase | null = null;

export function getDb(): AsyncDatabase {
  if (_db) return _db;
  _db = createAsyncDb(getPool());
  return _db;
}

// ─── Schema Initialization ───────────────────────────────────────────────────

let _initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (_initialized) return;
  const db = getDb();

  // Create all tables with Postgres-native types
  await db.exec(`
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
      referral_code TEXT,
      referred_by TEXT,
      credit_balance_cents INTEGER NOT NULL DEFAULT 0,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      phone_verify_code TEXT,
      phone_verify_expires TEXT,
      avatar_url TEXT,
      sms_bid_alerts INTEGER NOT NULL DEFAULT 0,
      senior_mode INTEGER NOT NULL DEFAULT 0,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      trusted_contractor_ids TEXT DEFAULT '[]',
      max_job_budget_cents INTEGER,
      require_verified_only INTEGER NOT NULL DEFAULT 0,
      consumer_rating REAL DEFAULT 0,
      consumer_rating_count INTEGER DEFAULT 0,
      account_number TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      instant_book_enabled INTEGER NOT NULL DEFAULT 0,
      instant_book_price INTEGER,
      license_number TEXT,
      service_radius_miles INTEGER DEFAULT 25,
      id_document_url TEXT,
      id_document_status TEXT NOT NULL DEFAULT 'none',
      headline TEXT,
      about_me TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted', 'bidding', 'accepted', 'in_progress', 'en_route', 'arrived', 'completed', 'cancelled')),
      latitude REAL,
      longitude REAL,
      emergency_fee INTEGER NOT NULL DEFAULT 0,
      expected_completion_date TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_intent_id TEXT,
      platform_fee_cents INTEGER,
      expires_at TIMESTAMPTZ,
      is_instant_book INTEGER NOT NULL DEFAULT 0,
      ai_questions TEXT,
      contractor_confirmed INTEGER NOT NULL DEFAULT 0,
      consumer_confirmed INTEGER NOT NULL DEFAULT 0,
      terms_accepted_at TEXT,
      completed_at TIMESTAMPTZ,
      before_photo_url TEXT,
      after_photo_url TEXT,
      budget_range TEXT,
      scheduled_arrival_at TIMESTAMPTZ,
      reference_links TEXT DEFAULT '[]',
      inspiration_photos TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      labor_cents INTEGER,
      materials_json TEXT,
      parts_summary TEXT,
      equipment_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'facebook')),
      provider_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      response TEXT,
      response_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      content TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      flagged INTEGER NOT NULL DEFAULT 0,
      flag_reasons TEXT,
      was_redacted INTEGER DEFAULT 0,
      redacted_original TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_contractors (
      id TEXT PRIMARY KEY,
      consumer_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(consumer_id, contractor_id),
      FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      consumer_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      stripe_payment_intent_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_orders (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      bid_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      old_price INTEGER NOT NULL,
      new_price INTEGER NOT NULL,
      old_timeline_days INTEGER,
      new_timeline_days INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      before_photo TEXT,
      after_photo TEXT,
      completion_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS earnings (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      gross_cents INTEGER NOT NULL,
      platform_fee_cents INTEGER NOT NULL DEFAULT 0,
      net_cents INTEGER NOT NULL,
      tip_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS completion_certificates (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE,
      contractor_id TEXT NOT NULL,
      consumer_id TEXT NOT NULL,
      completion_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      certificate_data TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_stats (
      contractor_id TEXT PRIMARY KEY,
      avg_response_minutes REAL DEFAULT 0,
      total_bids INTEGER DEFAULT 0,
      total_jobs_completed INTEGER DEFAULT 0,
      on_time_percentage REAL DEFAULT 100,
      badge TEXT DEFAULT 'none',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS no_show_reports (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      reported_user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence_photos TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      resolution TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_penalties (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      penalty_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      job_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      caller_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      twilio_call_sid TEXT,
      status TEXT NOT NULL DEFAULT 'initiated',
      duration_seconds INTEGER DEFAULT 0,
      recording_url TEXT,
      transcription TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_receipts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      receipt_url TEXT NOT NULL,
      amount_cents INTEGER,
      description TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS help_requests (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      description TEXT NOT NULL,
      specialty_needed TEXT,
      budget_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'filled', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS help_applications (
      id TEXT PRIMARY KEY,
      help_request_id TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      message TEXT,
      proposed_rate_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (help_request_id) REFERENCES help_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_categories (
      category TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      platform_fee_percent REAL NOT NULL DEFAULT 20.0,
      enabled INTEGER NOT NULL DEFAULT 1,
      min_bid_cents INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_alert_preferences (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      categories TEXT NOT NULL DEFAULT '[]',
      max_distance_miles INTEGER DEFAULT 50,
      min_budget_cents INTEGER DEFAULT 0,
      urgency_filter TEXT DEFAULT 'all',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_change_requests (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      new_date TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dispute_resolutions (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL,
      resolver_id TEXT NOT NULL,
      resolution_type TEXT NOT NULL,
      consumer_refund_percent REAL DEFAULT 0,
      contractor_payment_percent REAL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_jobs (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      max_participants INTEGER NOT NULL DEFAULT 10,
      min_participants INTEGER NOT NULL DEFAULT 2,
      deadline TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'recruiting' CHECK(status IN ('recruiting', 'ready', 'matched', 'in_progress', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_job_participants (
      id TEXT PRIMARY KEY,
      group_job_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(group_job_id, user_id),
      FOREIGN KEY (group_job_id) REFERENCES group_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_job_bids (
      id TEXT PRIMARY KEY,
      group_job_id TEXT NOT NULL,
      contractor_id TEXT NOT NULL,
      per_unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (group_job_id) REFERENCES group_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      interval TEXT NOT NULL DEFAULT 'month',
      visit_limit INTEGER,
      categories TEXT NOT NULL DEFAULT '[]',
      features TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      stripe_subscription_id TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'past_due', 'paused')),
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      visits_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_visits (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      job_id TEXT,
      contractor_id TEXT,
      scheduled_date TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'missed')),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'all',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'scheduled')),
      scheduled_for TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      admin_notes TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      issuer TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      document_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id TEXT,
      job_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS consumer_reviews (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      consumer_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, reviewer_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS satisfaction_claims (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      consumer_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied', 'rework')),
      admin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referral_rewards (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      reward_cents INTEGER NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'credited', 'expired')),
      credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_availability (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      UNIQUE(contractor_id, day_of_week),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_blocked_dates (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      blocked_date TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      job_id TEXT,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
      due_date TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      sent_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_clients (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      nickname TEXT,
      notes TEXT,
      total_jobs INTEGER NOT NULL DEFAULT 0,
      total_revenue_cents INTEGER NOT NULL DEFAULT 0,
      last_job_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(contractor_id, client_id),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, endpoint),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tax_records (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      gross_earnings_cents INTEGER NOT NULL DEFAULT 0,
      platform_fees_cents INTEGER NOT NULL DEFAULT 0,
      net_earnings_cents INTEGER NOT NULL DEFAULT 0,
      jobs_completed INTEGER NOT NULL DEFAULT 0,
      form_1099_issued INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(contractor_id, year),
      FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_templates (
      id TEXT PRIMARY KEY,
      consumer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'medium',
      budget_range TEXT,
      ai_questions TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes (separate statements for safety)
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_consumer ON jobs(consumer_id)",
    "CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_codes(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_contractor ON reviews(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)",
    "CREATE INDEX IF NOT EXISTS idx_saved_contractors_consumer ON saved_contractors(consumer_id)",
    "CREATE INDEX IF NOT EXISTS idx_disputes_job ON disputes(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)",
    "CREATE INDEX IF NOT EXISTS idx_tips_job ON tips(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_earnings_contractor ON earnings(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_portfolio_contractor ON portfolio_items(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_logs_job ON call_logs(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_help_requests_job ON help_requests(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)",
    "CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_certifications_contractor ON certifications(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_work_history_contractor ON work_history(contractor_id)",
    "CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)",
  ];

  for (const idx of indexes) {
    try {
      await db.exec(idx);
    } catch {
      // Index may already exist — safe to ignore
    }
  }

  _initialized = true;
}
