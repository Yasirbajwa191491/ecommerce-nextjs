# Recommendation Platform

Enterprise-style personalization built on top of the existing product intelligence stack. The original `getSimilarProducts`, hybrid ranking, and product embedding pipelines are unchanged.

## Current engine (unchanged)

- Product embeddings on `products.embedding`
- `productIntelligence` metadata
- `getSimilarProducts` for PDP "You May Also Like"
- `searchHybrid` + semantic fallback
- `hybridRank` popularity and keyword scoring

## Customer intelligence

### Identity

| Key | Storage | Usage |
|-----|---------|-------|
| `visitorId` | `localStorage` (`shop-visitor-id`) | Guest profile key |
| `customerKey` | Normalized email / phone | Identified shopper key |
| `sessionId` | `sessionStorage` | Search session correlation |

Profiles live in `customerRecommendationProfiles`. Behavior events append to `customerBehaviorEvents`.

### Signals

| Signal | Weight (default) |
|--------|------------------|
| Purchases | 1.0 |
| Reviews | 0.7 |
| Cart / wishlist | 0.5 |
| Voice activity | 0.45 |
| Semantic search | 0.4 |
| Product views | 0.25 |

Checkout merges `visitorId` into the email profile via `orders.saveCustomerProfile`.

## Customer embeddings

Composite vector from weighted product embeddings:

```
customerEmbedding = normalize(Σ weight × product.embedding)
```

Stored on the profile with `embeddingProvider = composite_product_vectors`.

## Hybrid recommendation engine

`recommendations.getRecommendations` composes:

| Component | Default weight |
|-----------|----------------|
| Customer interest | 40% |
| Product similarity | 30% |
| Purchase history / co-occurrence | 15% |
| Popularity | 10% |
| AI adjustment | 5% |

Weights are configurable in admin settings (`recommendation_scoring_weights`).

### Fallback ladder

1. `recommendationCache` hit
2. Profile + hybrid score
3. AI adjustment skipped on provider failure
4. `featured` / `bestSellers` / co-occurrence
5. Convex background jobs if n8n is disabled or fails

## Shop sections

| Page | Sections |
|------|----------|
| Home | Recommended For You, Trending, Continue Shopping, Recently Viewed, Because You Bought/Viewed, AI Suggested |
| PDP | Existing Similar Products + personalized sections |
| Cart | FBT, Complete Your Setup, Also Purchased, Accessories |
| Checkout | Last Minute, Frequently Added, Add-ons |

Component: `src/components/products/recommendation-section.tsx`

## AI provider architecture

Configured in admin settings:

- `recommendation_ai_primary_provider`
- `recommendation_ai_fallback_order`

Implementation: `convex/lib/ai/recommendationAiProvider.ts` using `executeWithProviderChain`.

Providers: Gemini, Groq, OpenRouter (Grok via model env), OpenAI.

AI outputs are optional: interest summaries, segments, explanations. Failures never block recommendations.

## n8n integration (optional)

Toggle: `recommendation_n8n_enabled` (default `false`).

HTTP routes under `/n8n/recommendations/*`:

- `health`, `due-jobs`, `process-due`, `process-job`
- `save-profile`, `save-cache`, `report-failure`

Convex always schedules a 30s fallback via `recommendationJobs`.

Workflow templates: `n8n/workflows/09-recommendation-cron.json`, `10-recommendation-processor.json`, `11-marketing-audiences.json`.

## Analytics

- Raw events: `recommendationEvents`
- Daily rollups: `recommendationAnalytics`
- Tracked in UI via impression/click hooks on `RecommendationSection`

## Admin

- Page: `/admin/recommendations`
- Settings: `/admin/settings` (recommendation_* keys)
- Operations: co-occurrence rebuild, profile refresh jobs

## Key files

| Area | Path |
|------|------|
| Public API | `convex/recommendations.ts` |
| Scoring | `convex/lib/recommendations/scoring.ts` |
| Profiles | `convex/lib/recommendations/profileBuilder.ts` |
| Sections | `convex/lib/recommendations/sections.ts` |
| Events | `convex/recommendationMutations.ts` |
| Jobs | `convex/lib/recommendations/scheduleRecommendationJob.ts` |
| UI | `src/components/products/recommendation-section.tsx` |

## Future expansion

- Shop customer auth + `orders.userId`
- Collaborative filtering matrix
- Image-embedding personalization
- A/B testing for scoring weights
