# Python AI service

Phase 1 adds an independent Python service beside the existing ecommerce platform. It is infrastructure for later machine-learning work. It is not wired into the storefront, admin dashboard, mobile app, checkout, or the current AI provider chain.

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
├── app/main.py                 # application factory
├── app/api/                    # /health/* and /api/v1
├── app/core/                   # settings, logging, bearer auth
├── app/integrations/convex.py  # future Convex HTTP client
├── app/ml/                     # empty packages for later preprocessing, models, inference
├── training/                   # offline training notes only
├── evaluation/                 # offline evaluation notes only
└── artifacts/                  # gitignored model files, empty in Phase 1
```

Startup does not load a model, train, or call Convex. Public docs exist only when `APP_ENV=development`.

| Method | Path | Who can call it |
| --- | --- | --- |
| GET | `/health/live` | Process probe. No secrets in the body. |
| GET | `/health/ready` | Process probe. Does not claim Convex or a model is healthy. |
| GET | `/api/v1/internal/status` | Caller that presents `Authorization: Bearer <AI_SERVICE_API_KEY>`. |

`ENABLE_MODEL_INFERENCE=true` makes readiness return HTTP 503. Phase 1 has no loader, so the process must not look ready to serve predictions.

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

| Concern | Where it runs | Phase 1 |
| --- | --- | --- |
| API process | `uvicorn app.main:app` | Health and authenticated status only |
| Inference | `app/ml/inference/` | Package only. No route and no scores. |
| Training | `training/` | Documentation only. Not started on API boot. |
| Evaluation | `evaluation/` | Documentation only. |
| Weights | `artifacts/` | Gitignored. Nothing is downloaded. |

Large frameworks (PyTorch, TensorFlow, Transformers, LangChain) are not dependencies yet.

## Future web and mobile integration

A later feature should be called from a Convex action, behind a feature flag that defaults off, with a fallback to the current Convex implementation. The browser and the Expo app should keep calling Convex. They should not learn the Python base URL or the service key. If the Python process is down, existing search, recommendations, checkout, and payments keep working because they do not depend on it.

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

Recommendation training, deep learning, fine-tuning, RAG, a new embedding model, demand forecasting, customer clustering, new AI pages, and any change to current search or recommendation results.
