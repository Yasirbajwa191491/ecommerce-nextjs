# n8n Review Intelligence Workflows

Import these workflows into your n8n instance.

## Prerequisites

### Convex dashboard
- `N8N_REVIEW_WEBHOOK_URL` — Webhook URL from Workflow 01
- `N8N_WEBHOOK_SECRET` — Shared secret for inbound/outbound auth
- `AI_PROVIDER=gemini` — Keep Gemini as primary
- `REVIEW_AI_N8N_FALLBACK_ENABLED=true` — Enable n8n fallback (optional)
- `REVIEW_AI_VERSIONING_ENABLED=true` — Generation history (default on)

### n8n Variables (Settings → Variables)

- `CONVEX_SITE_URL` — Convex HTTP base (e.g. `https://your-deployment.convex.site`)
- `N8N_WEBHOOK_SECRET` — Same secret as Convex
- `ADMIN_EMAIL` — Admin notification recipient
- `EMAIL_FROM` — Verified sender address
- `N8N_ADMIN_NOTIFY_WORKFLOW_ID` — Workflow 04 ID
- `N8N_BULK_PROCESS_WORKFLOW_ID` — Workflow 05 ID
- `N8N_AI_GENERATION_WORKFLOW_ID` — Workflow 06 ID
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

All requests require header: `X-N8N-Secret: <N8N_WEBHOOK_SECRET>`

## Workflow files

1. `01-review-event-router.json` — Main webhook router (retry, fallback, manual, bulk)
2. `02-retry-safety-net-cron.json` — Cron every 15 min
3. `03-weekly-review-report.json` — Monday 9 AM weekly email
4. `04-admin-notifications.json` — Sub-workflow for alerts
5. `05-bulk-review-processor.json` — Throttled bulk reprocess
6. `06-ai-generation-router.json` — Fallback/manual AI provider chain

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

`review.created`, `review.updated`, `review.approved`, `review.bulk_process`, `review.ai.retry_scheduled`, `review.ai.completed`, `review.ai.failed`, `review.ai.fallback_requested`, `review.ai.manual_generate`

See [docs/review-ai-architecture.md](../../docs/review-ai-architecture.md) for full technical reference.
