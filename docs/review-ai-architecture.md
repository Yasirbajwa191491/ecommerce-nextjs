# Review AI Architecture

Technical reference for the hybrid Review AI system: Gemini-primary processing in Convex, n8n fallback orchestration, generation history, and admin controls.

## Overview

```
Review submit → reviewAiJobs queue → Gemini (Convex) → productReviews
                      ↓ (on quota/transient failure, if fallback enabled)
              n8n workflow 06 → Groq → OpenRouter → OpenAI → save-generation → Convex
```

**Primary path is unchanged** when feature flags are off or Gemini succeeds.

## Feature flags (Convex env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_PROVIDER` | auto (`gemini` if key set) | Primary LLM provider |
| `REVIEW_AI_N8N_FALLBACK_ENABLED` | `false` | Route Gemini failures to n8n provider chain |
| `REVIEW_AI_VERSIONING_ENABLED` | `true` | Write `reviewAiGenerations` history |
| `AI_PROVIDER_CHAIN` | `gemini,groq,openrouter,openai` | Provider order reference |
| `AI_FALLBACK_PROVIDER_ORDER` | `groq,openrouter,openai` | n8n fallback order |

## Convex tables

- **`productReviews`** — active AI snapshot (sentiment, tags, moderation, embedding)
- **`reviewAiJobs`** — job queue with `lastAttemptedProvider`, `successfulProvider`, `fallbackTriggered`
- **`reviewAiGenerations`** — versioned history per generation type
- **`reviewAiMetrics`** — daily rollups for dashboard

## Provider layer

- Interface: [`convex/lib/ai/types.ts`](../convex/lib/ai/types.ts)
- Factory: [`convex/lib/ai/getProvider.ts`](../convex/lib/ai/getProvider.ts)
- Chain helper: [`convex/lib/ai/providerChain.ts`](../convex/lib/ai/providerChain.ts)
- Providers: `gemini`, `groq`, `openrouter`, `openai`, `anthropic`, `remote`

**Embeddings** are always generated in Convex (never n8n) for vector search consistency.

## n8n workflows

| # | File | Role |
|---|------|------|
| 01 | `01-review-event-router.json` | Routes events including fallback/manual |
| 02 | `02-retry-safety-net-cron.json` | 15-min due-job processor |
| 03 | `03-weekly-review-report.json` | Weekly email + AI metrics |
| 05 | `05-bulk-review-processor.json` | Throttled bulk jobs |
| 06 | `06-ai-generation-router.json` | Fallback/manual AI via provider chain |

### Convex HTTP endpoints

| Method | Path |
|--------|------|
| POST | `/n8n/review-ai/process-job` |
| POST | `/n8n/review-ai/process-due` |
| POST | `/n8n/review-ai/save-generation` |
| POST | `/n8n/review-ai/report-failure` |
| GET | `/n8n/review-ai/generation-stats` |
| POST | `/n8n/review-ai/generate-sentiment` |
| POST | `/n8n/review-ai/generate-tags` |
| POST | `/n8n/review-ai/generate-reply` |
| POST | `/n8n/review-ai/generate-summary` |
| POST | `/n8n/review-ai/reprocess-review` |

Auth: `X-N8N-Secret` header.

## Admin UI

- **Review detail** — manual AI buttons, regeneration mode, history panel
- **Review list** — bulk reprocess with row selection
- **`/admin/review-ai`** — metrics + recent jobs

## Events (Convex → n8n)

- `review.ai.fallback_requested` — Gemini failed; n8n runs workflow 06
- `review.ai.manual_generate` — admin triggered generation
- Existing: `review.ai.retry_scheduled`, `review.ai.completed`, `review.ai.failed`, `review.bulk_process`

## Fallback behavior

When `REVIEW_AI_N8N_FALLBACK_ENABLED=true` and Gemini fails with quota/transient:

1. Job marked `fallbackTriggered: true`
2. Convex scheduler retry is **skipped** (avoids race with n8n)
3. `review.ai.fallback_requested` emitted to n8n
4. n8n tries Groq → OpenRouter → OpenAI per type
5. Results saved via `save-generation`; embeddings added in Convex

## Manual regeneration

Admin mutations in `adminReviewAi.ts` emit `review.ai.manual_generate` to n8n.

**Regeneration modes:**

- `version` (default) — new version, deactivate previous
- `replace` — overwrite active fields
- `history_only` — log only, no apply

## Backfill

Run once after deploy:

```bash
npx convex run reviewAiBackfill:backfillFromReviews '{"limit": 500}'
```

## Adding a new provider

1. Create `convex/lib/ai/providers/<name>.ts` implementing `ReviewAIProvider`
2. Add to `getProvider.ts` and `providerChain.ts`
3. Add API key to Convex env (primary) or n8n vars (fallback)
4. Update `06-ai-generation-router.json` provider chain if used in n8n

## Rollback

- Set `REVIEW_AI_N8N_FALLBACK_ENABLED=false` — restores Convex-only retries
- Set `REVIEW_AI_VERSIONING_ENABLED=false` — stops history writes; flat fields unchanged
- Disable n8n workflows — Gemini primary path continues independently
