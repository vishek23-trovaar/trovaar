import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getDb, initializeDatabase } from "@/lib/db";

/**
 * Shared Claude client + helpers for all /api/ai routes.
 *
 * - One module-level client (connection reuse) instead of `new Anthropic()` per request.
 * - Model roles in one place so we standardize instead of scattering ad-hoc model IDs.
 * - parseStructured(): schema-guaranteed JSON via the SDK's structured outputs,
 *   replacing brittle regex-extraction of JSON from free text.
 * - categoryBidStats(): grounds price estimates in Trovaar's own real bid data.
 */

let _client: Anthropic | null = null;

/** Singleton Claude client, or null when no API key is configured (callers fall back). */
export function aiClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Model roles. Haiku 4.5 for cheap structured extraction/scoring/pricing;
 * Sonnet 4.6 for image analysis and heavier reasoning (vision-capable, supports
 * temperature + structured outputs, and far cheaper than Opus for this workload).
 */
export const AI_MODEL = {
  fast: "claude-haiku-4-5",
  vision: "claude-sonnet-4-6",
  reasoning: "claude-sonnet-4-6",
} as const;

type MessageContent = Anthropic.MessageParam["content"];

/**
 * Run a structured-output call and return the validated object, or null on any
 * failure (no key, refusal, schema mismatch, network). Deterministic by default
 * (temperature 0) — override for conversational use.
 */
export async function parseStructured<T extends z.ZodType>(opts: {
  model: string;
  schema: T;
  content: MessageContent;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<z.infer<T> | null> {
  const client = aiClient();
  if (!client) return null;
  try {
    const message = await client.messages.parse({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: opts.content }],
      output_config: { format: zodOutputFormat(opts.schema) },
    });
    return (message.parsed_output as z.infer<T> | null) ?? null;
  } catch {
    return null;
  }
}

export interface CategoryBidStats {
  count: number;
  lowUsd: number;
  medianUsd: number;
  highUsd: number;
}

/**
 * Real bid prices on Trovaar for a category, summarized as 10th / 50th / 90th
 * percentile dollar figures. Returns null when there isn't enough data to be
 * meaningful (callers then rely on the model's own estimate). bids.price is
 * stored in CENTS (see calculateFees / display sites), so we divide by 100.
 */
export async function categoryBidStats(category: string): Promise<CategoryBidStats | null> {
  if (!category) return null;
  try {
    const db = getDb();
    await initializeDatabase();
    const rows = (await db
      .prepare(
        `SELECT b.price AS price
         FROM bids b
         JOIN jobs j ON j.id = b.job_id
         WHERE j.category = ? AND b.status IN ('pending','accepted') AND b.price > 0
         ORDER BY b.price ASC
         LIMIT 1000`
      )
      .all(category)) as { price: number }[];

    const cents = (rows || [])
      .map((r) => Number(r.price))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    if (cents.length < 4) return null; // too sparse to trust

    const pct = (q: number) => cents[Math.min(cents.length - 1, Math.floor(cents.length * q))];
    const usd = (c: number) => Math.round(c / 100);

    return {
      count: cents.length,
      lowUsd: usd(pct(0.1)),
      medianUsd: usd(pct(0.5)),
      highUsd: usd(pct(0.9)),
    };
  } catch {
    return null;
  }
}
