# Python content-based recommendations

This document explains the offline recommendation model in `services/ai-service`. It is a learning guide and an implementation note.

The model does **not** replace the store's current recommendations unless an administrator selects the `python_content` strategy. The default strategy is `convex`. Gemini, Groq, OpenRouter, OpenAI, Anthropic, product embeddings, visual search, and the Convex recommendation engine stay in place. The browser and the mobile app never call this Python service. When the Python strategy is selected, Convex reads a snapshot that was generated ahead of time.

## 1. What content-based recommendations are

A content-based recommender says: products that are described in a similar way are similar products.

If you are looking at wireless noise-cancelling headphones, the model looks for other products whose name, description, category, colors, highlights, and keywords use similar words, with a smaller contribution from brand (`company`) and price band. It does not look at who bought the product. That would be collaborative filtering, and this phase does not do that.

The store already has a different similarity system: 384-dimensional product embeddings and hybrid ranking in Convex. This Python model is a separate baseline you can train and score on your own machine.

## 2. What TF-IDF does

TF-IDF turns text into numbers.

- **Term frequency (TF)** asks how often a word appears in this product.
- **Inverse document frequency (IDF)** asks how rare that word is across the catalog. A word that appears in every product, such as a category name used everywhere, counts for less than a distinctive word such as "headphones".

Scikit-learn's `TfidfVectorizer` does both, then scales each product's text vector to length 1. This model uses unigrams and bigrams (`noise` and `noise cancelling`) and English stop words (`the`, `and`, `for`), which are dropped.

Before vectorizing, the pipeline joins the product name (repeated once so the title matters a little more), description, category name, colors, highlights, and SEO keywords into one document. A word in one product's title can then match the same word in another product's description. Empty optional fields add nothing. They are never turned into the literal words `None` or `nan`.

## 3. What cosine similarity means

Each product becomes a vector: a long list of numbers. Cosine similarity asks whether two vectors point the same way. It ignores how long the vectors are and looks at the angle between them.

- `1` means the same direction (very similar content).
- `0` means no shared weighted features.
- Values stay in `[0, 1]` here because the features are non-negative. Scores are rounded to 6 decimal places.

The query product is removed from its own result list. If two products have the same score, the one with the smaller product id comes first. That tie-break is deterministic.

## 4. How feature engineering works

The Convex `products` table does not have separate brand, tag, specification, or color-family columns. This model uses the fields that exist:

| Model input | Schema field |
| --- | --- |
| Text | `name`, `description`, `highlights`, `seoKeywords`, `colors`, plus `productCategories.name` |
| Brand category | `company` |
| Category category | `productCategories.slug` |
| Price band | `price`, and `discountPercent` when it is set |

Price bands are fixed and half-open: `[0, 25)`, `[25, 75)`, `[75, 200)`, `[200, 500)`, `[500, ∞)`. The band uses the sale price `price * (1 - discountPercent / 100)` when a discount is present.

`stars`, `reviews`, `featured`, `stock`, `sku`, and `currency` are stored in the dataset so a future export can include them. They are not similarity features. Popularity is a different question from "is this the same kind of product?"

Category, company, and price band are one-hot encoded (one column per observed value, with a 1 in the matching column). Those 0/1 columns are multiplied by `0.3` before they are joined to the TF-IDF vector. Without that scale, sharing a category adds as much raw weight as the entire text vector, and price band was outranking the headphone wording in early checks.

`active` is not a similarity feature. A missing `active` value means the product is eligible, matching `isProductActive` in Convex (`active !== false`). Inactive products can be queries, but they are not recommended.

## 5. Why preprocessing is needed

Raw catalog rows are messy. Preprocessing makes fitting repeatable:

- Product ids must match `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`.
- Text is Unicode-normalized (NFKC), casefolded, and collapsed to single spaces. `Café`, `CAFÉ`, and `Cafe` plus a combining accent become `café`.
- Missing descriptions stay empty.
- The first copy of a duplicate product id is kept. Later copies are rejected.
- Invalid prices, stock, stars, or types are rejected with a reason code.
- Rows are processed in file order, so the same file always produces the same accepted list.

The accepted rows are hashed into a dataset fingerprint. Relevance labels are not part of that hash.

## 6. What model fitting means in this pipeline

Fitting here does not mean gradient descent on a neural network. It means:

1. Load the validated products.
2. Build the feature table.
3. `TfidfVectorizer.fit` learns the vocabulary and IDF weights.
4. `OneHotEncoder.fit` learns the category, company, and price-band columns.
5. `transform` turns every product into a vector.
6. Those vectors are stored so later queries can compute cosine similarity.

On the synthetic catalog this produces a vocabulary of 624 terms and a vector width of 668 (text plus the one-hot columns).

Fitting is a command. The FastAPI process does not fit or load a model on startup. `ENABLE_MODEL_INFERENCE` still defaults to false. If you set it to true, `/health/ready` loads `CONTENT_MODEL_DIR` and returns HTTP 200 only after that trusted artifact verifies. A missing or invalid artifact returns HTTP 503.

## 7. How recommendations are ranked

`RecommendationModel.recommend(product_id, top_k)`:

1. Rejects an unknown id with `Unknown product id: ...` and no stack trace on the CLI.
2. Loads that product's vector.
3. Computes cosine similarity against every other vector.
4. Drops the query product and inactive products.
5. Sorts by descending score, then by product id.
6. Returns at most `top_k` rows (1 through 100).

Each row has `product_id`, `score`, `rank`, and `model_version` (`content-v1`). The score is the fitted cosine, not a random number and not a hand-written ranking.

## 8. How training differs from inference

| | Training | Inference |
| --- | --- | --- |
| When | You run the training command | You run the inference command, or a future API |
| Input | A product JSONL file | A product id and `top_k` |
| Work | Learn vocabulary, IDF, and one-hot columns; save vectors | Load the saved vectors and compare |
| Output | An artifact directory | A ranked list |
| Convex | Not used | Not used |

Training can change the vectors. Inference only reads them.

## 9. How model artifacts are saved

Artifacts go to `services/ai-service/artifacts/recommendations/content-v1/`:

- `model.joblib` — fitted transformer, product-id list, eligibility flags, and the feature matrix
- `manifest.json` — model version, training time, dataset fingerprint, feature configuration, library versions, and a SHA-256 of the joblib file

Files are written in a staging directory and moved into place only after the manifest is complete. A failure leaves the previous directory as it was.

**Only load joblib files you created.** Unpickling a joblib or pickle file can run code. The loader refuses to unpickle unless the caller passes `trusted=True`, and it checks the model version, the scikit-learn major.minor version, and the checksum first.

Generated datasets, reports, and `*.joblib` files are gitignored.

## 10. How evaluation metrics are calculated

Labels live in `relevance.jsonl`, not in the feature file. For this synthetic catalog, a label group is a set of products that should be recommended to each other (for example the three headphone ids). The group id is not a column on the product row.

For each eligible product that has at least one other labeled product:

- **Precision@K** = (relevant items in the top K) / K. The denominator is K even when the list is shorter.
- **Recall@K** = (relevant items in the top K) / (number of relevant items).
- **HitRate@K** = 1 if any top-K item is relevant, otherwise 0.

Those three are macro-averaged: each labeled query counts equally. Queries with an empty label set are skipped, not treated as zeros in the average.

**Coverage** = distinct recommended products / eligible products. The denominator is the catalog size.

**Category diversity** and **intra-list diversity** describe the lists. Intra-list diversity is the average cosine distance inside a list, in the same vector space the model uses, so it is not an independent judgment of quality.

The baseline recommends other eligible products in the same `category_slug`, sorted by product id. No learning.

The metric functions do not use randomness. The evaluation command still sets seed 42 so the report records a fixed seed.

## 11. What limitations synthetic data introduces

The headphone products were written with headphone wording, and the relevance file says those products are relevant to each other. The label column is not fed to the vectorizer, but the text was written to agree with the labels. A high score means the pipeline can recover that authored structure. It does **not** mean the model will improve conversion, personalization, or revenue on the live store.

There are no real customers, clicks, or orders in this dataset. `recommendationEvents` exist in Convex and are not used here.

Product ids were also chosen so a same-category id sort does not accidentally list the labeled neighbors first. That makes the baseline a real comparison instead of an accident of naming.

## 12. How this differs from LLM-based recommendations

The current recommendation AI asks a language model for summaries, segments, or small score adjustments. If the provider fails, Convex still returns recommendations.

This Python model never calls Gemini, Groq, OpenRouter, OpenAI, or Anthropic. It does not read a prompt. It only compares product text and a few categorical fields with linear algebra. It cannot explain a recommendation in a sentence unless a later phase adds that separately. It also cannot use a shopper's history, because no shopper history is in the training file.

## 13. Phase 2B: real catalog snapshots

The storefront still asks Convex for recommendations. Convex does not call FastAPI during a shopper request. A separate workflow exports the catalog, trains an artifact, writes a top-K file, and stores that file as a snapshot. The active strategy decides which source `getSimilarProducts` reads.

```text
Web / Mobile
    |
    v
Convex query and action layer
    |
    v
Recommendation strategy resolver
    |                         |
    v                         v
Existing Convex engine     Published Python snapshot
    |                         |
    +-----------+-------------+
                |
                v
         Product responses
```

`convex` runs the existing similar-products and recommendation code. `python_content` is allowed only after a snapshot is published. Personalized sections such as "recommended for you" stay on the Convex engine, because this model has no shopper features. Item-to-item similar products, and the product-anchored sections `because_you_viewed` and `recommended_alternatives`, read the snapshot. If the snapshot is missing, the source product is inactive, or every target was removed, those requests use the existing Convex implementation.

The implementation version stays `content-v1`. A real-catalog training run writes a separate artifact version, `content-v1-` plus the first 12 characters of the dataset fingerprint, under `artifacts/recommendations/runs/`. It refuses to write that run into the `content-v1` directory and refuses to overwrite an existing run directory. Synthetic training still writes `artifacts/recommendations/content-v1/`.

Real catalog records are sorted by product id before the fingerprint and the fit. The same products in a different export order produce the same fingerprint. Relevance labels are still excluded from the fingerprint.

### Export

Set `CATALOG_EXPORT_TOKEN` on the Convex deployment and the same value in the Python environment, plus `CATALOG_EXPORT_URL` (the `.convex.site` origin). The token is not an admin session and is not sent to the browser. Requests without it receive 401. If the token is unset, the HTTP routes return 503.

```bash
cd services/ai-service
uv run python -m training.export_catalog --output datasets/exports/products.jsonl
```

Pages are at most 50 products, ordered by the `by_name` index. Each row keeps the Convex product id, the category name and slug, price, discount, and `active`. Embeddings, images, orders, and customer fields are not included. `datasets/exports/` is gitignored.

A signed-in administrator can also read one page from `api.adminContentRecommendations.exportCatalogPage`.

### Train, generate, and publish

Training does not run when a product changes. Run it explicitly.

```bash
cd services/ai-service
uv run python -m training.train_recommendations --source real_catalog --dataset datasets/exports/products.jsonl
uv run python -m app.ml.inference.batch --artifacts artifacts/recommendations/runs/<artifact-version> --output datasets/exports/recommendations.jsonl --top-k 8
uv run python -m training.publish_snapshot --manifest datasets/exports/recommendations.manifest.json --recommendations datasets/exports/recommendations.jsonl
```

The batch command writes one JSONL row per eligible product and a sibling `recommendations.manifest.json`. Both files are replaced only after the temporary file is written. The publish command checks that the file's row count matches `product_count` before it calls Convex. It then creates a staging snapshot, appends batches of 20, and publishes only when the stored count equals the expected count. Each run uses a new snapshot id, `snap-` plus 12 fingerprint characters plus the time in milliseconds, so publishing the same catalog again does not collide with the previous id. Pass `--snapshot-id` only when you want a specific id. If a request fails after the snapshot is created, the command marks that staging snapshot failed. The previous published snapshot stays available until publication succeeds, then it is archived. A failed, staging, or incomplete snapshot is not read by the storefront.

Cleanup deletes archived and failed snapshots, in batches of 25 item rows, and does not delete the published snapshot. From the admin recommendations page this is not a button; call `api.adminContentRecommendations.cleanupOldSnapshots` or the internal `cleanupSnapshots` mutation. Do not delete the published snapshot by hand.

### Strategy

Settings, not environment variables:

```typescript
{
  recommendationStrategy: "convex",
  fallbackStrategy: "convex",
  pythonModelVersion: "content-v1"
}
```

Missing rows mean `convex` and `content-v1`. `hybrid` is rejected. The existing `recommendation_fallback_strategy` ladder (`personalized_then_similar_then_popular`) is a different setting and is left alone.

Administrators change the strategy on the Recommendations admin page or with `api.adminContentRecommendations.setRecommendationStrategy`. `python_content` is rejected until a published snapshot exists. Changing it does not require a redeploy. The default remains `convex`, and this phase does not switch a deployment to `python_content` on its own.

### Admin Settings for Python ML flags

Live Python ML is a separate control from `recommendation_strategy`. It uses the existing `/admin/settings` page and the existing `settings` table. There is no second feature-flag screen.

| Key | Name | Type | Default |
| --- | --- | --- | --- |
| `enable_python_ml_recommendations` | Enable Python ML Recommendations | Boolean (`true` / `false`) | `false` |
| `python_ml_recommendation_mode` | Python ML Recommendation Mode | `off`, `shadow`, or `serve` | `off` |
| `python_ml_request_timeout_ms` | Python ML Request Timeout (ms) | Integer | `1500` |

The timeout must be a whole number from 250 through 5000 milliseconds. Values outside that range are rejected on save. A missing or invalid stored timeout is read as 1500.

Effective mode is `off` when the enable flag is false, when the mode is missing or not one of the three allowed values, or when the settings cannot be loaded. A stored mode of `shadow` or `serve` does not run by itself.

Python ML may run only when all of these are true:

- `enable_python_ml_recommendations` is `true`
- the effective mode is `shadow` or `serve`
- `PYTHON_AI_SERVICE_URL` is a valid HTTP(S) URL with no embedded credentials
- `PYTHON_AI_SERVICE_API_KEY` is set
- a published content snapshot exists and its model version is `content-v1`

`shadow` may run that check without changing the products a customer sees. `serve` still does not change customer-visible recommendations unless the deployment variable `PYTHON_ML_SERVE_ENABLED` is exactly `true`. That variable defaults to unset, which is off. Saving `serve` in Admin Settings is not enough.

`PYTHON_AI_SERVICE_URL` and `PYTHON_AI_SERVICE_API_KEY` stay in the Convex environment. They are not settings rows. Public settings queries do not return them, and admin settings responses redact credential-shaped keys and values. Only an admin can update the three ML rows.

Shopper recommendation requests do not load these flags. Background recommendation jobs read the effective configuration and keep writing Convex results. If the Python service is unconfigured, the model is incompatible, or a Python call fails, the customer-visible source stays the existing ranker.

The older recommendation toggles (`recommendation_ai_enabled`, `recommendation_strategy`, and the rest of the `recommendation_*` keys) keep their current meaning.

### Freshness and rollback

Inactive and deleted targets are dropped when the snapshot is read. Price, category, and description changes do not retrain the model. The admin status marks a published snapshot stale when it is older than `recommendation_refresh_hours`. Regenerate by exporting, training, and publishing a new snapshot.

Rollback is `setRecommendationStrategy({ recommendationStrategy: "convex" })`. The storefront returns to the existing ranker on the next similar-products request. Leave the published snapshot in place; it is unused while the strategy is `convex`.

### Offline comparison

Synthetic evaluation is unchanged:

```bash
cd services/ai-service
uv run python -m evaluation.evaluate_recommendations
```

Real-catalog diagnostics fit the exported file in memory and do not call Convex:

```bash
uv run python -m evaluation.catalog_diagnostics --dataset datasets/exports/products.jsonl --output evaluation/reports/real-catalog-diagnostics.json
```

Without a relevance file the report has coverage, diversity, inactive-target count, duplicate rate, self-recommendation rate, category counts, score distribution, missing lists, and completeness. It does not report precision or recall. Pass `--relevance` only when you have labels. Add `--production-labels` only when those labels are real. The report always sets `production_quality_claim` to false. The comparison baseline is the same-category id sort. The live Convex hybrid ranker is not executed in this command; it remains the request-time fallback.

### Authenticated inference

`POST /api/v1/recommendations/content` and `POST /api/v1/recommendations/content/batch` require `Authorization: Bearer` with `AI_SERVICE_API_KEY`. They load `CONTENT_MODEL_DIR` only when `ENABLE_MODEL_INFERENCE=true`. Otherwise they return `model_inference_disabled`. `top_k` is 1 through 100. The batch route accepts at most 25 ids. Unknown ids return `unknown_product`. Paths and stack traces are not included.

`/health/ready` returns HTTP 200 with `model_inference: disabled` when inference is off. When inference is on, it returns HTTP 200 with `model_inference: ready` only after a trusted artifact loads, and HTTP 503 with `model_inference: unavailable` when the artifact is missing, corrupt, or incompatible. `/health/live` stays HTTP 200 either way. The store does not use that probe to decide whether to show products.

### Local development and production

Local commands are the export, train, batch, and publish commands above, plus `npx convex dev` for the Convex functions. Do not commit exports, joblib files, or the catalog token.

Production needs the Convex functions deployed by your normal release process, `CATALOG_EXPORT_TOKEN` set in the Convex environment, and the Python service only if you want the optional HTTP inference route. Storefront availability does not depend on that process. Do not point `CONTENT_MODEL_DIR` at an untrusted file. Do not switch the live strategy to `python_content` until a snapshot has been published and reviewed.

## Worked example

`sample-a-01` is the synthetic product "Northwave Travel Headphones".

After validation the fields are:

- name: `northwave travel headphones`
- company: `northwave`
- category: `audio`
- list price `89` with a 10% discount, so the sale price is `80.1`, band `75_to_200`
- colors: `black`
- highlights: `active noise cancelling`, `over-ear fit`
- keywords: `bluetooth`, `travel headphones`

The text document (name repeated, then description, category, color, highlights, and keywords) is:

```text
northwave travel headphones northwave travel headphones wireless over-ear headphones with active noise cancelling and bluetooth for travel. includes a hard travel case. audio black active noise cancelling over-ear fit bluetooth travel headphones
```

TF-IDF turns that document into part of a 668-number vector. The one-hot block marks `audio`, `northwave`, and `75_to_200`, each scaled by 0.3.

Cosine similarity against the other fitted vectors, after dropping `sample-a-01` itself and the inactive headphone `sample-a-07`, ranks:

| Rank | Product | What it is | Score |
| --- | --- | --- | --- |
| 1 | `sample-a-08` | Another noise-cancelling headphone | 0.370063 |
| 2 | `sample-a-09` | Headphone with an empty description; the name still matches | 0.265626 |
| 3 | `sample-a-03` | Bookshelf speaker in the same Audio category | 0.157439 |
| 4 | `sample-c-01` | Mechanical keyboard | 0.078589 |
| 5 | `sample-k-04` | Blender | 0.075735 |

The two other labeled headphones are first. The same-category speaker is third, not first. Those scores come from the fitted model on this synthetic file.

## Reproduce

From `services/ai-service` (Windows PowerShell or bash):

```bash
uv sync
uv run python -m training.generate_sample_data
uv run python -m training.validate_dataset
uv run python -m training.train_recommendations
uv run python -m evaluation.evaluate_recommendations
uv run python -m app.ml.inference.cli --product-id sample-a-01 --top-k 5
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Phase 3 adds a separate collaborative and hybrid pipeline. It does not change `content-v1`. See [python-behavioral-collaborative-recommendations.md](python-behavioral-collaborative-recommendations.md).

Phase 4 adds `neural-v1` with CPU PyTorch. It does not replace the content, collaborative, or hybrid models. See [python-pytorch-neural-recommendations.md](python-pytorch-neural-recommendations.md).

From the repository root, `npm run ml:python-sample`, `ml:python-validate`, `ml:python-train`, and `ml:python-eval` run the same commands. `npm run dev` does not.
