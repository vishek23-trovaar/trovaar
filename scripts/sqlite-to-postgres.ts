/**
 * sqlite-to-postgres.ts
 *
 * One-shot migration script: reads every row from the local SQLite DB
 * and upserts it into PostgreSQL via Prisma.
 *
 * Run ONCE after `npx prisma migrate deploy` has created all tables:
 *
 *   DATABASE_URL="postgresql://..." npx ts-node --project tsconfig.scripts.json scripts/sqlite-to-postgres.ts
 *
 * Safe to re-run — every write uses upsert (createOrUpdate) so
 * duplicate runs won't create duplicate rows.
 *
 * Order matters: tables with foreign keys are imported after their
 * parent tables.
 */

import Database from "better-sqlite3";
import path from "path";
import { PrismaClient } from "@prisma/client";

// ── Setup ────────────────────────────────────────────────────────────────────

const SQLITE_PATH = path.resolve(
  process.cwd(),
  process.env.SQLITE_PATH || "./data/servicerequest.db"
);

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** SQLite stores booleans as 0/1 integers. */
function bool(v: unknown): boolean {
  return v === 1 || v === true;
}

/** SQLite stores dates as TEXT. Convert to Date or null. */
function dt(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse JSON text fields that may be null. */
function json(v: unknown) {
  if (!v || typeof v !== "string") return undefined;
  try { return JSON.parse(v); } catch { return v; }
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ── Row types (loose — mirrors SQLite columns) ────────────────────────────────

type Row = Record<string, unknown>;

// ── Migration steps ───────────────────────────────────────────────────────────

async function migrateUsers() {
  const rows = sqlite.prepare("SELECT * FROM users").all() as Row[];
  log(`Migrating ${rows.length} users…`);
  let count = 0;
  for (const r of rows) {
    await prisma.user.upsert({
      where: { id: r.id as string },
      create: {
        id:                     r.id as string,
        email:                  r.email as string,
        passwordHash:           r.password_hash as string | null ?? undefined,
        name:                   r.name as string,
        role:                   r.role as "consumer" | "contractor",
        phone:                  r.phone as string | null ?? undefined,
        location:               r.location as string | null ?? undefined,
        emailVerified:          bool(r.email_verified),
        oauthProvider:          r.oauth_provider as string | null ?? undefined,
        latitude:               r.latitude as number | null ?? undefined,
        longitude:              r.longitude as number | null ?? undefined,
        isAdmin:                bool(r.is_admin),
        referralCode:           r.referral_code as string | null ?? undefined,
        referredBy:             r.referred_by as string | null ?? undefined,
        creditBalanceCents:     (r.credit_balance_cents as number) ?? 0,
        phoneVerified:          bool(r.phone_verified),
        phoneVerifyCode:        r.phone_verify_code as string | null ?? undefined,
        phoneVerifyExpires:     dt(r.phone_verify_expires) ?? undefined,
        phoneNumber:            r.phone_number as string | null ?? undefined,
        smsAlertsEnabled:       bool(r.sms_alerts_enabled),
        isSeniorAccount:        bool(r.is_senior_account),
        familyOverseerEmail:    r.family_overseer_email as string | null ?? undefined,
        familyOversightEnabled: bool(r.family_oversight_enabled),
        accountNumber:          r.account_number as string | null ?? undefined,
        createdAt:              dt(r.created_at) ?? new Date(),
      },
      update: {},   // skip update — source of truth is SQLite during migration
    });
    count++;
  }
  log(`  ✓ ${count} users`);
}

async function migrateContractorProfiles() {
  const rows = sqlite.prepare("SELECT * FROM contractor_profiles").all() as Row[];
  log(`Migrating ${rows.length} contractor profiles…`);
  let count = 0;
  for (const r of rows) {
    await prisma.contractorProfile.upsert({
      where: { userId: r.user_id as string },
      create: {
        userId:                  r.user_id as string,
        bio:                     r.bio as string | null ?? undefined,
        yearsExperience:         (r.years_experience as number) ?? 0,
        categories:              json(r.categories) ?? [],
        profilePhoto:            r.profile_photo as string | null ?? undefined,
        rating:                  (r.rating as number) ?? 0,
        ratingCount:             (r.rating_count as number) ?? 0,
        verificationStatus:      (r.verification_status as "none"|"pending"|"approved"|"rejected") ?? "none",
        insuranceStatus:         (r.insurance_status as "none"|"pending"|"approved"|"rejected") ?? "none",
        businessEstablished:     r.business_established as number | null ?? undefined,
        portfolioPhotos:         json(r.portfolio_photos) ?? [],
        contractorType:          (r.contractor_type as "independent"|"business") ?? "independent",
        qualifications:          json(r.qualifications) ?? [],
        stripeAccountId:         r.stripe_account_id as string | null ?? undefined,
        stripeOnboardingComplete: bool(r.stripe_onboarding_complete),
        backgroundCheckStatus:   (r.background_check_status as string) ?? "none",
        instantBookEnabled:      bool(r.instant_book_enabled),
        instantBookPrice:        r.instant_book_price as number | null ?? undefined,
        licenseNumber:           r.license_number as string | null ?? undefined,
        licenseState:            r.license_state as string | null ?? undefined,
        idDocumentUrl:           r.id_document_url as string | null ?? undefined,
        idVerified:              bool(r.id_verified),
        serviceZipCodes:         r.service_zip_codes as string | null ?? undefined,
        serviceRadiusMiles:      (r.service_radius_miles as number) ?? 25,
        cancellationCount:       (r.cancellation_count as number) ?? 0,
        noShowCount:             (r.no_show_count as number) ?? 0,
        acceptanceCount:         (r.acceptance_count as number) ?? 0,
        completionCount:         (r.completion_count as number) ?? 0,
        strikeCount:             (r.strike_count as number) ?? 0,
        isSuspended:             bool(r.is_suspended),
        suspendedUntil:          dt(r.suspended_until) ?? undefined,
        insuranceDocumentUrl:    r.insurance_document_url as string | null ?? undefined,
        createdAt:               dt(r.created_at) ?? new Date(),
      },
      update: {},
    });
    count++;
  }
  log(`  ✓ ${count} contractor profiles`);
}

async function migrateJobs() {
  const rows = sqlite.prepare("SELECT * FROM jobs").all() as Row[];
  log(`Migrating ${rows.length} jobs…`);
  let count = 0;
  for (const r of rows) {
    await prisma.job.upsert({
      where: { id: r.id as string },
      create: {
        id:                   r.id as string,
        consumerId:           r.consumer_id as string,
        title:                r.title as string,
        description:          r.description as string | null ?? undefined,
        category:             r.category as string,
        photos:               json(r.photos) ?? [],
        location:             r.location as string,
        urgency:              r.urgency as "low"|"medium"|"high"|"emergency",
        status:               (r.status as string ?? "posted") as "posted"|"bidding"|"accepted"|"en_route"|"arrived"|"in_progress"|"completed"|"cancelled",
        latitude:             r.latitude as number | null ?? undefined,
        longitude:            r.longitude as number | null ?? undefined,
        emergencyFee:         (r.emergency_fee as number) ?? 0,
        expectedCompletionDate: dt(r.expected_completion_date) ?? undefined,
        paymentStatus:        (r.payment_status as string) ?? "unpaid",
        paymentIntentId:      r.payment_intent_id as string | null ?? undefined,
        platformFeeCents:     r.platform_fee_cents as number | null ?? undefined,
        expiresAt:            dt(r.expires_at) ?? undefined,
        isInstantBook:        bool(r.is_instant_book),
        aiQuestions:          json(r.ai_questions) ?? undefined,
        contractorConfirmed:  bool(r.contractor_confirmed),
        consumerConfirmed:    bool(r.consumer_confirmed),
        termsAcceptedAt:      dt(r.terms_accepted_at) ?? undefined,
        referenceLinks:       json(r.reference_links) ?? undefined,
        inspirationPhotos:    json(r.inspiration_photos) ?? undefined,
        completedAt:          dt(r.completed_at) ?? undefined,
        beforePhotoUrl:       r.before_photo_url as string | null ?? undefined,
        afterPhotoUrl:        r.after_photo_url as string | null ?? undefined,
        budgetRange:          r.budget_range as string | null ?? undefined,
        scheduledArrivalAt:   dt(r.scheduled_arrival_at) ?? undefined,
        certificateGenerated: bool(r.certificate_generated),
        firstBidAt:           dt(r.first_bid_at) ?? undefined,
        acceptedBidAt:        dt(r.accepted_bid_at) ?? undefined,
        createdAt:            dt(r.created_at) ?? new Date(),
        updatedAt:            dt(r.updated_at) ?? new Date(),
      },
      update: {},
    });
    count++;
  }
  log(`  ✓ ${count} jobs`);
}

async function migrateBids() {
  const rows = sqlite.prepare("SELECT * FROM bids").all() as Row[];
  log(`Migrating ${rows.length} bids…`);
  let count = 0;
  for (const r of rows) {
    await prisma.bid.upsert({
      where: { id: r.id as string },
      create: {
        id:               r.id as string,
        jobId:            r.job_id as string,
        contractorId:     r.contractor_id as string,
        price:            r.price as number,
        timelineDays:     r.timeline_days as number,
        availabilityDate: dt(r.availability_date) ?? new Date(),
        message:          r.message as string | null ?? undefined,
        status:           (r.status as "pending"|"accepted"|"rejected"|"withdrawn") ?? "pending",
        laborCents:       r.labor_cents as number | null ?? undefined,
        materialsJson:    json(r.materials_json) ?? undefined,
        partsSummary:     r.parts_summary as string | null ?? undefined,
        equipmentJson:    json(r.equipment_json) ?? undefined,
        createdAt:        dt(r.created_at) ?? new Date(),
      },
      update: {},
    });
    count++;
  }
  log(`  ✓ ${count} bids`);
}

async function migrateSimpleTable<T extends { id: string }>(
  tableName: string,
  modelName: string,
  transform: (r: Row) => T
) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Row[];
  log(`Migrating ${rows.length} ${tableName}…`);
  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[modelName];
  for (const r of rows) {
    const data = transform(r);
    await model.upsert({
      where: { id: data.id },
      create: data,
      update: {},
    });
    count++;
  }
  log(`  ✓ ${count} ${tableName}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  SQLite → PostgreSQL Migration");
  console.log("  Source:", SQLITE_PATH);
  console.log("=".repeat(60));

  // Order: parents before children
  await migrateUsers();
  await migrateContractorProfiles();
  await migrateJobs();
  await migrateBids();

  await migrateSimpleTable("oauth_accounts", "oauthAccount", (r) => ({
    id:             r.id as string,
    userId:         r.user_id as string,
    provider:       r.provider as string,
    providerUserId: r.provider_user_id as string,
    createdAt:      dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("verification_codes", "verificationCode", (r) => ({
    id:        r.id as string,
    userId:    r.user_id as string,
    code:      r.code as string,
    expiresAt: dt(r.expires_at) ?? new Date(),
    used:      bool(r.used),
    createdAt: dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("reviews", "review", (r) => ({
    id:           r.id as string,
    jobId:        r.job_id as string,
    reviewerId:   r.reviewer_id as string,
    contractorId: r.contractor_id as string,
    rating:       r.rating as number,
    comment:      r.comment as string | null ?? undefined,
    photos:       json(r.photos) ?? [],
    createdAt:    dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("notifications", "notification", (r) => ({
    id:        r.id as string,
    userId:    r.user_id as string,
    type:      r.type as string,
    title:     r.title as string,
    message:   r.message as string,
    jobId:     r.job_id as string | null ?? undefined,
    read:      bool(r.read),
    createdAt: dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("messages", "message", (r) => ({
    id:               r.id as string,
    jobId:            r.job_id as string,
    senderId:         r.sender_id as string,
    receiverId:       r.receiver_id as string | null ?? undefined,
    content:          r.content as string,
    read:             bool(r.read),
    flagged:          bool(r.flagged),
    flagReasons:      json(r.flag_reasons) ?? undefined,
    wasRedacted:      bool(r.was_redacted),
    redactedOriginal: r.redacted_original as string | null ?? undefined,
    createdAt:        dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("saved_contractors", "savedContractor", (r) => ({
    id:           r.id as string,
    consumerId:   r.consumer_id as string,
    contractorId: r.contractor_id as string,
    createdAt:    dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("disputes", "dispute", (r) => ({
    id:         r.id as string,
    jobId:      r.job_id as string,
    reporterId: r.reporter_id as string,
    reason:     r.reason as string,
    details:    r.details as string | null ?? undefined,
    status:     (r.status as "open"|"investigating"|"resolved"|"closed") ?? "open",
    resolution: r.resolution as string | null ?? undefined,
    createdAt:  dt(r.created_at) ?? new Date(),
    updatedAt:  dt(r.updated_at) ?? new Date(),
  }));

  await migrateSimpleTable("tips", "tip", (r) => ({
    id:                   r.id as string,
    jobId:                r.job_id as string,
    fromUserId:           (r.from_user_id ?? r.consumer_id) as string,
    toContractorId:       (r.to_contractor_id ?? r.contractor_id) as string,
    amountCents:          r.amount_cents as number,
    message:              r.message as string | null ?? undefined,
    stripePaymentIntentId: r.stripe_payment_intent_id as string | null ?? undefined,
    createdAt:            dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("change_orders", "changeOrder", (r) => ({
    id:                  r.id as string,
    jobId:               r.job_id as string,
    bidId:               r.bid_id as string,
    contractorId:        r.contractor_id as string,
    title:               r.title as string,
    description:         r.description as string,
    additionalCostCents: (r.additional_cost_cents as number) ?? 0,
    materialsJson:       json(r.materials_json) ?? undefined,
    status:              (r.status as "pending"|"approved"|"rejected") ?? "pending",
    rejectionReason:     r.rejection_reason as string | null ?? undefined,
    createdAt:           dt(r.created_at) ?? new Date(),
    updatedAt:           dt(r.updated_at) ?? new Date(),
  }));

  await migrateSimpleTable("portfolio_items", "portfolioItem", (r) => ({
    id:           r.id as string,
    contractorId: r.contractor_id as string,
    category:     r.category as string,
    title:        r.title as string,
    description:  r.description as string | null ?? undefined,
    beforePhotos: json(r.before_photos) ?? [],
    afterPhotos:  json(r.after_photos) ?? [],
    createdAt:    dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("contractor_stats", "contractorStats", (r) => ({
    id:               r.contractor_id as string,  // upsert key alias
    contractorId:     r.contractor_id as string,
    avgResponseHours: r.avg_response_hours as number | null ?? undefined,
    totalBids:        (r.total_bids as number) ?? 0,
    acceptedBids:     (r.accepted_bids as number) ?? 0,
    acceptanceRate:   r.acceptance_rate as number | null ?? undefined,
    updatedAt:        dt(r.updated_at) ?? new Date(),
  }));

  await migrateSimpleTable("contractor_strikes", "contractorStrike", (r) => ({
    id:           r.id as string,
    contractorId: r.contractor_id as string,
    jobId:        r.job_id as string | null ?? undefined,
    strikeType:   r.strike_type as string,
    notes:        r.notes as string | null ?? undefined,
    createdAt:    dt(r.created_at) ?? new Date(),
    expiresAt:    dt(r.expires_at) ?? undefined,
  }));

  await migrateSimpleTable("contractor_suspensions", "contractorSuspension", (r) => ({
    id:             r.id as string,
    contractorId:   r.contractor_id as string,
    reason:         r.reason as string,
    suspendedUntil: dt(r.suspended_until) ?? undefined,
    createdAt:      dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("completion_bonds", "completionBond", (r) => ({
    id:           r.id as string,
    jobId:        r.job_id as string,
    contractorId: r.contractor_id as string,
    amountCents:  (r.amount_cents as number) ?? 1000,
    status:       (r.status as "held"|"released"|"forfeited") ?? "held",
    createdAt:    dt(r.created_at) ?? new Date(),
    resolvedAt:   dt(r.resolved_at) ?? undefined,
  }));

  await migrateSimpleTable("call_logs", "callLog", (r) => ({
    id:              r.id as string,
    jobId:           r.job_id as string,
    callerId:        r.caller_id as string,
    receiverId:      r.receiver_id as string,
    twilioCallSid:   r.twilio_call_sid as string | null ?? undefined,
    recordingUrl:    r.recording_url as string | null ?? undefined,
    recordingSid:    r.recording_sid as string | null ?? undefined,
    transcript:      r.transcript as string | null ?? undefined,
    durationSeconds: (r.duration_seconds as number) ?? 0,
    status:          (r.status as string) ?? "initiated",
    createdAt:       dt(r.created_at) ?? new Date(),
    endedAt:         dt(r.ended_at) ?? undefined,
  }));

  await migrateSimpleTable("group_jobs", "groupJob", (r) => ({
    id:               r.id as string,
    category:         r.category as string,
    zipCode:          r.zip_code as string,
    leadJobId:        r.lead_job_id as string,
    status:           (r.status as "forming"|"active"|"completed"|"cancelled") ?? "forming",
    minParticipants:  (r.min_participants as number) ?? 2,
    maxParticipants:  (r.max_participants as number) ?? 8,
    participantCount: (r.participant_count as number) ?? 1,
    createdAt:        dt(r.created_at) ?? new Date(),
    expiresAt:        dt(r.expires_at) ?? undefined,
  }));

  await migrateSimpleTable("group_job_participants", "groupJobParticipant", (r) => ({
    id:         r.id as string,
    groupJobId: r.group_job_id as string,
    jobId:      r.job_id as string,
    consumerId: r.consumer_id as string,
    joinedAt:   dt(r.joined_at) ?? new Date(),
  }));

  await migrateSimpleTable("job_receipts", "jobReceipt", (r) => ({
    id:           r.id as string,
    jobId:        r.job_id as string,
    contractorId: r.contractor_id as string,
    fileUrl:      r.file_url as string,
    fileName:     r.file_name as string,
    fileType:     (r.file_type as string) ?? "image",
    description:  r.description as string | null ?? undefined,
    amountCents:  r.amount_cents as number | null ?? undefined,
    receiptType:  (r.receipt_type as "receipt"|"invoice"|"estimate"|"other") ?? "receipt",
    createdAt:    dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("job_help_requests", "jobHelpRequest", (r) => ({
    id:               r.id as string,
    jobId:            r.job_id as string,
    leadContractorId: r.lead_contractor_id as string,
    title:            r.title as string,
    description:      r.description as string | null ?? undefined,
    skillsNeeded:     r.skills_needed as string | null ?? undefined,
    payCents:         r.pay_cents as number,
    spots:            (r.spots as number) ?? 1,
    spotsFilled:      (r.spots_filled as number) ?? 0,
    dateNeeded:       dt(r.date_needed) ?? undefined,
    status:           (r.status as "open"|"filled"|"cancelled"|"completed") ?? "open",
    createdAt:        dt(r.created_at) ?? new Date(),
    updatedAt:        dt(r.updated_at) ?? new Date(),
  }));

  await migrateSimpleTable("job_help_applications", "jobHelpApplication", (r) => ({
    id:            r.id as string,
    helpRequestId: r.help_request_id as string,
    jobId:         r.job_id as string,
    applicantId:   r.applicant_id as string,
    message:       r.message as string | null ?? undefined,
    status:        (r.status as "pending"|"accepted"|"rejected"|"withdrawn") ?? "pending",
    createdAt:     dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("neighborhood_activity", "neighborhoodActivity", (r) => ({
    id:          r.id as string,
    jobId:       r.job_id as string,
    contractorId: r.contractor_id as string | null ?? undefined,
    category:    r.category as string,
    city:        r.city as string | null ?? undefined,
    state:       r.state as string | null ?? undefined,
    zipCode:     r.zip_code as string | null ?? undefined,
    completedAt: dt(r.completed_at) ?? new Date(),
  }));

  await migrateSimpleTable("senior_protection", "seniorProtection", (r) => ({
    id:          r.id as string,
    consumerId:  r.consumer_id as string,
    familyEmail: r.family_email as string,
    familyName:  r.family_name as string | null ?? undefined,
    enabled:     bool(r.enabled),
    createdAt:   dt(r.created_at) ?? new Date(),
  }));

  await migrateSimpleTable("admin_categories", "adminCategory", (r) => ({
    id:         r.value as string,  // upsert key alias
    value:      r.value as string,
    label:      r.label as string,
    groupLabel: r.group_label as string,
    icon:       (r.icon as string) ?? "🔧",
    active:     bool(r.active),
    sortOrder:  (r.sort_order as number) ?? 0,
    createdAt:  dt(r.created_at) ?? new Date(),
    updatedAt:  dt(r.updated_at) ?? new Date(),
  }));

  console.log("");
  console.log("=".repeat(60));
  console.log("  Migration complete! ✓");
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
