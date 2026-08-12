# n8n Review Intelligence Workflows

Import these workflows into your n8n instance.

## Prerequisites

### Convex dashboard
- `N8N_REVIEW_WEBHOOK_URL` — Webhook URL from Workflow 01 (shared by review AI and product content)
- `N8N_WEBHOOK_SECRET` — Shared secret for inbound/outbound auth
- `AI_PROVIDER=gemini` — Keep Gemini as primary
- `REVIEW_AI_N8N_FALLBACK_ENABLED=true` — Enable n8n fallback (optional)
- `REVIEW_AI_VERSIONING_ENABLED=true` — Generation history (default on)
- `PRODUCT_CONTENT_N8N_ENABLED=true` — Enable n8n product content on admin product form (default on unless `false`)
- `IMAGE_EMBEDDING_N8N_ENABLED=true` — Emit image embedding events to n8n (default on unless `false`; Convex still processes jobs without n8n)

### n8n Variables (Settings → Variables)

- `CONVEX_SITE_URL` — Convex HTTP base (e.g. `https://your-deployment.convex.site`)
- `N8N_WEBHOOK_SECRET` — Same secret as Convex
- `ADMIN_EMAIL` — Admin notification recipient
- `EMAIL_FROM` — Verified sender address
- `N8N_ADMIN_NOTIFY_WORKFLOW_ID` — Workflow 04 ID
- `N8N_BULK_PROCESS_WORKFLOW_ID` — Workflow 05 ID
- `N8N_AI_GENERATION_WORKFLOW_ID` — Workflow 06 ID
- `N8N_PRODUCT_CONTENT_WORKFLOW_ID` — Workflow 07 ID (optional; only if you call WF07 as a sub-workflow)
- `AI_FALLBACK_PROVIDER_ORDER` — Default: `groq,openrouter,openai`
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY` — Fallback provider keys
- `GROQ_MODEL`, `OPENROUTER_MODEL`, `OPENAI_MODEL` — Optional model overrides

## Convex HTTP endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/n8n/review-ai/process-job` | Process single job |
| POST | `/n8n/review-ai/process-due` | Process due jobs |
| GET | `/n8n/review-ai/due-jobs` | List due jobs |
| GET | `/n8n/review-ai/weekly-stats` | Weekly report + AI metrics |
| GET | `/n8n/review-ai/health` | Queue health |
| POST | `/n8n/review-ai/save-generation` | Persist AI result + history |
| POST | `/n8n/review-ai/report-failure` | Log failed provider attempt |
| GET | `/n8n/review-ai/generation-stats` | Monitoring metrics |
| POST | `/n8n/review-ai/generate-sentiment` | Trigger sentiment via n8n |
| POST | `/n8n/review-ai/generate-tags` | Trigger tags via n8n |
| POST | `/n8n/review-ai/generate-reply` | Trigger reply via n8n |
| POST | `/n8n/review-ai/generate-summary` | Trigger summary via n8n |
| POST | `/n8n/review-ai/reprocess-review` | Full reprocess via n8n |
| POST | `/n8n/product-ai/complete` | Complete product content generation job |
| POST | `/n8n/product-ai/report-failure` | Fail product content generation job |
| POST | `/n8n/image-embedding/process-job` | Process single image embedding job |
| POST | `/n8n/image-embedding/process-due` | Process due image embedding jobs |
| GET | `/n8n/image-embedding/due-jobs` | List due image embedding jobs |
| GET | `/n8n/image-embedding/health` | Image embedding queue health |

All requests require header: `X-N8N-Secret: <N8N_WEBHOOK_SECRET>`

## Visual product search / image embeddings (Workflow 08)

**n8n is optional.** Convex schedules image embedding jobs on product save and processes them automatically after ~30s, even if n8n is off.

### What to import

| Workflow | Action | Required? |
|----------|--------|-----------|
| **08** `08-product-image-embedding.json` | **Import new** and activate | Optional (cron safety net) |
| **01–07** | **No re-import** needed for image embeddings | — |

Workflow **08** only runs a **15-minute cron** (process due jobs + health check). It does **not** add a webhook — that avoids conflicting with workflow **01** on `review-events`.

Convex may still emit `product.image.embedding_requested` to the same `N8N_REVIEW_WEBHOOK_URL` as review AI; workflow **01** can ignore that event. Processing is handled by Convex fallback + workflow **08** cron.

### Convex env

- `SITE_URL` — Your Next.js app URL (e.g. `http://localhost:3000` or production domain). Used when Convex calls `/api/ai/embed-image`. Sync locally: `npm run dev:sync-url`
- `IMAGE_EMBEDDING_N8N_ENABLED` — Set `false` to skip n8n webhook emits entirely (Convex-only queue)

### n8n variables (same as review AI)

- `CONVEX_SITE_URL` — `https://YOUR-DEPLOYMENT.convex.site` (not `.convex.cloud`)
- `N8N_WEBHOOK_SECRET` — Same as Convex

See [docs/visual-search-architecture.md](../../docs/visual-search-architecture.md) for full reference.

## Product AI content (Workflow 01 + optional Workflow 07)

Used when admins select **n8n automation** on the product add/edit **AI Tools** tab.

Uses the **same** `N8N_REVIEW_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` as review AI. Workflow **01** normalizes the event and runs **Generate Product Content** inline (no sub-workflow required).

1. Re-import `01-review-event-router.json` and activate workflow 01
2. Reuse n8n variables: `CONVEX_SITE_URL`, `N8N_WEBHOOK_SECRET`, `AI_FALLBACK_PROVIDER_ORDER`, provider API keys
3. Alt text stays **Gemini-only** (vision); n8n generates description, SEO, and highlights

Event from Convex: `product.ai.generate_content` with `{ requestId, mode, context, triggeredBy }`

### Testing workflow 07 in n8n (optional)

Workflow 07 is for **isolated testing only**. Production uses workflow 01 inline.

1. Import `07-product-content-generation.json`
2. Click **Manual Test Trigger** → **Set Test Payload** → **Generate Product Content**
3. Do **not** use **Execute workflow** on the Execute Workflow Trigger alone — it sends an empty item

To test the real admin path, trigger workflow **01** via the Convex webhook or the admin product form.

### Troubleshooting product content 404

If **Generate Product Content** fails with `Request failed with status code 404` on `/n8n/product-ai/...`:

1. **`CONVEX_SITE_URL` must use `.convex.site`** (HTTP actions), not `.convex.cloud`  
   Example: `https://doting-bat-377.convex.site`
2. **Deploy Convex** so HTTP routes exist: `npx convex deploy` (or `npx convex dev` locally)
3. **`N8N_WEBHOOK_SECRET`** in n8n must match the value in Convex
4. **Manual test in workflow 07** (`manual-test-*` request IDs) skips Convex callbacks — only tests AI providers. Use workflow 01 for end-to-end with Convex.

Verify the endpoint exists:

```bash
curl -X POST "https://YOUR-DEPLOYMENT.convex.site/n8n/product-ai/report-failure" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Secret: YOUR_SECRET" \
  -d '{"requestId":"test","error":"ping"}'
```

Expect `404` only if the route is not deployed; `401` means the secret is wrong; `200` or a JSON job error means the route is live.

## Setup steps

1. Import workflows 01 and 06; activate 01
2. Copy webhook URL → `N8N_REVIEW_WEBHOOK_URL` in Convex
3. Import workflows 02–05; link sub-workflow IDs
4. Set `N8N_AI_GENERATION_WORKFLOW_ID` to workflow 06 ID
5. Configure fallback API keys in n8n variables
6. Test review submission; verify Gemini primary path in Convex logs

## Troubleshooting

### "No information about the workflow to execute found"

This happens when the **Execute Workflow** node cannot resolve the sub-workflow ID.

**Quick fix in n8n UI (no re-import):**
1. Open the failing **Execute Workflow** node (e.g. "Run AI Generation Router")
2. Set **Source** → **Database**
3. For **Workflow**, click the gear icon → **Add Expression**
4. Use: `{{ $vars.N8N_AI_GENERATION_WORKFLOW_ID }}`
5. Ensure **Mode** is `id` (not "From list" with a broken reference)
6. **Or** pick **Review AI - AI Generation Router** directly from the workflow dropdown

**Verify:**
- Workflow **06** exists and is imported (`Review AI - AI Generation Router`)
- `N8N_AI_GENERATION_WORKFLOW_ID` matches workflow 06's ID (from the URL: `/workflow/XXXX`)
- Workflow 06 **Execute Workflow Trigger** is set to **Accept all data** / passthrough

**After pulling repo updates:** Re-import `01-review-event-router.json` — Execute nodes now use the correct `workflowId` resource-locator format for n8n 1.2+.

## Events

`review.created`, `review.updated`, `review.approved`, `review.bulk_process`, `review.ai.retry_scheduled`, `review.ai.completed`, `review.ai.failed`, `review.ai.fallback_requested`, `review.ai.manual_generate`, `product.ai.generate_content`, `product.image.embedding_requested`, `product.image.embedding_retry`

See [docs/review-ai-architecture.md](../../docs/review-ai-architecture.md) for full technical reference.

## Recommendation platform (Workflows 09–11)

**n8n is optional.** Convex schedules recommendation jobs and processes them after ~30s even when n8n is off.

### What to import

| Workflow | File | Action | Required? |
|----------|------|--------|-----------|
| **09** | `09-recommendation-cron.json` | **Import** and activate | Optional (cron safety net) |
| **10** | `10-recommendation-processor.json` | Import if calling single jobs | Optional (sub-workflow) |
| **11** | `11-marketing-audiences.json` | **Import** and activate (optional weekly email) | Optional |

If you already imported an **empty** WF09, delete that workflow in n8n and re-import `09-recommendation-cron.json` from the repo.

### Convex env

- `N8N_WEBHOOK_SECRET` — Required for n8n → Convex HTTP auth
- Admin setting `recommendation_n8n_enabled` — Set `true` only if n8n should be primary processor

### n8n variables

- `CONVEX_SITE_URL` — `https://YOUR-DEPLOYMENT.convex.site` (not `.convex.cloud`)
- `N8N_WEBHOOK_SECRET` — Same as Convex

### Convex HTTP endpoints (all POST, header `X-N8N-Secret`)

| Path | Purpose |
|------|---------|
| `/n8n/recommendations/process-due?limit=10` | Process due profile/cache jobs (WF09) |
| `/n8n/recommendations/health` | Queue stats |
| `/n8n/recommendations/process-job` | Process one job by `{ jobId }` (WF10) |
| `/n8n/recommendations/save-profile` | Callback: save enriched profile |
| `/n8n/recommendations/save-cache` | Callback: save recommendation cache |
| `/n8n/recommendations/report-failure` | Callback: mark job failed |
| `/n8n/recommendations/export-audiences?limit=500` | Export segments/tags for marketing (WF11) |

See [docs/recommendation-platform.md](../../docs/recommendation-platform.md) for full reference.

## Workflow files

1. `01-review-event-router.json` — Main webhook router (retry, fallback, manual, bulk)
2. `02-retry-safety-net-cron.json` — Cron every 15 min
3. `03-weekly-review-report.json` — Monday 9 AM weekly email
4. `04-admin-notifications.json` — Sub-workflow for alerts
5. `05-bulk-review-processor.json` — Throttled bulk reprocess
6. `06-ai-generation-router.json` — Fallback/manual AI provider chain
7. `07-product-content-generation.json` — Admin product form content (description, SEO, highlights)
8. `08-product-image-embedding.json` — Cron safety net for visual search image embeddings (optional)
9. `09-recommendation-cron.json` — Cron safety net for recommendation jobs (optional)
10. `10-recommendation-processor.json` — Single-job processor sub-workflow (optional)
11. `11-marketing-audiences.json` — Weekly marketing audience export (optional Email node — add SMTP yourself)
