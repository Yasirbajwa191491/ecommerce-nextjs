# Python AI service

Phase 1 adds an independent Python service beside the existing ecommerce platform. Phase 2A adds an offline content-based product recommender in that same service. It is not wired into the storefront, admin dashboard, mobile app, checkout, or the current AI provider chain.

## Current ecommerce architecture

```text
Next.js storefront ──┐
Next.js admin ───────┼── Convex (queries, mutations, actions, HTTP)
Expo mobile ─────────┘         │
                               ├── Convex database, file storage, vector indexes
                               ├── Stripe, Resend, Twilio, Expo Push
                               ├── Vapi webhooks
                               ├── LLM providers (Gemini, Groq, OpenRouter, OpenAI, Anthropic)
                               ├── Next.js /api/ai/embed-image (SigLIP / CLIP)
                               └── Optional n8n and services/review-ai-worker
```

Web and mobile talk to Convex. Convex talks to payment, email, and LLM providers. Product text embeddings, visual search, recommendations, review AI, email AI, and the Business Copilot are implemented in that existing path. See [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md).

## Existing AI integrations

These stay in place and are not redirected to Python:

| Integration | Where it still runs |
| --- | --- |
| Provider selection and fallback | `convex/lib/ai/getProvider.ts`, `convex/lib/ai/providerChain.ts` |
| `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, `AI_WORKER_URL` | Convex environment. Unchanged. |
| Gemini, Groq, OpenRouter, OpenAI, Anthropic | `convex/lib/ai/providers/` |
| Review AI worker (Transformers / Ollama) | `services/review-ai-worker` when `AI_PROVIDER=remote` |
| Hybrid search and text embeddings | Convex vector indexes |
| Visual search | Next.js SigLIP/CLIP route plus Convex |
| Recommendations | Convex recommendation modules |
| Product content, review summaries, email AI, Business Copilot | Convex actions and admin UI |
| Vapi | Convex HTTP webhooks and the web widget |

`npm run dev` still starts Next.js and Convex only.

## Python service

Code lives in `services/ai-service`. It is a FastAPI application on Python 3.12, managed with uv.

```text
services/ai-service/
├── app/main.py                 # application factory; does not train or load models
├── app/api/                    # /health/* and /api/v1 (no recommendation route)
├── app/core/                   # settings, logging, bearer auth
├── app/integrations/convex.py  # future Convex HTTP client; data paths still refused
├── app/ml/                     # preprocessing, TF-IDF content model, offline inference
├── training/                   # sample data, validation, and explicit training CLI
├── evaluation/                 # offline metrics and the category baseline
├── datasets/                   # generated synthetic JSONL (gitignored)
└── artifacts/                  # gitignored joblib bundles
```

Startup does not load a model, train, or call Convex. Public docs exist only when `APP_ENV=development`.

The offline model is documented in [python-ml-recommendations.md](python-ml-recommendations.md). Commands, from `services/ai-service`:

```bash
uv run python -m training.generate_sample_data
uv run python -m training.train_recommendations
uv run python -m evaluation.evaluate_recommendations
uv run python -m app.ml.inference.cli --product-id sample-a-01 --top-k 5
```

| Method | Path | Who can call it |
| --- | --- | --- |
| GET | `/health/live` | Process probe. No secrets in the body. |
| GET | `/health/ready` | Process probe. Does not claim Convex or a model is healthy. |
| GET | `/api/v1/internal/status` | Caller that presents `Authorization: Bearer <AI_SERVICE_API_KEY>`. |

`ENABLE_MODEL_INFERENCE=false` makes `/health/ready` return HTTP 200 with `model_inference: disabled`. `true` makes that probe load `CONTENT_MODEL_DIR`. A verified artifact returns HTTP 200 with `model_inference: ready`. A missing, corrupt, or incompatible artifact returns HTTP 503. Startup still does not load an artifact, and `/health/live` does not check the model. The offline CLI does not read that flag.

## Convex and Python

Two adapters exist. Neither is used by current production functions.

**Convex → Python (future).** `convex/lib/ai/pythonAiServiceClient.ts` calls `/health/live` and, when a key is set, `/api/v1/internal/status`. It uses `PYTHON_AI_SERVICE_URL` and `PYTHON_AI_SERVICE_API_KEY`. Those names are separate from `AI_WORKER_URL` and `AI_PROVIDER`. Production Convex deployments must use an `https://` URL that is not localhost, following the same production check as `requiresHttpsSiteUrl`. Redirects are not followed, so the bearer token is not sent to another host. No current action imports this module.

**Python → Convex (future).** `app/integrations/convex.py` can send `CONVEX_SERVICE_TOKEN` to `CONVEX_INTERNAL_URL` (the `.convex.site` HTTP actions origin, or local Convex). A reachability result means the origin answered. It does not mean the token was accepted. `call_allowlisted` rejects every path, including product, order, and customer paths. Phase 1 does not add a Convex HTTP route for this token.

Convex HTTP routes are public on the internet unless the handler checks a secret. A future data route needs its own internal action, a shared secret compared on the server, a narrow validator, and no bulk export. Do not reuse the admin session or a `NEXT_PUBLIC_` variable for that call.

There is no deployed Convex credential for this service in Phase 1. Tests mock HTTP. Before a later phase can connect for real, set:

- Convex: `PYTHON_AI_SERVICE_URL`, `PYTHON_AI_SERVICE_API_KEY`
- Python: `CONVEX_INTERNAL_URL`, `CONVEX_SERVICE_TOKEN`
- A new authenticated Convex HTTP action with an allowlisted path

## Service authentication

The Python API key is a backend credential.

- Web and mobile bundles must not contain it.
- Production requires a current key of at least 32 characters.
- Protected routes fail closed with HTTP 503 when the key is missing, and HTTP 401 when the caller is missing or wrong.
- During rotation, set `AI_SERVICE_API_KEY_PREVIOUS` to the old key, deploy the new `AI_SERVICE_API_KEY`, move callers, then remove the previous key.
- Logs redact configured secrets and bearer tokens. HTTP errors do not echo request bodies or stack traces.

This check does not decide whether a shopper or an admin may perform an action. Convex authorization stays in Convex.

## Training and inference

| Concern | Where it runs | Status |
| --- | --- | --- |
| API process | `uvicorn app.main:app` | Health, authenticated status, and optional content inference. Startup does not load artifacts. |
| Offline inference | `python -m app.ml.inference.cli` and `python -m app.ml.inference.batch` | Ranks products from a local artifact. |
| HTTP inference | `POST /api/v1/recommendations/content` | Bearer token and `ENABLE_MODEL_INFERENCE=true`. Disabled by default. |
| Training | `training/` | Explicit CLI for `synthetic` or `real_catalog`. Not started on API boot. |
| Evaluation | `evaluation/` | Synthetic metrics, plus real-catalog diagnostics that omit quality metrics unless labels are provided. |
| Weights | `artifacts/recommendations/content-v1/` and `artifacts/recommendations/runs/` | Gitignored joblib bundles. Load only trusted files. Real catalog runs do not replace `content-v1`. |

Large frameworks other than PyTorch are not dependencies. TensorFlow, Transformers, and LangChain are not installed. Runtime ML libraries are NumPy, pandas, SciPy, scikit-learn, joblib, and the CPU PyTorch wheel used by `neural-v1`. Phase 3 collaborative artifacts live beside the content model and are documented in [python-behavioral-collaborative-recommendations.md](python-behavioral-collaborative-recommendations.md). Phase 4 neural artifacts are documented in [python-pytorch-neural-recommendations.md](python-pytorch-neural-recommendations.md).

## Future web and mobile integration

Shoppers keep calling Convex. They never receive the Python base URL or the service key. Similar products can read a published content snapshot when an administrator sets `recommendation_strategy` to `python_content`. The default is `convex`. If the snapshot is missing, Convex uses the existing ranker. If the Python process is down, search, recommendations, checkout, and payments keep working because shopper requests do not call it.

Admin Settings on `/admin/settings` can store `enable_python_ml_recommendations`, `python_ml_recommendation_mode` (`off`, `shadow`, `serve`), `python_ml_recommendation_strategy` (`content`, `collaborative`, `hybrid`, or `neural`, default `content`), and `python_ml_request_timeout_ms` (250–5000, default 1500). Those rows do not contain `PYTHON_AI_SERVICE_URL` or `PYTHON_AI_SERVICE_API_KEY`. The enable flag defaults to false, which forces the effective mode to `off`. `shadow` does not replace customer recommendations. `serve` cannot take effect unless `PYTHON_ML_SERVE_ENABLED=true` is set on the deployment; that gate defaults to off. The strategy setting chooses which Python model a shadow call requests. It does not change `recommendation_strategy`. Background jobs read this effective configuration. Shopper pages do not add a settings request to render recommendations. `neural` is the Phase 4 model and is not selected by default.

## Deployment

- Build `services/ai-service/Dockerfile`. The runtime user is not root. Dependencies come from `uv.lock`. Development packages stay out of the image.
- Inject `AI_SERVICE_API_KEY` at runtime. Do not copy `.env` into the image.
- Terminate HTTPS at the platform or reverse proxy. Convex in production must call that HTTPS URL.
- The container health check uses `GET /health/live` on localhost inside the container.
- `docker stop` sends `SIGTERM` to Uvicorn.
- Do not add this service to the Vercel web build or to `npm run dev`.
- GPU images are out of scope.

## Monitoring and failure isolation

Operators can probe `/health/live` and `/health/ready`. Production logs are single-line JSON and omit secrets. Phase 1 does not ship a metrics backend.

Failure stays local to this process. The storefront does not wait on it. Readiness does not report Convex, Stripe, or an LLM provider as healthy, because those systems are not checked.

## What is not implemented

Live switching of every recommendation section, deep learning, fine-tuning, RAG, a new embedding model, demand forecasting, customer clustering, and a hybrid of the Python scores with the Convex ranker. The content strategy is opt-in, defaults to `convex`, and applies to item-to-item similar products. See [python-ml-recommendations.md](python-ml-recommendations.md).
