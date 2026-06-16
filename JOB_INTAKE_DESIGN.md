# Unified AI Job Intake — Design Proposal

**Status:** Draft for review · **Author:** AI pass · **Date:** 2026-06-16

This proposes replacing the scattered customer-post breakdown routes with a single
multimodal **Job Intake** pass that produces one structured `JobBrief`, and connecting
that brief to contractor qualification via a **capability graph**. Nothing here is built
yet — it is the design to approve (or amend) before any implementation.

---

## 1. Why change

Today the breakdown is split across four routes that each see only part of the input and
each re-implement the same scaffolding:

| Route | Sees | Produces | Problem |
|---|---|---|---|
| `detect-category` | photos + text | category | (well-built) |
| `parse-job` | **photos only** | description + questions | ignores typed text & video |
| `voice-analyze` | **video only** | everything | ignores photos & typed text |
| `job-questions` | text + photos | questions | ignores video |

Consequences:
- **No fusion.** A customer who uploads a video *and* photos *and* types a description gets
  2–3 independent passes that can't see each other → contradictory descriptions, duplicate
  questions, no single source of truth.
- **Triplicated logic.** The "questions a contractor would ask" rubric and the
  `photoToInlineData` helper were copy-pasted into three routes. (The quick-wins pass already
  de-duped these into `src/lib/gemini.ts` — this design builds on that.)
- **Output is free text, not data.** The breakdown can't be filtered, sorted, or fed into
  pricing/matching because it isn't structured and isn't persisted as fields on the job.
- **Disconnected from matching.** `match-score` re-derives fit from raw fields instead of
  comparing *what the job needs* against *what the contractor has*.

---

## 2. The `JobBrief` — one structured understanding of a post

A single object, produced once at intake from **all** modalities the customer provided
(typed text + N photos + optional video/audio), persisted on the job, and surfaced to
contractors. Gemini Flash is natively multimodal, so all inputs go in one request.

```ts
// src/lib/job-brief.ts  (shape only — zod schema + Gemini response_schema derived from this)
export interface JobBrief {
  // Headline (fused across every modality the customer supplied)
  title: string;                       // <= 60 chars
  description: string;                 // 2–5 sentences, first person
  category: string;                    // from CATEGORY_GROUPS
  categoryGroup: string;
  urgency: "low" | "medium" | "high" | "emergency";

  // Structured scope — the actual value-add for contractors
  scopeItems: string[];               // discrete tasks ("replace P-trap", "repair cabinet floor")
  likelyMaterials: string[];          // ("compression fitting", "copper pipe")
  accessNotes: string | null;         // ("under-sink, tight cabinet", "2nd floor no elevator")
  riskFlags: string[];                // ("possible water damage / mold", "permit likely required")

  // Drives matching (see §4)
  requiredCapabilities: Array<{
    skill: string;                    // ("licensed plumber", "200A panel work")
    importance: "required" | "preferred";
  }>;

  // What the AI could NOT resolve from the media — the questions to ask the customer
  openQuestions: Array<{
    question: string;
    type: "text" | "measurement" | "choice" | "yesno";
    placeholder: string;
  }>;

  // Provenance / trust
  sources: Array<"text" | "photo" | "video">; // which modalities fed this brief
  confidence: "high" | "medium" | "low";
  transcript?: string;                // present only when a video/audio was supplied
}
```

### Persistence
Store the brief as a single `jsonb` column on `jobs`:

```sql
-- REQUIRES an explicit ALTER migration in db.ts — the live Neon DB drifts, so a
-- CREATE TABLE change alone will NOT apply. (See trovaar-schema-migrations note.)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_brief jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_brief_at timestamptz;
```

A `jsonb` column keeps the brief flexible while still letting us index/filter the fields
contractors care about (`category`, `urgency`, `riskFlags`) later.

---

## 3. The intake endpoint

**`POST /api/ai/job-intake`** — replaces `parse-job`, `voice-analyze`, and `job-questions`
as the single entry point. `detect-category` can stay as the fast, cheap pre-fill that runs
the instant a photo is dropped (snappy UX), with `job-intake` producing the full brief on submit.

```ts
// Request
{
  title?: string;
  description?: string;
  photos?: string[];        // URLs (http or /public)
  videoBase64?: string;     // optional; uploaded via Gemini File API as today
  videoMimeType?: string;
}
// Response: { brief: JobBrief }   // falls back to a minimal brief if AI unavailable
```

One `geminiJson()` call (`gemini-2.0-flash`, `response_schema` = JobBrief) with parts =
`[...imageParts, ...(videoFilePart ? [videoFilePart] : []), { text: prompt }]`. The prompt is
the single canonical breakdown prompt — the only place the rubric lives.

This reuses everything from the quick-wins pass: `photosToInlineParts`, `geminiJson`,
`SCENARIO_QUESTION_GUIDANCE`, and the video upload/poll/delete dance already in `voice-analyze`.

---

## 4. Connecting to qualification (capability graph)

Today `analyze-profile` emits free-ish strengths and `match-score` asks an LLM for a 0–100
"vibe score." Better: make matching a **comparison of structured capabilities**, with the LLM
only for nuance — cheaper, explainable, and honest about trust.

1. Extend `analyze-profile` to emit a structured `capabilities[]`:
   ```ts
   capabilities: Array<{
     skill: string;
     level: "beginner" | "intermediate" | "expert";
     evidence: "verified-cert" | "self-reported" | "quiz";   // ← trust provenance
   }>
   ```
2. **Match = overlap** of `JobBrief.requiredCapabilities` against `contractor.capabilities`.
   A required skill the contractor has by `verified-cert` scores higher than one that's only
   `self-reported`. The score becomes explainable: *"matched 4/5 required skills (3 verified)."*
3. The LLM is reserved for the ambiguous middle (does "kitchen remodel experience" cover
   "replace farmhouse sink"?), not for the whole score.

### Trust boundary
This is the same principle as the `verify-document` gating already shipped: anything shown to
a **consumer** as a qualification must distinguish **verified** from **AI-inferred-from-self-report**.
Today `analyze-profile` can label someone "Master licensed / master tier" from unverified work
history, and `match-score` surfaces it as a highlight. The `evidence` field fixes that — the UI
can badge "verified" vs "claimed."

---

## 5. Rollout (incremental, low-risk)

Each phase is independently shippable; nothing is big-bang.

- **Phase 0 — done.** Quick wins: shared `src/lib/gemini.ts`, native `response_schema` on all
  Gemini routes, one model (`gemini-2.0-flash`), de-duped helpers. No behavior change.
- **Phase 1 — JobBrief, shadow mode.** Add `job-intake` + the `ai_brief` columns (with the
  explicit ALTER migration). Run it **alongside** the existing flow, write the brief, but keep
  the current UI reading the old fields. Compare quality with zero user-facing risk.
- **Phase 2 — cut the UI over.** Point the post-a-job and contractor-view screens at the brief.
  Retire `parse-job` / `job-questions` / `voice-analyze` once nothing calls them.
- **Phase 3 — capability matching.** Add `capabilities[]` + `evidence` to `analyze-profile`;
  switch `match-score(s)` to overlap-first scoring; add verified/claimed badges in the UI.

---

## 6. Open questions for review

1. **Pre-fill vs full pass** — keep `detect-category` as the instant on-photo-drop pre-fill, or
   fold it into a single `job-intake` call on submit? (Recommend: keep it — the snappy UX is worth
   the tiny extra call.)
2. **Provider** — the intake stays on **Gemini** (already your multimodal provider; Flash is cheap
   and strong here). Flag if you'd rather evaluate Claude for any part — that's a deliberate
   provider choice, not something to switch silently.
3. **`scopeItems` / `requiredCapabilities` granularity** — how structured do you want contractors'
   filtering to be? More structure = better matching but a heavier prompt.
4. **Backfill** — generate briefs for existing open jobs, or only new posts from cutover?
