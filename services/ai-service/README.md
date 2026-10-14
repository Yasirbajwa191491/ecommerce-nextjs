# Python AI service

Independent FastAPI service for machine-learning work in this ecommerce monorepo. Phase 1 is the foundation: configuration, health checks, service authentication, and a Convex client that does not read store data. Phase 2A adds an offline content-based recommendation model. The HTTP API still does not serve recommendations.

The Next.js storefront, Expo app, and Convex AI features do not call this service. `npm run dev` does not start it. Gemini, Groq, OpenRouter, OpenAI, Anthropic, the review AI worker, SigLIP/CLIP embeddings, the live recommendation engine, and the Business Copilot keep their current behavior.

## How it fits

```text
Next.js Web ──┐
              ├── Convex Backend ── existing AI providers and review-ai-worker
Expo Mobile ──┘         │
                        │ future authenticated server-side call (not wired)
                        ▼
                services/ai-service
```

Browser and mobile clients must not receive `AI_SERVICE_API_KEY`. Do not put it in `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variables.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) 0.11 or newer. uv can install CPython 3.12.
- No GPU, Stripe account, Convex deployment, or LLM key is required to run the tests.

## Install

From the repository root:

```bash
cd services/ai-service
uv python install 3.12
uv sync
```

On Windows PowerShell:

```powershell
cd services\ai-service
copy .env.example .env
```

On macOS or Linux: `cp .env.example .env`.

Leave secrets blank for local health checks. Create a real key before exposing the process beyond your machine:

```bash
uv run python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Put that value in `AI_SERVICE_API_KEY` in `.env`. Do not commit `.env`.

## Development

From the repository root:

```bash
npm run dev:python-ai
```

Or from `services/ai-service`:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Liveness: `GET http://127.0.0.1:8000/health/live`
- Readiness: `GET http://127.0.0.1:8000/health/ready`
- OpenAPI (development only): `http://127.0.0.1:8000/docs`

`APP_HOST` and `APP_PORT` document the local bind address. The process listens on the host and port you pass to Uvicorn.

## Tests and lint

From the repository root:

```bash
npm run test:python-ai
npm run lint:python-ai
npm run format:python-ai
```

Tests use FastAPI's test client, local synthetic products, and scikit-learn. They do not call Convex, Stripe, or an LLM, and they do not download pretrained models.

## Offline content recommendations (Phase 2A)

Train and score a TF-IDF cosine model on a synthetic catalog. This does not change storefront ranking.

```bash
uv run python -m training.generate_sample_data
uv run python -m training.validate_dataset
uv run python -m training.train_recommendations
uv run python -m evaluation.evaluate_recommendations
uv run python -m app.ml.inference.cli --product-id sample-a-01 --top-k 5
```

The same training and evaluation commands are `npm run ml:python-sample`, `ml:python-validate`, `ml:python-train`, and `ml:python-eval` from the repository root.

Generated JSONL, evaluation reports, and `artifacts/recommendations/content-v1/*.joblib` are gitignored. Load joblib artifacts only from this project: unpickling an untrusted file can execute code.

Learning notes: [docs/python-ml-recommendations.md](../../docs/python-ml-recommendations.md).

## Docker

The image does not copy `.env` or install development tools. `APP_ENV` defaults to `production`, so the container will not start until `AI_SERVICE_API_KEY` is injected at runtime.

```bash
docker build -t ecommerce-ai-service services/ai-service
docker run --rm -p 8000:8000 -e AI_SERVICE_API_KEY="<32+ character secret>" ecommerce-ai-service
```

Inside the container the server listens on `0.0.0.0:8000`. The image health check calls `http://127.0.0.1:8000/health/live` and does not leave the container. Production callers should use HTTPS on the platform in front of this process. The image has no GPU or CUDA packages.

Uvicorn receives `SIGTERM` directly (`STOPSIGNAL SIGTERM`), so `docker stop` can shut the process down without an extra shell.

## Health endpoints

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| GET | `/health/live` | No | The process can answer. |
| GET | `/health/ready` | No | The app finished startup. Model inference is `disabled` unless `ENABLE_MODEL_INFERENCE=true`, in which case readiness is HTTP 503 because Phase 1 loads no model. |

Responses do not include environment variables, credentials, or hostnames. Convex is not part of readiness: this service does not claim Convex is healthy.

## Security model

Protected routes live under `/api/v1/internal` and require:

```http
Authorization: Bearer <AI_SERVICE_API_KEY>
```

Query parameters and `X-Api-Key` are ignored. If the server has no key, protected routes return HTTP 503. A missing or wrong caller token returns HTTP 401. Comparison hashes both values and uses `secrets.compare_digest`.

Phase 1's only protected route is `GET /api/v1/internal/status`. It reports whether the inference flag is set. It does not run a model.

This token identifies a backend caller. It is not a customer session and not an admin role.

### Key rotation

1. Generate a new token.
2. Set `AI_SERVICE_API_KEY` to the new token and `AI_SERVICE_API_KEY_PREVIOUS` to the old token, then restart this service. Both tokens work.
3. Update the caller (future Convex env `PYTHON_AI_SERVICE_API_KEY`) to send the new token.
4. Remove `AI_SERVICE_API_KEY_PREVIOUS`.

Rotate the key if it is logged, committed, or placed in a web or mobile bundle. Production requires a current key of at least 32 characters. Logs redact configured secrets and `Bearer` tokens. Error responses omit request bodies and exception text.

CORS is off. OpenAPI and Redoc are available only when `APP_ENV=development`.

## Configuration

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `APP_NAME`, `APP_ENV`, `APP_HOST`, `APP_PORT`, `LOG_LEVEL` | Process identity and logging. `APP_ENV` is `development`, `test`, or `production`. |
| `AI_SERVICE_API_KEY` | Current service bearer token. Required in production. |
| `AI_SERVICE_API_KEY_PREVIOUS` | Optional token kept during rotation. |
| `CONVEX_URL` | Future deployment URL (`.convex.cloud` or local). Not called in Phase 1. |
| `CONVEX_INTERNAL_URL` | Future HTTP actions origin (`.convex.site` or local). The client can probe this URL. |
| `CONVEX_SERVICE_TOKEN` | Future shared secret for a least-privilege Convex HTTP action. Not a Convex admin key. |
| `MODEL_ARTIFACTS_DIR` | Directory for local model files. The API does not load them. |
| `ENABLE_MODEL_INFERENCE` | Must stay `false` until an HTTP loader exists. `true` fails readiness. Offline CLI training does not flip this flag. |

Deployed environments should use `APP_ENV=production`. JSON logs are used in production; development and test use plain text.

## ML layout

| Path | Responsibility |
| --- | --- |
| `app/ml/preprocessing/` | Validation, cleaning, and features. Not used by HTTP routes. |
| `app/ml/models/` | TF-IDF content model and artifact load/save. |
| `app/ml/inference/` | `RecommendationModel.recommend` and the local CLI. No HTTP route. |
| `training/` | Sample data, validation, and fitting. Not imported by the API. |
| `evaluation/` | Precision@K, Recall@K, HitRate@K, coverage, and the category baseline. |
| `datasets/` | Generated synthetic JSONL. Gitignored except this folder's README. |
| `artifacts/` | Local joblib bundles. Gitignored except `.gitkeep`. |

## Current limitations

- The API still has no recommendation route. Startup does not train or load artifacts.
- No live Convex product export, no storefront feature flag, and no change to current recommendation ranking.
- No Convex HTTP action accepts `CONVEX_SERVICE_TOKEN` yet. The Python client refuses every data path.
- No collaborative filtering, deep learning, RAG, fine-tuning, forecasting, or clustering.
- `convex/lib/ai/pythonAiServiceClient.ts` can probe this service, and nothing in the running store calls it.
- Existing `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, and `AI_WORKER_URL` behavior is unchanged.
- The Docker image installs the ML libraries because they are runtime dependencies, and it still only copies `app/`. Train on the host with `uv`, not inside the current API container.
