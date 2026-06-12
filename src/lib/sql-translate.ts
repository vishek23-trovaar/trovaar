/**
 * SQLite-dialect → PostgreSQL query translation.
 *
 * The data layer (src/lib/db.ts) is Postgres-only, but the ~150 API routes
 * were written in SQLite dialect. This adapter translates them at query time:
 *   - `?` positional placeholders → `$1, $2, ...`
 *   - datetime() arithmetic       → NOW()/INTERVAL
 *   - strftime()                  → TO_CHAR / EXTRACT
 *   - GROUP_CONCAT                → STRING_AGG
 *   - INSERT OR IGNORE            → INSERT ... ON CONFLICT DO NOTHING
 *   - LIKE                        → ILIKE (SQLite LIKE is case-insensitive)
 *
 * Translation is deterministic and the query set is finite, so the public
 * `sqliteToPostgres` is memoized — each unique SQL string is translated once.
 *
 * This module is intentionally dependency-free so it can be unit-tested in
 * isolation (scripts/test-sql-translator.ts) without spinning up a pool.
 */

const _cache = new Map<string, string>();

export function sqliteToPostgres(sql: string): string {
  const cached = _cache.get(sql);
  if (cached !== undefined) return cached;
  const result = translate(sql);
  // Bound the cache so interpolated SQL can't grow it without limit.
  if (_cache.size >= 2000) _cache.clear();
  _cache.set(sql, result);
  return result;
}

function translate(sql: string): string {
  let idx = 0;
  // Replace ? placeholders with $1, $2, etc.
  let converted = sql.replace(/\?/g, () => `$${++idx}`);

  // SQLite datetime('now', '+N unit') → Postgres (NOW() + INTERVAL 'N unit')
  converted = converted.replace(
    /datetime\('now',\s*'\+(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|month|months|year|years)'\)/gi,
    "(NOW() + INTERVAL '$1 $2')"
  );
  // SQLite datetime('now', '-N unit') → Postgres (NOW() - INTERVAL 'N unit')
  converted = converted.replace(
    /datetime\('now',\s*'-(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|month|months|year|years)'\)/gi,
    "(NOW() - INTERVAL '$1 $2')"
  );
  // Dynamic interval strings like datetime('now', '${sqlInterval}') — handled at query level
  // SQLite datetime('now') → Postgres NOW()
  converted = converted.replace(/datetime\('now'\)/gi, "NOW()");
  // SQLite datetime(col, '+N days') → Postgres (col + INTERVAL 'N days')
  converted = converted.replace(
    /datetime\(([^,]+),\s*'\+(\d+)\s+days'\)/gi,
    "($1 + INTERVAL '$2 days')"
  );
  // SQLite datetime(col, '-N days') → Postgres (col - INTERVAL 'N days')
  converted = converted.replace(
    /datetime\(([^,]+),\s*'-(\d+)\s+days'\)/gi,
    "($1 - INTERVAL '$2 days')"
  );
  // SQLite LIKE is case-insensitive by default; Postgres LIKE is case-sensitive
  // Use ILIKE for case-insensitive matching
  converted = converted.replace(/\bLIKE\b/g, "ILIKE");

  // SQLite GROUP_CONCAT → Postgres STRING_AGG
  // GROUP_CONCAT(col, sep) → STRING_AGG(col::text, sep)
  converted = converted.replace(
    /GROUP_CONCAT\(([^,)]+),\s*('[^']*'|"[^"]*")\)/gi,
    "STRING_AGG($1::text, $2)"
  );
  // GROUP_CONCAT(col) with no separator → STRING_AGG(col::text, ',')
  converted = converted.replace(
    /GROUP_CONCAT\(([^,)]+)\)(?!\s*:)/gi,
    "STRING_AGG($1::text, ',')"
  );

  // SQLite INSERT OR IGNORE → Postgres INSERT ... ON CONFLICT DO NOTHING
  const hasOrIgnore = /\bINSERT OR IGNORE\b/i.test(converted);
  converted = converted.replace(/\bINSERT OR IGNORE\b/gi, "INSERT");
  converted = converted.replace(/\bINSERT OR REPLACE\b/gi, "INSERT");
  if (hasOrIgnore) {
    // Append ON CONFLICT DO NOTHING before any trailing semicolons/whitespace
    converted = converted.trimEnd().replace(/;*$/, "") + " ON CONFLICT DO NOTHING";
  }

  // SQLite strftime → Postgres equivalents
  // strftime('%Y', col) → TO_CHAR(col, 'YYYY')
  converted = converted.replace(/strftime\('%Y',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY')");
  // strftime('%m', col) → EXTRACT(MONTH FROM col)
  converted = converted.replace(/strftime\('%m',\s*([^)]+)\)/gi, "EXTRACT(MONTH FROM $1)");
  // strftime('%Y-%m', col) → TO_CHAR(col, 'YYYY-MM')
  converted = converted.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");
  // strftime('%Y-%m-%d', col) → TO_CHAR(col, 'YYYY-MM-DD')
  converted = converted.replace(/strftime\('%Y-%m-%d',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')");
  // strftime('%H', col) → TO_CHAR(col, 'HH24')
  converted = converted.replace(/strftime\('%H',\s*([^)]+)\)/gi, "TO_CHAR($1, 'HH24')");
  // strftime('%d', col) → TO_CHAR(col, 'DD')
  converted = converted.replace(/strftime\('%d',\s*([^)]+)\)/gi, "TO_CHAR($1, 'DD')");

  return converted;
}
