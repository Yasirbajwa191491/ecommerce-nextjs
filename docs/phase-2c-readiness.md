# Phase 2C readiness

This note records the code review, the fixes applied, the commands that actually ran, and the checks that are still pending. It does not authorize a production strategy change.

Phase 2D follow-up is in `docs/phase-2d-staging-validation.md`. That pass fixed `/health/ready` and the mobile type-check errors recorded below. It did not export a live catalog or deploy.

The default recommendation strategy remains `convex`. Shopper requests do not call the Python service. Rollback is an admin setting change, not a redeploy.

## Architecture

```text
Web and mobile
    |
    v
Convex getSimilarProducts / getRecommendations
    |
    +-- strategy convex --> existing ranker
    |
    +-- strategy python_content --> published contentRecommendationItems
                                    |
                                    +-- missing, inactive, or empty --> existing ranker
```

Offline, and only when an operator runs it:

```text
GET /ml/catalog/export  ->  train  ->  batch JSONL  ->  publish snapshot
```

Personalized sections stay on the Convex engine. `python_content` applies to similar products and to the product-anchored sections `because_you_viewed` and `recommended_alternatives`.

## Review findings

### Fixed in this pass

| Severity | Location | Impact | Fix |
| --- | --- | --- | --- |
| High | `services/ai-service/training/publish_snapshot.py` | The snapshot id was `snap-` plus 12 fingerprint characters. Publishing the same catalog again was rejected with "Snapshot id already exists". | Each run now uses `snap-{fingerprint12}-{milliseconds}` unless `--snapshot-id` is set. |
| High | `services/ai-service/training/publish_snapshot.py` | A short recommendation file could be published as complete because the expected count was the file length, not the manifest `product_count`. | The file is rejected locally when the row count, scores, duplicates, or self-targets do not match the manifest. No Convex write happens. |
| High | `services/ai-service/training/publish_snapshot.py` and `convex/mlCatalogHttp.ts` | An append failure left a staging snapshot. Cleanup only removes archived and failed rows, so the id stayed blocked. | `POST /ml/recommendations/snapshots/fail` marks that staging snapshot failed. The previous published snapshot stays in place. |
| Medium | `convex/lib/recommendations/contentRecommendationStore.ts` | Publication archived at most 8 previously published snapshots. | Publication pages through published rows, 8 at a time, up to 32 passes. |
| Medium | `services/ai-service/app/ml/inference/batch.py` | A crash during `write_text` could leave a partial JSONL. | The JSONL and manifest are written to a temporary file and then replaced. |
| Low | `convex/mlCatalogHttp.ts` | Invalid JSON or an invalid export cursor surfaced as an unhandled failure. | Those requests return HTTP 400. |

### Accepted behavior, not changed

- Phase 2D changed `/health/ready`. Inference off stays HTTP 200 with `model_inference: disabled`. Inference on returns HTTP 200 with `model_inference: ready` only after a trusted artifact loads, and HTTP 503 when that artifact is missing or invalid. The container health check still uses `/health/live`. Shoppers do not use this probe.
- A published snapshot older than `recommendation_refresh_hours` is marked `stale` on the admin page and is still served. Regenerate it by exporting, training, and publishing. It does not fall back by itself.
- If the publisher process is killed after creating a snapshot and before the fail request, a staging row can remain. It is not read by the storefront. An admin can call `api.adminContentRecommendations.failSnapshot`, then `cleanupOldSnapshots`.
- `getContentSimilarProducts` is a public query. It returns product ids and scores for the active strategy. It does not return customer profiles, orders, or embeddings.

No critical authentication bypass or production-strategy switch was found. Gemini, Groq, OpenRouter, OpenAI, Anthropic, hybrid search, visual search, review AI, Business Copilot, email AI, content generation, and Vapi were not removed.

## Commands that ran

From `services/ai-service` on 14 October 2026:

| Command | Result |
| --- | --- |
| `uv run ruff check .` | Passed |
| `uv run ruff format --check .` | Passed after formatting `tests/ml/test_publish_snapshot.py` |
| `uv run pytest` | 88 passed, 1 warning (`StarletteDeprecationWarning` from FastAPI's test client) |
| `uv run python -m training.generate_sample_data` | Wrote the synthetic dataset. 34 accepted rows, 9 rejected rows in the validation report |
| `uv run python -m training.validate_dataset` | Completed in the same measurement run (0.034 seconds) |
| `uv run python -m evaluation.evaluate_recommendations` | Exit 0 in 5.923 seconds. Synthetic labels only. Precision@5 0.6500 versus baseline 0.5500. This is not a production quality claim |

From the repository root:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed (`apps/web`, which includes `convex/**/*.ts`) |
| `npm run typecheck:mobile` | Failed. Pre-existing implicit `any` in `apps/mobile/app.config.ts` and `apps/mobile/lib/google-services-file.test.ts`. Those files are outside this recommendation change |
| `npm run lint` | Passed with 0 errors and 31 existing warnings. None are in the recommendation admin page |
| `npm run build` | Passed. Next.js 16.2.7 compiled, typechecked, and generated 12 static pages. `/admin/recommendations` is in the route list |
| `npx vitest run` on the catalog export, snapshot, strategy, and export-auth tests | 11 passed |

The first pytest run, before the snapshot-publisher fix, was 84 passed. The later run includes the four publisher tests.

### Not executed

- Live Convex catalog export, snapshot publish, and strategy switching. `services/ai-service/.env` is not present, so `CATALOG_EXPORT_URL` and `CATALOG_EXPORT_TOKEN` are not configured here.
- Convex query latency, with and without `python_content`.
- Docker build. `docker` is not installed on this machine.
- Manual browser and device QA.
- The new GitHub Actions workflow. It has not run on a pull request.

## Local integration that did run

Safe synthetic catalog only. No customer export.

1. Generate and validate `datasets/synthetic/products.jsonl`.
2. Train into a temporary directory (`source=synthetic`).
3. Load that artifact with `trusted=True`.
4. Recommend `sample-a-01` with `top_k` 5. Five rows returned, and the product was not in its own list.
5. Write a top-8 batch. 33 eligible products, 8,276 bytes.
6. Evaluate the existing `artifacts/recommendations/content-v1` artifact against the synthetic relevance file.

Publisher failure cases covered by unit tests, without a Convex deployment:

- Truncated file: rejected before any HTTP call.
- Append failure: create, append, then fail. Publish is not called.
- Same fingerprint at two timestamps: two snapshot ids.
- Self-target: rejected locally.

These storefront cases are covered by `convex/lib/recommendations/contentSnapshot.test.ts` and the resolver in `contentRecommendationStore.ts`. They were not exercised against a live database:

| Case | Expected storefront behavior |
| --- | --- |
| Strategy `convex`, or any unrecognized value | Existing Convex ranker |
| `python_content` with a published row whose targets are still active | Snapshot order, capped at the requested limit (1–16) |
| Missing snapshot, model version mismatch, inactive source, or no remaining active targets | Existing Convex ranker |
| Inactive or deleted targets | Dropped. If none remain, existing ranker |
| Duplicate or self targets | Dropped |
| Stale snapshot | Still served. Admin status shows `stale` |
| Python process down | No shopper impact. Similar products read Convex |

## Performance (synthetic catalog only)

Measured on this machine. These numbers are not a production catalog benchmark.

| Step | Result |
| --- | --- |
| Sample generation | 0.011 seconds |
| Dataset validation | 0.034 seconds |
| Training, 34 rows, 668 features | 0.249 seconds |
| Python tracemalloc peak during training | 1,421,370 bytes. This does not include all native allocations |
| `model.joblib` | 36,812 bytes |
| `manifest.json` | 1,815 bytes |
| One `sample-a-01` query | 0.0028 seconds, 5 results |
| Batch inference, 33 eligible products, top 8 | 0.074 seconds |
| Evaluation mean model latency | 1.178 ms per query |
| Catalog export, snapshot write, Convex query latency | Not measured |

Batch generation compares every eligible product with the full matrix. A few dozen products are cheap. Measure again on a development export before treating a multi-thousand-product catalog as routine. Keep export pages at 50 and snapshot appends at 20.

## Docker and staging

The image definition is `services/ai-service/Dockerfile`. It uses Python 3.12, installs from `uv.lock` without dev dependencies, runs as user `app`, exposes port 8000, and starts Uvicorn. The image copies `app/` only. Datasets, training code, evaluation code, and `.env` are excluded by `.dockerignore`. No model artifact is baked in.

`docker` is not available here, so the image was not built and was not started.

Staging compose file, not started by `npm run dev`:

```bash
# From the repository root. Set a 32+ character AI_SERVICE_API_KEY in the shell.
# Point CONTENT_MODEL_HOST_DIR at a trusted artifact directory when inference is enabled.
docker compose -f docker-compose.python-ai.yml up --build
```

The compose file binds `127.0.0.1:8000`, sets a 1 GB memory limit and 1 CPU, mounts the artifact directory read-only, and runs the root filesystem read-only. Do not put the catalog token in this container. Training and publishing stay on the operator machine.

This was not deployed. Do not deploy it to a shared host until you explicitly approve that environment.

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `AI_SERVICE_API_KEY` | Python service | Bearer token for `/api/v1/**`. Required in production, at least 32 characters. Never `NEXT_PUBLIC_` or `EXPO_PUBLIC_` |
| `AI_SERVICE_API_KEY_PREVIOUS` | Python service | Optional previous key during rotation |
| `ENABLE_MODEL_INFERENCE` | Python service | Default `false`. `true` enables content routes and makes `/health/ready` verify `CONTENT_MODEL_DIR` |
| `CONTENT_MODEL_DIR` | Python service | Trusted artifact directory (`manifest.json` and `model.joblib`). Loaded per request, not at startup |
| `MODEL_ARTIFACTS_DIR` | Python service | Reserved artifact root. Startup does not load it |
| `CATALOG_EXPORT_URL` | Operator shell for the training CLIs | Convex HTTP origin (`.convex.site`), not `.convex.cloud` |
| `CATALOG_EXPORT_TOKEN` | Operator shell and the Convex deployment | Shared secret for `/ml/catalog/export` and `/ml/recommendations/*`. Unset returns 503 |
| `APP_ENV`, `APP_HOST`, `APP_PORT`, `LOG_LEVEL` | Python service | Process settings. Production requires HTTPS Convex URLs when those URLs are set |

The web app stays on its existing `NEXT_PUBLIC_CONVEX_URL`. It does not need the Python URL.

### Health

| Probe | Inference disabled | Inference enabled |
| --- | --- | --- |
| `GET /health/live` | 200 `{"status":"live"}` | 200 `{"status":"live"}` |
| `GET /health/ready` | 200, `model_inference: disabled` | 200 `ready` when the artifact verifies, otherwise 503 `unavailable` |

Both behaviors were covered by `services/ai-service/tests/test_health.py`.

## CI

`.github/workflows/checks.yml` runs, on pull requests and pushes to `main` or `master`:

- Python Ruff, format check, and pytest
- The Convex recommendation unit tests
- `docker build` of `services/ai-service`

It does not deploy Convex, Vercel, or the Python service. The workflow has not run yet. Web lint and web typecheck already have local scripts (`npm run lint`, `npm run typecheck`) and were not duplicated into a second web workflow.

## Manual QA checklist

Do not mark these passed until someone performs them. Expected behavior is from the current code.

### Recommendations

- [ ] With strategy `convex`, similar products match the existing ranker. Expected: no snapshot is read.
- [ ] After a published snapshot and strategy `python_content`, similar products follow snapshot order. Expected: ids come from `contentRecommendationItems`, then `products.listByIds` preserves that order.
- [ ] Switch back to `convex`. Expected: the next similar-products request uses the existing ranker. No redeploy.
- [ ] Delete the published snapshot's items, or choose a product with no row. Expected: existing ranker.
- [ ] Inactive source product. Expected: existing ranker.
- [ ] Inactive or deleted targets. Expected: those cards are absent. If none remain, existing ranker.
- [ ] Source product is not in its own list.
- [ ] No duplicate cards.
- [ ] Limit 8 returns at most 8. Values above 16 are clamped to 16.
- [ ] Ordering stays stable across two requests while the snapshot and catalog do not change.
- [ ] Product cards still show the current name, price, and image from `products.listByIds`.

### Admin

- [ ] An admin can open `/admin/recommendations` and see the strategy, fallback `convex`, model version `content-v1`, and snapshot metadata.
- [ ] An admin can select `convex` immediately.
- [ ] An admin cannot select `python_content` until a snapshot is published. The button stays disabled, and the mutation rejects the change.
- [ ] A signed-out user cannot call `setRecommendationStrategy`.
- [ ] `hybrid` is rejected by the settings validator.
- [ ] An incomplete snapshot cannot be published.
- [ ] A stale snapshot shows `stale` and can still be selected. Expected: results still come from that snapshot until you publish a newer one or switch to `convex`.

### Storefront and mobile

- [ ] Product detail loads.
- [ ] "You may also like" loads.
- [ ] `because_you_viewed` and `recommended_alternatives` follow the strategy. Other sections stay on Convex.
- [ ] Product links, images, and prices still render.
- [ ] Browser console has no new errors on the product page.
- [ ] Mobile similar products still render. Mobile `useRecommendations` sections are not the Python sections.
- [ ] Search results are unchanged.

### Failures

- [ ] Stop the Python process. Expected: storefront still loads. It never calls that process.
- [ ] No published snapshot. Expected: Convex ranker.
- [ ] Snapshot older than the refresh window. Expected: still served, admin shows stale.
- [ ] `CONTENT_MODEL_DIR` missing while inference is enabled. Expected: content HTTP routes return 503 `model_unavailable`. Storefront unchanged.
- [ ] Snapshot contains an inactive target. Expected: that target is omitted.
- [ ] Publish stops after a partial append. Expected: snapshot stays unpublished; a caught failure is marked failed; the previous published snapshot remains.
- [ ] `recommendation_strategy` setting missing. Expected: `convex`.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Export returns 503 | `CATALOG_EXPORT_TOKEN` is unset on the Convex deployment |
| Export returns 401 | The shell token does not match the Convex token |
| `python_content` is rejected | No snapshot is published |
| Publish says the file does not match | Regenerate the batch. Do not hand-edit the JSONL |
| Publish says the snapshot id already exists | Omit `--snapshot-id`, or pass a new one |
| Similar products did not change | Strategy is still `convex`, the source is inactive, or that product has no snapshot row |
| `/health/ready` is 503 | Inference is enabled and `CONTENT_MODEL_DIR` is missing, corrupt, or incompatible. Use `/health/live` for the container probe |
| Storefront is down while Python is down | This should not happen. Shoppers do not call Python. Look at Convex and the web host |

## Model artifacts

Train on a machine you trust. Copy only the artifact directory you produced (`manifest.json` and `model.joblib`). Mount it read-only at `CONTENT_MODEL_DIR`. Do not load a joblib file you did not write. Real-catalog runs go under `artifacts/recommendations/runs/content-v1-{fingerprint12}/` and do not replace `artifacts/recommendations/content-v1/`.

```bash
cd services/ai-service
uv run python -m training.export_catalog --output datasets/exports/products.jsonl
uv run python -m training.validate_dataset --dataset datasets/exports/products.jsonl
uv run python -m training.train_recommendations --source real_catalog --dataset datasets/exports/products.jsonl
uv run python -m app.ml.inference.batch --artifacts artifacts/recommendations/runs/<artifact-version> --output datasets/exports/recommendations.jsonl --top-k 8
uv run python -m training.publish_snapshot --manifest datasets/exports/recommendations.manifest.json --recommendations datasets/exports/recommendations.jsonl
```

`validate_dataset` defaults to the synthetic file. Pass `--dataset` for an export.

Publish from a development Convex deployment first. `datasets/exports/` is gitignored. Do not commit exports or joblib files.

## Strategy switch and rollback

1. Publish a snapshot on the development deployment and review the admin metadata.
2. An admin selects **Use Python content** on `/admin/recommendations`, or calls `api.adminContentRecommendations.setRecommendationStrategy` with `python_content`.
3. To roll back, the same admin selects **Use Convex**. The next similar-products request uses the existing ranker. Leave the snapshot published; it is unused while the strategy is `convex`.

Do not set production to `python_content` in this phase.

## Production readiness

Not ready for production activation.

- [x] Security review of the Phase 2A/2B paths, with the publisher fixes above
- [x] Python tests, Ruff, web typecheck, and recommendation unit tests
- [ ] Staging container started and probed
- [ ] Manual QA
- [ ] Development-catalog performance, not only the 34-row synthetic set
- [ ] Monitoring beyond process logs and the two health routes
- [ ] A trusted real-catalog artifact published to the target deployment
- [ ] Snapshot publication against that deployment
- [ ] Rollback tried on that deployment by switching back to `convex`
- [x] `convex` remains the default and is still implemented

## Before any production activation

1. Deploy the Convex functions through the normal release process. Do not use `npx convex deploy` as a development shortcut.
2. Set `CATALOG_EXPORT_TOKEN` on that deployment and in the operator shell. Do not put it in the web or mobile bundle.
3. Export, train, evaluate, and publish a snapshot from the development deployment. Confirm stored count equals expected count.
4. Build and run the Python image only if you want the optional HTTP inference route. The storefront does not require it.
5. Complete the manual QA checklist on staging.
6. Keep the strategy on `convex` until an authorized admin explicitly switches it, after the snapshot has been reviewed.
7. Roll back by selecting `convex` if the snapshot looks wrong. No new deployment is required for that switch.
