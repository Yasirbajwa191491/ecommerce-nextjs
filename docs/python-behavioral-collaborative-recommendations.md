# Behavioral collaborative and hybrid recommendations

This is the Phase 3 model in `services/ai-service`. It learns which products are interacted with by the same visitors. It does not replace the storefront ranker. The default Python strategy is `content`. The storefront strategy `recommendation_strategy` stays `convex` unless an administrator changes that older setting.

Gemini, Groq, OpenRouter, OpenAI, Anthropic, visual search, the Convex recommendation engine, and the Phase 2 content model stay in place.

## 1. What behavioral recommendations are

A behavioral recommender says: products that the same visitors interact with are related, even when their descriptions differ.

If many visitors view running shoes and later add a second pair to the cart, the model can recommend that second pair from the first. It does not read the product title to do that. The Phase 2 content model does the opposite: it compares text and a few catalog fields, and it ignores who looked at the product.

## 2. What implicit feedback means

The store does not ask visitors to rate products. A view, a recommendation click, a cart add, or a paid order is a clue that the visitor was interested. Those clues are implicit feedback. A missing event is not a rating of zero. It usually means we never saw that pair.

## 3. How a visitor-product matrix works

Each row below is one visitor and each column is one product. The number is the aggregated weight, not a star rating.

| Visitor | Headphones A | Headphones B | Shoes |
| --- | ---: | ---: | ---: |
| Visitor 1 | 1 | 1 | 0 |
| Visitor 2 | 1 | 1 | 0 |
| Visitor 3 | 0 | 1 | 1 |

Headphones A and B share two visitors. Headphones A and Shoes share none. The model turns that table into a sparse matrix: it stores the non-zero weights and their positions, not a rectangle full of zeros.

## 4. How collaborative filtering works

This phase uses item-item cosine similarity. The vector for a product is the column of visitor weights. Cosine asks whether two columns point the same way.

For the table above, A is `(1, 1, 0)` and B is `(1, 1, 1)`.

```text
cosine(A, B) = (1*1 + 1*1 + 0*1) / (sqrt(2) * sqrt(3)) = 0.816497
```

A recommendation for A is B, then nothing else if the shoe similarity is zero. The query product is removed. Equal scores are ordered by product id. Scores are rounded to 6 decimal places. They are not random.

The fitted artifact keeps only the top neighbors for each product. Inference reads that list. It does not rebuild the matrix.

## 5. Why sparse matrices matter

A catalog of 20,000 products and 100,000 visitors would be 2 billion cells if stored densely. Almost all of those cells are zero. A SciPy CSR matrix stores the interactions that exist. Nearest neighbors are computed in batches and only the top K are saved, so the service does not allocate a 20,000 by 20,000 similarity table.

## 6. How content-based and collaborative recommendations differ

| | Content (`content-v1`) | Collaborative (`collaborative-v1`) |
| --- | --- | --- |
| Evidence | Name, description, category, company, price band | Views, clicks, cart adds, wishlist adds, paid purchases |
| Cold product | Still has text | Empty neighbor list |
| Shopper required | No | No, for item-to-item |
| Artifact directory | `artifacts/recommendations/content-v1/` | `artifacts/recommendations/collaborative-v1/` |

`content-v1` still means the TF-IDF cosine model. Collaborative training refuses to write into a directory named `content-v1`.

## 7. How hybrid ranking works

Content cosine and collaborative cosine are both in `[0, 1]`, but they are not the same unit. A content score of `0.4` is not "the same amount of evidence" as a collaborative score of `0.4`.

The default blend is reciprocal rank fusion, not a raw weighted sum:

```text
hybrid_score = content_weight / (60 + content_rank) + collaborative_weight / (60 + collaborative_rank)
```

Ranks start at 1. A product that only one model returns still gets that model's term. Weights are normalized so they sum to 1. `minmax` is available when you want each list rescaled to `[0, 1]` before the weighted sum. The response `strategy` is `hybrid` only when both lists contributed. If one model is missing, the response names the model that actually ranked the products and sets `fallback_reason`. A collaborative request never returns content results labeled as collaborative.

## 8. How cold-start fallback works

- A product with too few interactions is in the catalog and has an empty neighbor list. Hybrid then uses the content model and sets `fallback_reason` to `insufficient_collaborative_evidence` or `unknown_to_collaborative_model`.
- Item-to-item recommendations do not need the current visitor's history.
- An id that is in neither model raises an unknown-product error. The API returns HTTP 404. It does not invent neighbors.
- If Python is down, Convex shopper queries do not call it. They keep using the existing engine.

## 9. How training and inference differ

Training reads events, aggregates weights, fits neighbors, and writes an artifact. You run that command yourself. FastAPI does not train, and it does not load a model until `ENABLE_MODEL_INFERENCE=true` and a request arrives.

Inference loads the artifact, checks the checksum and `collaborative-v1` version, and returns a ranked list.

## 10. How temporal evaluation works

Events are ordered by time. The cutoff is a quantile of that order, default 0.8. Training uses events strictly before the cutoff. Test events are the ones at or after the cutoff.

For each visitor who has history before the cutoff and a new product after it:

- The query product is their latest training product.
- Relevant products are test products they had not already touched.
- Precision@K divides hits by K.
- Recall@K divides hits by the size of that relevant set.
- HitRate@K is 1 when any top-K id is relevant.
- NDCG@K uses binary gain and an ideal list that places relevant ids first.

Queries with no future product are skipped, not scored as zero. If there are no queries, the report says `insufficient_data` instead of printing zeros. The popularity baseline ranks training products by total weight. These numbers are not revenue.

## 11. How synthetic data differs from real interaction data

`training.generate_behavioral_data` writes a fixed seed-42 file. Every row has `source: synthetic`. The manifest says the file is synthetic. Audio visitors prefer headphones, a runner prefers shoes, one product has no events, one visitor is only a label, and some rows are intentionally invalid so validation can reject them.

A high score on that file means the pipeline recovered the authored pattern. It does not mean the model will increase conversion.

## 12. How privacy and consent are handled

Existing events already exist:

| Signal | Where it lives | Used for training export |
| --- | --- | --- |
| Product view, cart add, wishlist add | `customerBehaviorEvents` | Yes, after minimization |
| Recommendation impression and click | `recommendationEvents` | Yes, after minimization |
| Paid purchase | `orders` with `paymentStatus = paid` and a completed status, and stock not released | Yes. Client `purchase` events are ignored |
| Search text, email, phone | profiles and some events | No |

Web visitors are `localStorage` key `shop-visitor-id` (a UUID). Mobile uses the same key in AsyncStorage. That id is stable on one device and is still personal data. It is not linked across devices. Checkout can merge a visitor into an email profile for the existing recommendation engine. The ML export does not copy email, phone, address, or that merge.

There is a checkout privacy acceptance. There is no separate analytics-consent control. Because of that, this phase does not add new persistent tracking and does not turn the export on. `BEHAVIORAL_EXPORT_ENABLED` must be `true`, and Convex must have `BEHAVIORAL_EXPORT_TOKEN` and `BEHAVIORAL_EXPORT_SALT`, or the HTTP route returns 503. The route replaces visitor and order ids with HMAC tokens before the response leaves Convex.

Public behavior mutations reject `purchase`. Paid orders record a purchase once per order and product.

## 13. How the system integrates with Convex

Shoppers still call Convex. Convex calls Python only from the admin shadow action, and only when Python ML is enabled, the mode is `shadow` or gated `serve`, the service URL and key exist, and a compatible content snapshot is already the readiness signal used by Phase 2B. The shadow action compares Python lists with co-occurrence neighbors for at most five products. It does not change the products a customer sees.

`python_ml_recommendation_strategy` selects `content`, `collaborative`, or `hybrid` for that Python call. Default `content`. It does not change `recommendation_strategy`.

## 14. How model versions and artifacts are managed

| Artifact | Version | Directory |
| --- | --- | --- |
| Content | `content-v1` | `artifacts/recommendations/content-v1/` |
| Collaborative | `collaborative-v1` | `artifacts/recommendations/collaborative-v1/` |
| Hybrid weights | `hybrid-v1` | `artifacts/recommendations/hybrid-v1/hybrid.json` |

Each collaborative manifest records the dataset fingerprint, feature version `behavioral-implicit-v1`, weighting config, product, visitor, and interaction counts, matrix sparsity, training duration, and library versions. Files are written to a staging directory and moved into place after the checksum is stored. Loaders refuse an untrusted joblib file, a bad checksum, and a mismatched model or scikit-learn major.minor version.

## 15. How to train, evaluate, and run inference locally

From `services/ai-service`:

```bash
uv sync
uv run python -m training.generate_behavioral_data
uv run python -m training.validate_behavioral_dataset --dataset datasets/synthetic/behavioral_events.jsonl
uv run python -m training.aggregate_interactions --dataset datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --output datasets/synthetic/behavioral_interactions.jsonl
uv run python -m training.train_collaborative --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --min-product-interactions 1
uv run python -m training.configure_hybrid
uv run python -m evaluation.evaluate_behavioral --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --output evaluation/reports/behavioral.json
uv run python -m app.ml.inference.behavioral_cli --collaborative-dir artifacts/recommendations/collaborative-v1 --product-id hp-1 --strategy collaborative --top-k 3
```

`training.export_behavioral` is the authorized Convex pull. It exits unless `BEHAVIORAL_EXPORT_ENABLED=true`. Local training does not need Convex credentials.

The authenticated inference route is `POST /api/v1/recommendations/behavioral` with `strategy` set to `content`, `collaborative`, or `hybrid`. `POST /api/v1/recommendations/content` is unchanged and does not grow a strategy field.

## Aggregation rules

1. Reject rows with a personal field, a bad id, or a bad timestamp.
2. Drop products that are not in the optional catalog.
3. Drop a visitor with more than 500 raw events.
4. Inside a 30-minute session, keep one event per visitor, product, and type.
5. Keep at most 20 events of each type for a pair.
6. Optional half-life decay uses the latest kept timestamp. It is off unless you pass `--half-life-days`.
7. The first event contributes its base weight. Repeats add a logarithm of that base, so twenty views stay below one purchase at the default weights.
8. The same purchase order id counts once per visitor and product.

Default weights, which evaluation also compares with a uniform scheme and a purchase-heavy scheme:

| Event | Weight |
| --- | ---: |
| Product view | 1 |
| Recommendation impression | 0.5 |
| Recommendation click | 2 |
| Product comparison | 2 |
| Search-result click | 2 |
| Wishlist addition | 3 |
| Add to cart | 4 |
| Completed purchase | 6 |

## What is implemented and what is not

Implemented: synthetic dataset, validation, aggregation, sparse item-item model, hybrid fusion, temporal evaluation, versioned artifacts, authenticated strategy inference, the `python_ml_recommendation_strategy` setting, a disabled-by-default export route, and an admin shadow comparison that records real call results or an explicit skipped state.

Not implemented: production deployment, automatic retraining, customer-visible serve replacement, a new shopper account system, and cross-device identity.
