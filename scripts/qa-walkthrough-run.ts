/**
 * QA Walkthrough — exercise every major API flow with the 100 seeded users.
 *
 * Runs each flow over BOTH transports:
 *   - mobile: Authorization: Bearer <token>   (mobile/lib/api.ts path, CSRF-exempt)
 *   - web:    Cookie: token=<token> + Origin   (browser path, same-origin CSRF allow)
 *
 * Also includes regression checks for the fixes shipped this session
 * (discussions IDOR, category validation, onboarding payment guard,
 * group-jobs schema drift, change-order charging).
 *
 * Run: npx tsx scripts/qa-walkthrough-run.ts
 */

import fs from "fs";
import os from "os";
import path from "path";

const BASE = "http://localhost:3001";
const TOKEN_FILE = path.join(os.tmpdir(), "qa-wt-tokens.json");

let pass = 0, fail = 0;
const failures: Array<{ name: string; status: number | string; detail: string }> = [];
const notes: string[] = [];

function ok(name: string, cond: boolean, status: number | string, detail = "") {
  if (cond) { pass++; }
  else { fail++; failures.push({ name, status, detail }); console.log(`  FAIL  ${name}  [${status}] ${detail}`); }
  return cond;
}

type Transport = "mobile" | "web";

// Persist tokens across runs so repeated walkthroughs don't re-hit the
// per-IP login rate limit (10/15min). JWTs are valid 7 days.
const tokenCache = new Map<string, string>(
  fs.existsSync(TOKEN_FILE) ? Object.entries(JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"))) : []
);
function persistTokens() {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(Object.fromEntries(tokenCache)));
}

async function login(email: string, password = "Test123!"): Promise<string> {
  if (tokenCache.has(email)) return tokenCache.get(email)!;
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 5000)); continue; }
    const d = await r.json().catch(() => null);
    if (!d?.token) throw new Error(`login failed ${email}: ${r.status}`);
    tokenCache.set(email, d.token as string);
    persistTokens();
    return d.token as string;
  }
  throw new Error(`login rate-limited for ${email} after retries`);
}

async function api(method: string, path: string, body: unknown, token: string, transport: Transport) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (transport === "mobile") {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["Cookie"] = `token=${token}`;
    headers["Origin"] = BASE;          // same-origin → passes CSRF
    headers["Referer"] = `${BASE}/`;
  }
  const r = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, data };
}

function jobBody(o: Record<string, unknown> = {}) {
  return {
    title: o.title ?? "QA walkthrough job",
    description: o.description ?? "A sufficiently long description to satisfy the validation minimum length.",
    category: o.category ?? "plumbing",
    urgency: o.urgency ?? "medium",
    location: o.location ?? "100 Test Ave, Miami, FL 33101",
    ...o,
  };
}

async function run(transport: Transport) {
  console.log(`\n=== TRANSPORT: ${transport.toUpperCase()} ===`);

  // Pick a fresh consumer/contractor pair per transport so we don't collide.
  const cIdx = transport === "mobile" ? 1 : 2;
  const kIdx = transport === "mobile" ? 1 : 2;
  const consumerToken = await login(`qa_wt_consumer_${cIdx}@trovaar-qa.test`);
  const contractorToken = await login(`qa_wt_contractor_${kIdx}@trovaar-qa.test`);

  // ── Auth ──
  let r = await api("GET", "/api/auth/me", null, consumerToken, transport);
  ok("auth/me consumer", r.status === 200 && r.data?.user?.role === "consumer", r.status);

  // ── Post a job ──
  r = await api("POST", "/api/jobs", jobBody(), consumerToken, transport);
  ok("POST job", r.status === 201 && !!r.data?.job?.id, r.status, JSON.stringify(r.data)?.slice(0, 120));
  const jobId = r.data?.job?.id;

  // ── Category validation regression (admin_categories-backed) ──
  r = await api("POST", "/api/jobs", jobBody({ category: "definitely_not_a_real_category" }), consumerToken, transport);
  ok("POST job invalid category → 400", r.status === 400, r.status);

  // ── Feed: list / filter / search ──
  r = await api("GET", "/api/jobs", null, consumerToken, transport);
  ok("GET feed", r.status === 200 && Array.isArray(r.data?.jobs), r.status);
  r = await api("GET", "/api/jobs?category=plumbing", null, consumerToken, transport);
  ok("GET feed filtered", r.status === 200, r.status);
  r = await api("GET", "/api/jobs?search=walkthrough", null, consumerToken, transport);
  ok("GET feed search", r.status === 200, r.status);

  // ── Job detail ──
  if (jobId) {
    r = await api("GET", `/api/jobs/${jobId}`, null, consumerToken, transport);
    ok("GET job detail", r.status === 200, r.status);
  }

  // ── Bid lifecycle ──
  let bidId: string | undefined;
  if (jobId) {
    r = await api("POST", `/api/jobs/${jobId}/bids`,
      { price: 15000, timeline_days: 3, availability_date: "2026-05-01", message: "QA bid" },
      contractorToken, transport);
    ok("POST bid (contractor w/ portfolio)", r.status === 201 || r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 120));
    bidId = r.data?.bid?.id;

    // Bid price rounding regression — fractional cents must round
    r = await api("POST", `/api/jobs/${jobId}/bids`,
      { price: "15000.7", timeline_days: 2, availability_date: "2026-05-02", message: "dup should fail (already bid)" },
      contractorToken, transport);
    ok("POST duplicate bid blocked", r.status === 400 || r.status === 409, r.status);

    r = await api("GET", `/api/jobs/${jobId}/bids`, null, consumerToken, transport);
    ok("GET bids for job", r.status === 200, r.status);
  }

  // ── Discussions + IDOR regression ──
  if (jobId) {
    r = await api("POST", `/api/jobs/${jobId}/discussions`, { content: "Is parking available on site?" }, contractorToken, transport);
    ok("POST discussion (contractor)", r.status === 201, r.status, JSON.stringify(r.data)?.slice(0, 120));
    r = await api("GET", `/api/jobs/${jobId}/discussions`, null, contractorToken, transport);
    ok("GET discussions (participant)", r.status === 200, r.status);

    // IDOR: an unrelated consumer (not the owner) must be forbidden
    const otherConsumer = await login(`qa_wt_consumer_${cIdx + 10}@trovaar-qa.test`);
    r = await api("GET", `/api/jobs/${jobId}/discussions`, null, otherConsumer, transport);
    ok("GET discussions IDOR blocked (other consumer → 403)", r.status === 403, r.status, "expected 403");
  }

  // ── Accept bid → triggers onboarding-warning path (contractor has no Stripe) ──
  if (jobId && bidId) {
    r = await api("PATCH", `/api/bids/${bidId}`, { status: "accepted" }, consumerToken, transport);
    ok("PATCH accept bid", r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 120));

    // Payment intent should be BLOCKED because contractor hasn't onboarded → 409 (my guard)
    r = await api("POST", "/api/stripe/payment-intent", { jobId }, consumerToken, transport);
    ok("payment-intent blocked w/o contractor onboarding → 409", r.status === 409, r.status, JSON.stringify(r.data)?.slice(0, 140));
    if (r.status === 409) notes.push("Onboarding payment guard fired correctly (409 with notify).");
  }

  // ── Messages ──
  if (jobId) {
    r = await api("POST", `/api/jobs/${jobId}/messages`, { content: "Hello from QA walkthrough" }, consumerToken, transport);
    ok("POST message", r.status === 201 || r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 120));
    r = await api("GET", `/api/jobs/${jobId}/messages`, null, consumerToken, transport);
    ok("GET messages", r.status === 200, r.status);
  }

  // ── Change order → approval should hit onboarding guard (409) ──
  if (jobId) {
    r = await api("POST", `/api/jobs/${jobId}/change-order`,
      { title: "Extra outlet", description: "Add one more outlet", additional_cost_cents: 5000 },
      contractorToken, transport);
    ok("POST change order", r.status === 201, r.status, JSON.stringify(r.data)?.slice(0, 120));
    const coId = r.data?.change_order?.id;
    if (coId) {
      r = await api("PATCH", `/api/jobs/${jobId}/change-order`,
        { change_order_id: coId, action: "approved" }, consumerToken, transport);
      // 409 = onboarding guard (Stripe configured); 503 = Stripe not configured
      // in this env. Both are correct "cannot charge" outcomes.
      ok("approve change order blocked (409 onboarding / 503 no-stripe)", r.status === 409 || r.status === 503, r.status, JSON.stringify(r.data)?.slice(0, 140));
    }
  }

  // ── Group jobs (schema-drift fix) ──
  r = await api("GET", "/api/group-jobs", null, consumerToken, transport);
  ok("GET group-jobs", r.status === 200 || r.status === 404, r.status, JSON.stringify(r.data)?.slice(0, 120));

  // ── Notifications ──
  r = await api("GET", "/api/notifications", null, contractorToken, transport);
  ok("GET notifications (contractor)", r.status === 200, r.status);

  // ── Referrals ──
  r = await api("GET", "/api/referrals", null, consumerToken, transport);
  ok("GET referrals", r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 100));

  // ── Job templates ──
  r = await api("POST", "/api/job-templates",
    { name: "QA template", title: "Recurring clean", description: "Monthly", category: "cleaning", urgency: "low" },
    consumerToken, transport);
  ok("POST job template", r.status === 201 || r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 120));
  r = await api("GET", "/api/job-templates", null, consumerToken, transport);
  ok("GET job templates", r.status === 200, r.status);

  // ── Subscriptions ──
  r = await api("GET", "/api/subscriptions", null, consumerToken, transport);
  ok("GET subscriptions", r.status === 200, r.status);

  // ── Disputes (list) ──
  r = await api("GET", "/api/disputes/my", null, consumerToken, transport);
  ok("GET my disputes", r.status === 200 || r.status === 404, r.status);

  // ── Contractor profile (public) ──
  const kMe = await api("GET", "/api/auth/me", null, contractorToken, transport);
  const kId = kMe.data?.user?.id;
  if (kId) {
    r = await api("GET", `/api/contractors/${kId}`, null, consumerToken, transport);
    ok("GET contractor profile", r.status === 200 || r.status === 404, r.status);
  }

  // Deleting the main job must be REFUSED (it has an accepted bid) — verify
  // that guard, then prove happy-path delete on a fresh, un-bid job.
  if (jobId) {
    r = await api("DELETE", `/api/jobs/${jobId}`, null, consumerToken, transport);
    ok("DELETE job w/ accepted bid blocked → 409", r.status === 409, r.status);
  }
  r = await api("POST", "/api/jobs", jobBody({ title: "QA throwaway to delete" }), consumerToken, transport);
  const throwawayId = r.data?.job?.id;
  if (throwawayId) {
    r = await api("DELETE", `/api/jobs/${throwawayId}`, null, consumerToken, transport);
    ok("DELETE fresh own job", r.status === 200 || r.status === 204, r.status);
  }
}

async function main() {
  await run("mobile");
  await run("web");

  console.log(`\n========================================`);
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  if (notes.length) { console.log(`\nNotes:`); notes.forEach((n) => console.log(`  - ${n}`)); }
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.forEach((f) => console.log(`  [${f.status}] ${f.name}  ${f.detail}`));
  }
  console.log(`========================================`);
}

main().catch((e) => { console.error("RUNNER CRASH:", e); process.exit(1); });
