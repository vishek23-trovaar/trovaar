/**
 * Unit tests for the SQLite→Postgres translator (src/lib/sql-translate.ts).
 *
 * No test runner needed — run: npx tsx scripts/test-sql-translator.ts
 * Exits non-zero on any failure (CI-friendly).
 */

import assert from "node:assert/strict";
import { sqliteToPostgres as t } from "../src/lib/sql-translate";

let passed = 0;
const failures: string[] = [];

function eq(name: string, input: string, expected: string) {
  try {
    assert.equal(t(input), expected);
    passed++;
  } catch {
    failures.push(`${name}\n    in:  ${input}\n    out: ${t(input)}\n    exp: ${expected}`);
  }
}
function contains(name: string, input: string, needle: string) {
  const out = t(input);
  if (out.includes(needle)) passed++;
  else failures.push(`${name}\n    in:  ${input}\n    out: ${out}\n    expected to contain: ${needle}`);
}

// ── Placeholders ──
eq("single placeholder", "SELECT * FROM users WHERE id = ?", "SELECT * FROM users WHERE id = $1");
eq("multiple placeholders",
  "INSERT INTO t (a, b, c) VALUES (?, ?, ?)",
  "INSERT INTO t (a, b, c) VALUES ($1, $2, $3)");
eq("no placeholders unchanged", "SELECT 1", "SELECT 1");

// ── datetime('now') ──
eq("datetime now", "SELECT datetime('now')", "SELECT NOW()");
eq("datetime now + days",
  "WHERE expires_at > datetime('now', '+7 days')",
  "WHERE expires_at > (NOW() + INTERVAL '7 days')");
eq("datetime now - minutes",
  "WHERE created_at > datetime('now', '-15 minutes')",
  "WHERE created_at > (NOW() - INTERVAL '15 minutes')");
eq("datetime now + hours",
  "datetime('now', '+24 hours')",
  "(NOW() + INTERVAL '24 hours')");

// ── datetime(col, ...) ──
eq("datetime col + days",
  "SELECT datetime(created_at, '+30 days')",
  "SELECT (created_at + INTERVAL '30 days')");

// ── LIKE → ILIKE ──
eq("LIKE becomes ILIKE",
  "WHERE name LIKE ?",
  "WHERE name ILIKE $1");

// ── GROUP_CONCAT → STRING_AGG ──
contains("group_concat with sep",
  "SELECT GROUP_CONCAT(tag, ',') FROM t", "STRING_AGG(tag::text, ',')");
contains("group_concat no sep",
  "SELECT GROUP_CONCAT(tag) FROM t", "STRING_AGG(tag::text, ',')");

// ── INSERT OR IGNORE → ON CONFLICT DO NOTHING ──
contains("insert or ignore appends on conflict",
  "INSERT OR IGNORE INTO t (id) VALUES (?)", "ON CONFLICT DO NOTHING");
eq("insert or ignore full",
  "INSERT OR IGNORE INTO t (id) VALUES (?)",
  "INSERT INTO t (id) VALUES ($1) ON CONFLICT DO NOTHING");
contains("insert or ignore strips keyword",
  "INSERT OR IGNORE INTO t (id) VALUES (?)", "INSERT INTO t");

// ── strftime ──
contains("strftime year", "SELECT strftime('%Y', created_at)", "TO_CHAR(created_at, 'YYYY')");
contains("strftime month", "SELECT strftime('%m', created_at)", "EXTRACT(MONTH FROM created_at)");
contains("strftime ymd", "SELECT strftime('%Y-%m-%d', created_at)", "TO_CHAR(created_at, 'YYYY-MM-DD')");

// ── Combined / real-world queries ──
eq("placeholders + datetime + like together",
  "SELECT * FROM jobs WHERE title LIKE ? AND created_at > datetime('now', '-7 days') AND id = ?",
  "SELECT * FROM jobs WHERE title ILIKE $1 AND created_at > (NOW() - INTERVAL '7 days') AND id = $2");

// ── Idempotency / determinism (memoization must not change result) ──
{
  const q = "SELECT * FROM t WHERE x = ? AND y LIKE ?";
  const first = t(q);
  const second = t(q);
  if (first === second) passed++;
  else failures.push(`memoized result differs on second call: ${first} vs ${second}`);
}

// ── Native Postgres must pass through untouched (so converted files are safe) ──
eq("native NOW() untouched",
  "SELECT * FROM t WHERE created_at > NOW() - INTERVAL '7 days'",
  "SELECT * FROM t WHERE created_at > NOW() - INTERVAL '7 days'");
eq("native ON CONFLICT untouched",
  "INSERT INTO t (id) VALUES ($1) ON CONFLICT DO NOTHING",
  "INSERT INTO t (id) VALUES ($1) ON CONFLICT DO NOTHING");

console.log(`\nSQL translator tests: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("All translator tests passed.\n");
