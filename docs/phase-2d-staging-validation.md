# Phase 2D staging validation

Recorded 14 October 2026. This note lists what actually ran. It does not authorize a production strategy change or a production deploy.

**Status: READY FOR STAGING.**

The default recommendation strategy remains `convex`. Shopper requests do not call the Python service. Rollback is an admin setting change, not a redeploy. `python_content` was not activated on any deployment.

## Issues fixed

| Issue | Change |
| --- | --- |
| `/health/ready` returned 503 whenever inference was enabled, even after a valid artifact existed | Inference off still returns HTTP 200 with `model_inference: disabled` and does not load an artifact. Inference on returns HTTP 200 with `model_inference: ready` only after `open_cached_content_model` loads a trusted artifact. Missing, corrupt, incompatible, or unloaded artifacts return HTTP 503 with `model_inference: unavailable`. The response body does not include paths or exception text. |
| Startup loaded nothing, and the readiness probe did not either | Startup still does not load the artifact. The readiness probe loads it and caches `(manifest mtime, resolved path, model)` on `app.state.content_recommendation_model`. Authenticated inference routes use the same cache. |
| `/health/live` could have been tied to the model | It stays HTTP 200 `{"status":"live"}` in every readiness state. The Docker `HEALTHCHECK` still calls `/health/live`, so a missing model does not restart the container. |
| Mobile `tsc` failed with implicit `any` on callbacks in `apps/mobile/app.config.ts` and `apps/mobile/lib/google-services-file.test.ts` | Those callback parameters are annotated as `string`. The JavaScript resolver was not rewritten. |

No recommendation algorithm was added. Gemini, Groq, OpenRouter, OpenAI, Anthropic, hybrid search, visual search, review AI, Business Copilot, email AI, content generation, Vapi, the Convex ranker, and the storefront were not changed in this pass.

## Files modified

- `services/ai-service/app/api/routes/health.py`
- `services/ai-service/app/api/routes/recommendations.py`
- `services/ai-service/app/ml/inference/recommendations.py`
- `services/ai-service/app/ml/inference/__init__.py`
- `services/ai-service/app/schemas/__init__.py`
- `services/ai-service/tests/test_health.py`
- `services/ai-service/tests/test_content_inference.py`
- `services/ai-service/.env.example`
- `apps/mobile/app.config.ts`
- `apps/mobile/lib/google-services-file.test.ts`
- `docs/python-ml-recommendations.md`
- `docs/python-ai-service.md`
- `docs/phase-2c-readiness.md`
- `docs/phase-2d-staging-validation.md` (this file)

## Tests executed

From `services/ai-service`:

| Command | Result |
| --- | --- |
| `uv run ruff check .` | Passed |
| `uv run ruff format --check .` | Passed (62 files already formatted) |
| `uv run pytest` | 92 passed, 1 warning (`StarletteDeprecationWarning` from FastAPI's test client) |

The new readiness tests cover: inference disabled (200 `disabled`), inference enabled with an empty directory (503), a missing directory (503), a trusted artifact (200 `ready`, and the cache is empty before the first probe), a corrupt `model.joblib` (503), and an incompatible `model_version` (503). Each failure case also asserts `/health/live` is 200.

From the repository root:

| Command | Result |
| --- | --- |
| `npm run typecheck:mobile` | Passed (`tsc --noEmit`, exit 0) |
| `npx vitest run` on catalog export, snapshot, strategy, and export-auth tests | 11 passed |
| `npm run typecheck` | Passed (`apps/web`, which includes `convex/**/*.ts`) |
| `npm run lint` | Passed with 0 errors and 31 existing warnings. None are in the recommendation files changed here |
| `npm run build` | Passed. Next.js 16.2.7 compiled and generated the production route list, including `/admin/recommendations` |

## Development catalog integration

Not executed. No catalog was exported, trained, fingerprinted, batched, or published. No strategy was switched.

Convex status for this workspace shows one host, `beaming-ferret-224.convex.cloud`, and that selector is the production deployment (`readOnly: true` on the production selector). The local `CONVEX_DEPLOYMENT` name starts with `dev`, but it points at that same production host. `services/ai-service/.env` is not present, so `CATALOG_EXPORT_URL` and `CATALOG_EXPORT_TOKEN` are unset.

Those commands were not run against production. There is no separate development or staging Convex deployment configured in this workspace.

To run the pipeline later, on a deployment that is not production:

1. Create or select a development Convex deployment. Confirm its host is not `beaming-ferret-224.convex.cloud`.
2. Set `CATALOG_EXPORT_TOKEN` on that deployment (32+ characters). Leave it unset on production.
3. In the operator shell, from `services/ai-service`, set:
   - `CATALOG_EXPORT_URL` to that deployment's `.convex.site` origin (not `.convex.cloud`)
   - `CATALOG_EXPORT_TOKEN` to the same secret
4. Then:

```bash
cd services/ai-service
uv run python -m training.export_catalog --output datasets/exports/products.jsonl
uv run python -m training.validate_dataset --dataset datasets/exports/products.jsonl
uv run python -m training.train_recommendations --source real_catalog --dataset datasets/exports/products.jsonl
uv run python -m app.ml.inference.batch --artifacts artifacts/recommendations/runs/<artifact-version> --output datasets/exports/recommendations.jsonl --top-k 8
uv run python -m training.publish_snapshot --manifest datasets/exports/recommendations.manifest.json --recommendations datasets/exports/recommendations.jsonl
```

5. On that development deployment only, an admin may set `recommendation_strategy` to `python_content`, check fallback, then set it back to `convex`.

`datasets/exports/` is gitignored. Do not commit exports or joblib files.

## Docker and staging deployment

Not executed. `docker` is not installed on this machine (`docker` is not a recognized command). The image was not built and Compose was not started.

`gh` is not installed, so the GitHub Actions job in `.github/workflows/checks.yml` was not queried and is not reported as passed. That workflow builds `services/ai-service` and does not deploy.

Inspected, not run:

- `services/ai-service/Dockerfile` installs from `uv.lock` with `uv sync --frozen --no-dev`, copies `app/` only, runs as user `app`, and probes `GET /health/live`.
- `docker-compose.python-ai.yml` binds `127.0.0.1:8000`, sets `mem_limit: 1g` and `cpus: 1.0`, mounts the model directory read-only, and uses a read-only root filesystem. It is not started by `npm run dev`.
- Web and mobile recommendation reads go through Convex. They do not import the Python service or require it to be up.

Do not run `docker compose -f docker-compose.python-ai.yml up` against a shared host until that environment is explicitly approved. Do not put `CATALOG_EXPORT_TOKEN` in the container.

## Manual QA

Not executed. Browser automation is not available in this session, and the only configured Convex host is production. No storefront or admin page was opened, and no checklist item below is passed.

Expected behavior remains the checklist in `docs/phase-2c-readiness.md`. In particular, these were not clicked through:

- Default Convex recommendations, Python content recommendations, and strategy switching
- Admin authorization and snapshot metadata
- Inactive, deleted, self, and duplicate exclusion
- Ordering, limits, missing-snapshot fallback, incomplete snapshot rejection, failed publication recovery, and stale snapshots
- Product card rendering, mobile similar products, hybrid search, and the existing AI providers

## Performance

Not measured on a development catalog. Export time, training time, artifact size, batch inference time, snapshot publication time, Convex query latency, baseline latency, Python snapshot latency, and memory were not collected, because no development export ran.

The synthetic measurements in `docs/phase-2c-readiness.md` (34 accepted rows, training 0.249 seconds, `model.joblib` 36,812 bytes) stay synthetic. They are not a production catalog claim.

## Remaining blockers

1. No non-production Convex deployment is configured. Catalog export, snapshot publish, and strategy switching cannot be validated here without using production.
2. `CATALOG_EXPORT_URL` and `CATALOG_EXPORT_TOKEN` are unset for the Python CLIs.
3. Docker is not installed locally, and the CI Docker job was not confirmed.
4. Manual browser and device QA has not been performed.
5. Real-catalog performance has not been measured.
6. The staging Compose file has not been started on any host.

## Production activation and rollback

Do not do this until the blockers above are cleared and an authorized person approves production.

Activation:

1. Deploy Convex through the normal release process. Do not use `npx convex deploy` as a development shortcut.
2. Set `CATALOG_EXPORT_TOKEN` on that deployment and in the operator shell. Do not put it in the web or mobile bundle.
3. Export, validate, train, batch, and publish a snapshot. Confirm the stored count matches the manifest `product_count`. The previous published snapshot stays readable until publish succeeds.
4. Build the Python image only if the optional HTTP inference route is wanted. The storefront does not require it. Keep `ENABLE_MODEL_INFERENCE=false` until `CONTENT_MODEL_DIR` points at a trusted artifact. The container probe stays on `/health/live`.
5. Complete the manual QA checklist on a non-production deployment.
6. Leave `recommendation_strategy` on `convex` until an admin explicitly selects `python_content` after reviewing the snapshot.

Rollback:

1. An admin selects **Use Convex** on `/admin/recommendations`, or calls `api.adminContentRecommendations.setRecommendationStrategy` with `convex`.
2. The next similar-products request uses the existing ranker. No redeploy is required. The published snapshot can stay; it is unused while the strategy is `convex`.

## Web production build

`npm run build` finished with exit code 0 in about 4.7 minutes. Next.js 16.2.7 compiled the production bundle and listed `/admin/recommendations` among the routes. This build does not deploy Convex or Vercel.
