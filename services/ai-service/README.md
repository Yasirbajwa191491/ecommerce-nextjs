# Python AI service

Independent FastAPI service for machine-learning work in this ecommerce monorepo. Phase 2 serves an authenticated content model. Phase 3 adds collaborative and hybrid strategies. Phase 4 adds a CPU PyTorch neural model (`neural-v1`) on the same behavioral endpoint. The storefront does not call this service unless an administrator enables the existing Python serve gate. The default Python strategy remains `content`.

The Next.js storefront, Expo app, and Convex AI features do not call this service during `npm run dev`. Gemini, Groq, OpenRouter, OpenAI, Anthropic, the review AI worker, SigLIP/CLIP embeddings, the live recommendation engine, and the Business Copilot keep their current behavior.

Phase 5 adds authenticated `/api/v1/internal/rag/*` routes for retrieval and indexing. Convex calls them only when the RAG deployment gate is on. The service still does not hold LLM API keys. See `docs/python-rag-shopping-assistant.md`.

Phase 6 adds authenticated `/api/v1/internal/forecast/*` routes. Training stays on the CLI. The artifact id is `demand-forecast-v1`. See `docs/python-demand-forecasting-predictive-analytics.md`.

Phase 7 adds authenticated `/api/v1/internal/mlops/*` routes for artifact validation, diagnostic activation, drift math, and retraining plans. Registry state lives in Convex. These routes do not hot-swap serving caches and default to disabled. See `docs/python-mlops-model-lifecycle.md`.

## How it fits

```text
Next.js Web ──┐
              ├── Convex Backend ── existing AI providers and review-ai-worker
Expo Mobile ──┘         │
                        │ authenticated, feature-gated Phases 2–7 calls
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

The image has no CUDA packages. The lockfile does install the CPU PyTorch wheel, so the image is larger than a scikit-learn-only build. `CUDA_VISIBLE_DEVICES` is empty in the image. Neural inference still needs `NEURAL_MODEL_DIR` mounted at runtime and more than the 1g staging memory limit.

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
| `app/ml/models/` | Content, collaborative, hybrid, and neural models, plus artifact load/save. |
| `app/ml/neural/` | PyTorch module, negative sampling, and the training loop. Imported only when training or serving `neural`. |
| `app/ml/inference/` | Cached recommenders and local CLIs. |
| `training/` | Sample data, validation, and fitting. Not imported by API startup. |
| `evaluation/` | Ranking metrics for the content model and the behavioral comparison, including `neural-v1`. |
| `datasets/` | Generated synthetic JSONL. Gitignored except this folder's README. |
| `artifacts/` | Local joblib bundles. Gitignored except `.gitkeep`. |

## Current limitations

- Startup does not train or load recommendation artifacts. PyTorch is imported only for a `neural` request or a training command.
- Customer-visible recommendations stay on the existing engine. `neural` does not become the storefront strategy by default.
- `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, and `AI_WORKER_URL` are unchanged.
- No automatic production retraining, no new shopper accounts, and no cross-device identity.
- The Docker image installs CPU PyTorch because `neural-v1` inference needs it. Train on the host with `uv`. The image does not copy datasets or generated weights.

Learning notes: [docs/python-pytorch-neural-recommendations.md](../../docs/python-pytorch-neural-recommendations.md).

## Owner staging verification

See [the final integration readiness checklist](../../docs/security/PHASES-1-8-FINAL-INTEGRATION-READINESS.md) for isolated staging credentials, owner-only build/deployment commands, flags, artifact/vector compatibility and rollback requirements. This source review does not certify a live deployment or real model parity.
