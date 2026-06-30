# Visual Product Search Architecture

## Overview

Visual product search lets customers upload an image and find visually similar products. The platform uses **SigLIP** (primary) and **CLIP** (fallback) image embeddings stored in Convex vector indexes. **Gemini Vision** provides a last-resort semantic search path. **n8n is optional** — all critical paths work without it.

## Components

| Layer | Responsibility |
|-------|----------------|
| **Next.js** (`src/lib/ai/image-embedding/`) | SigLIP/CLIP inference via `@xenova/transformers` |
| **Next.js API** (`/api/ai/embed-image`) | Authenticated embedding HTTP endpoint |
| **Convex** | Vector storage, job queue, visual search action |
| **n8n WF08** (optional) | Background embedding jobs, safety-net cron |

## Customer search flow (never uses n8n)

```
Upload image → Convex storage
  → visualProductSearch.searchByImage action
  → Next.js embed API (SigLIP → CLIP)
  → Convex vectorSearch (by_image_embedding or by_image_embedding_clip)
  → Apply catalog filters + optional text query
  → If all fail: Gemini Vision → searchHybrid (text semantic)
```

## Product indexing flow

```
Product create/update
  → scheduleImageEmbeddingIfNeeded (image URL hash)
  → imageEmbeddingJobs queue
  → [optional] n8n webhook event
  → Convex scheduler fallback (30s) → processJobById
  → Next.js embed API → save imageEmbedding* fields
```

## Vector indexes

| Index | Field | Dimensions | Provider |
|-------|-------|------------|----------|
| `by_image_embedding` | `imageEmbedding` | 768 | SigLIP |
| `by_image_embedding_clip` | `imageEmbeddingClip` | 512 | CLIP |
| `by_embedding` | `embedding` | 384 | Gemini text (unchanged) |

SigLIP and CLIP vectors are **not interchangeable**. Products are tagged with `imageEmbeddingProvider`.

## Provider failover

1. **SigLIP** — primary for query and indexing
2. **CLIP** — fallback when SigLIP unavailable (circuit breaker in Next.js + Convex `providerHealth`)
3. **Gemini Vision** — extracts product attributes → existing hybrid text search
4. **User message** — friendly error with links to keyword/semantic search

## n8n optional design

- **Used for:** background embedding jobs, bulk rebuilds, retries, monitoring cron
- **Not used for:** customer searches, product pages, real-time responses
- **Fallback:** Convex `imageEmbeddingActions.processJobById` runs automatically after 30s if n8n does not complete the job

Disable n8n anytime: set `IMAGE_EMBEDDING_N8N_ENABLED=false` or remove workflows — storefront continues working.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `IMAGE_EMBED_API_SECRET` | Auth between Convex/n8n and Next.js embed API |
| `SITE_URL` | Base URL for Convex → Next.js calls (already synced via `npm run dev:sync-url`) |
| `SIGLIP_MODEL` | Default `Xenova/siglip-base-patch16-224` |
| `CLIP_MODEL` | Default `Xenova/clip-vit-base-patch32` |
| `IMAGE_EMBEDDING_N8N_ENABLED` | Default `true` (set `false` for Convex-only queue) |
| `GEMINI_API_KEY` | Vision fallback + existing text embeddings |
| `N8N_REVIEW_WEBHOOK_URL` | Shared webhook URL for optional n8n events |
| `N8N_WEBHOOK_SECRET` | n8n → Convex HTTP auth |

## Admin tools

- **`/admin/image-embeddings`** — metrics, queue stats, backfill, rebuild, per-product retry
- Product save automatically schedules embedding when primary image URL changes

## Monitoring

- `visualSearchEvents` — search analytics (provider, fallback, result count)
- `providerHealth` — circuit breaker state per provider
- `imageEmbeddingJobs` — queue depth (pending, processing, failed)
- n8n: `GET /n8n/image-embedding/health`

## Key files

- `convex/visualProductSearch.ts` — customer search action
- `convex/imageEmbeddingActions.ts` — background processor
- `convex/lib/ai/scheduleImageEmbedding.ts` — enqueue on product save
- `src/lib/ai/image-embedding/service.ts` — SigLIP/CLIP inference
- `src/app/(shop)/products/visual-search/page.tsx` — storefront UI
- `n8n/workflows/08-product-image-embedding.json` — optional automation

## Performance notes

- Embeddings regenerate only when primary image URL hash changes
- Query embeddings cached 24h in `visualSearchImageCache`
- Customer upload blobs deleted after search
- Max upload size: 5MB
