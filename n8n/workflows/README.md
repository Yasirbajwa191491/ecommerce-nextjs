# n8n Review Intelligence Workflows

Import these workflows into your n8n instance (`yasir191491.app.n8n.cloud`).

## Prerequisites

Set these environment variables:

### Convex dashboard
- `N8N_REVIEW_WEBHOOK_URL` — Webhook URL from Workflow 1
- `N8N_WEBHOOK_SECRET` — Shared secret for inbound/outbound auth

### n8n Variables (Settings → Variables)
Workflows use `$vars.*` (not `$env.*`) for n8n Cloud trial compatibility.

- `CONVEX_SITE_URL` — Your Convex HTTP base (e.g. `https://your-deployment.convex.site`)
- `N8N_WEBHOOK_SECRET` — Same secret as Convex
- `ADMIN_EMAIL` — Admin notification recipient
- `EMAIL_FROM` — Verified sender address (e.g. Resend `onboarding@resend.dev`)
- `N8N_ADMIN_NOTIFY_WORKFLOW_ID` — Workflow ID for `04-admin-notifications`
- `N8N_BULK_PROCESS_WORKFLOW_ID` — Workflow ID for `05-bulk-review-processor`

## Convex HTTP endpoints (n8n calls these)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/n8n/review-ai/process-job` | Process single job `{ "jobId": "..." }` |
| POST | `/n8n/review-ai/process-due` | Process due jobs (query `?limit=10`) |
| GET | `/n8n/review-ai/due-jobs` | List due jobs without processing |
| GET | `/n8n/review-ai/weekly-stats` | Weekly report data |
| GET | `/n8n/review-ai/health` | Queue depth / health |

All requests require header: `X-N8N-Secret: <N8N_WEBHOOK_SECRET>`

## Workflow files

1. `01-review-event-router.json` — Main webhook router for Convex events
2. `02-retry-safety-net-cron.json` — Cron every 15 min to process due jobs
3. `03-weekly-review-report.json` — Monday 9 AM weekly stats email
4. `04-admin-notifications.json` — Sub-workflow for flagged/failed alerts (trigger: **Accept all data**)
5. `05-bulk-review-processor.json` — Throttled bulk reprocess handler (trigger: **Accept all data**)

## Setup steps

1. Import `01-review-event-router.json` and activate
2. Copy the webhook URL → set `N8N_REVIEW_WEBHOOK_URL` in Convex
3. Import workflows 2–5 and link sub-workflow references
4. Set `N8N_WEBHOOK_SECRET` in both Convex and n8n
5. Test with a review submission; verify queue processes via Convex logs

## Event payload reference

Convex sends POST to n8n with JSON body:

```json
{
  "event": "review.created",
  "timestamp": 1719500000000,
  "reviewId": "...",
  "productId": "..."
}
```

Events: `review.created`, `review.updated`, `review.approved`, `review.bulk_process`, `review.ai.retry_scheduled`, `review.ai.completed`, `review.ai.failed`
