# Phases 1–8 final integration and staging readiness

Date: 2026-10-30 (Asia/Karachi). Branch: `feature/agentic-ai-tool-orchestration-multi-step-workflows-and-human-approval`.

## A. Executive summary

**Classification: Blocked by unresolved critical security risks.** Source-level verification and mocked integration checks support preparation of isolated owner staging, but do not clear the outstanding critical Better Auth advisory or prove deployment/device/model compatibility. No application builds, deployments, development servers, authenticated codegen, production connections, migrations, model downloads, real provider requests or financial operations were performed. Phase 9 is outside scope.

The review used AGENTS.md and the comprehensive audit, remediation tracker/report, dependency-hardening report and final-dependency-remediation report. Earlier mitigations remain in place. This pass found and fixed additional notification ownership, purchase-profile attribution, RAG grounding and mobile staging-configuration defects. Dependencies were not changed and incompatible upgrade experiments were not repeated.

## B. Phase-by-phase results

| Phase | Source/contracts and regression evidence | Result and limits |
| --- | --- | --- |
| 1: Python service | Convex Python client authentication/timeouts and Python route validation, middleware, configuration, liveness/readiness tests | Authenticated integration remains gated. Mocked/local fixtures do not establish deployed connectivity. Readiness with inference disabled is application readiness, not model readiness. |
| 2: Content | Content snapshot, catalog export, Python ML config/strategy/shadow tests; Python artifact and TF-IDF fixtures | Versioned artifacts, disabled/shadow/serve handling and existing-engine fallback retained. Owner must test its own catalog/artifacts and latency. |
| 3: Collaborative | Behavioral phase-3 tests and new `convex/purchaseIdentity.integration.test.ts` | Fixed anonymous paid orders being attributed to an unverified contact email. Paid-state checks, bounded item pagination, gift exclusion and source-key deduplication added. Only a server-bound, currently verified, non-banned matching auth actor may update its customer profile. Guest purchases remain anonymous. Existing historical profiles may need owner-reviewed rebuild; no historical identity inference or backfill performed. |
| 4: Neural | Python inference/artifact tests, serving configuration and fallback review | Torch CPU contracts and feature/weight/version checks retained. No production training, model loading, quality or numerical parity claim. |
| 5: RAG | Embedding-version, hybrid ranking/query parsing, new product-claim and disabled-gate integration tests | Fixed uncited named-product price/stock claims and mixed-currency claims escaping grounding. Disabled/unready requests make no quota mutation, retrieval or provider call in mocked action tests. Standard and strict modes reject these mismatches. Natural-language grounding is conservative, not proof of every possible claim; short/unknown product names need owner adversarial quality checks. Vapi browser ownership/quota controls retained; no live voice/LLM requests. |
| 6: Forecasting | Data-quality/config, security regression and Python forecast/publication tests | Paid/refund eligibility, distinct order counts, window checks and staged publication preserve the prior visible publication on failure. Full extraction still occurs within an action and can hit time/memory limits on large histories; pagination is not a cross-page database snapshot. Large detail reports explicitly reject unsupported size rather than silently truncate. Owner must volume-test isolated staging. |
| 7: MLOps | Lifecycle/registry/checksum/drift/retraining fixtures and configuration review | Admin/approval boundaries and version tracking retained. Diagnostic activation and retraining plans do not train or deploy production models. Checksums establish integrity against the recorded digest, not provenance of an untrusted artifact. |
| 8: Agentic | Agent tool/approval/security regression tests | Read-only analytics, tool allowlists, approval payload integrity, cancellation fences, leases/version checks, idempotency and audit records retained. No campaign was sent. Prompt-injection checks reduce exposure; model-generated intent is never permission. |

Additional source fixes and their root causes:

* Push token touch/deactivation and preference access previously lacked sufficient guest ownership checks. Known Expo tokens can no longer be rebound, and touch cannot reactivate revoked enrollment. Registration requires an issued guest and verified mailbox authority. A checkout email and its order capability do **not** prove ownership of that mailbox: only successful emailed recovery sets `orders.emailOwnershipVerifiedAt`, or a matching verified signed-in account authorizes account-wide notifications. Server-created `pushTokens.emailVerified` protects reads and delivery; legacy unverified enrollments cannot receive private notifications. Indexed bounded pagination replaces unbounded token scans. `convex/pushOwnership.integration.test.ts` covers cross-owner attacks, checkout-email impersonation, real recovery consumption against an in-memory Convex database, revocation, legacy records and multiple pages. No actual email or push delivery occurs.
* Mobile recovery persists verified proof separately from ordinary checkout proof, locks the challenged email during code entry, and selects recovered identity ahead of stale checkout storage. Backend authorization remains authoritative; the client flag is only a selection hint. A non-sensitive `inAppNotifications.checkCustomerAccess` query gates protected inbox subscriptions, so unverified users receive a recovery prompt instead of a subscription authorization exception. Storage/enrollment tests cover both proof types.
* Purchase callbacks accepted any order state and trusted checkout contact email for profile identity. Checkout now records `userId` only for a verified matching account; purchase processing revalidates that actor and rejects ineligible order states. Tests cover revoked/mismatched identity, guest orders, duplicate variants/replays and multi-page item sets. Handler fixtures mock component/profile dependencies; they do not prove a deployed Convex transaction.
* RAG used the first detected currency and did not require a named retrieved product to match citations. Grounding now checks all explicit currencies and named-product/citation consistency with word boundaries. Synthetic regressions preserve valid single-product answers.
* EAS preview embedded the production Convex URL. It now selects the EAS `preview` environment; a configuration regression prevents preview from embedding the production URL. Owner must configure preview environment values before building. Production profile is unchanged.

## C. Commerce, auth, mobile and Convex regressions

Server-derived pricing, delivery calculations, discount/gift handling, COD inventory transitions, webhook event claiming, refund retry/idempotency and cancellation state machines remain covered by existing unit/mocked suites (`deliveryPricing`, `inventory`, `orderLifecycle`, `webhookEventClaim`, `stripeRefund*`, `stripeRefundAttempts`, `orderCancellation`). Stripe signatures and route wiring were inspected; no real checkout, webhook, refund or network payment verification was performed.

Guest capability issuance, token-only order access, recovery rotation, review ownership, DTO PII projection, wishlist/customer access and capability hashing remain protected. Account-wide notification authority now requires mailbox proof independently of ordinary order access. Legacy enrollments deliberately require verification again. Transactional push policy is unchanged; preferences do not silently change mandatory service messaging semantics.

Better Auth supported email/password, OTP, session and admin configuration remains enabled. Existing unused social/OAuth-proxy/device routes remain disabled with regression coverage. Admin permission helpers and disabled public bootstrap prevent ordinary-admin escalation. This is source/mock evidence, not a real mailbox/session/browser test. Product, inventory, promotion, order/customer admin and campaign entry points retain role checks; the review is not an exhaustive UI authorization certification.

Native intent initial/warm routing, malformed URLs, schemes/query limits, Stripe return links, QR/order links, SecureStore and biometric control fixtures remain covered by mobile tests. Metro image guards retain dangerous-format/header rejection. Device permission prompts, lock/unlock lifecycle, actual Stripe redirects and app-link registration remain owner checks.

Changed Convex producers and consumers were typechecked together; public/internal boundaries and argument validators were inspected. No generated API file was manually changed. New exported query types resolve through the existing module reference; authenticated schema/codegen validation remains an owner action. Pagination bounds individual pages but does not guarantee unlimited transaction scalability.

## D. Dependency security

The root npm audit still reports **20 affected package matches: 1 critical, 4 high, 15 low**. These are package advisory matches, not 20 independently confirmed exploits. Review worker audit: **0**. Python audit found no known matches among auditable packages; the `torch` CPU local-version distribution is skipped by the auditor, so that is not a complete Python clean bill of health. The prior base-version review and CPU-only constraints remain documented in the final dependency report.

Better Auth 1.6.33 remains constrained by the Convex adapter's below-1.7 compatibility range. Expo Router's decoder chain has a CommonJS compatibility blocker; Metro uses the image-size 1.x filename API; deepmerge had no verified patched compatible release in the prior investigation. Disabled auth routes, native URL checks and Metro guards reduce reachable exposure but do not patch these dependencies. No claim that critical/high matches are resolved. See [final dependency remediation](PHASES-1-8-FINAL-DEPENDENCY-REMEDIATION.md) for advisory details and rejected experiments. Keep production approval blocked pending compatible remediation or an explicitly reviewed risk decision outside this task.

## E. Model and embedding compatibility

Maintained Transformers 4.3.2 inference and Sharp 0.35.5 contracts remain in place. Local-only model paths and unavailable-model fallbacks were inspected/tested with synthetic/mocked inference. Image contracts separate 768- and 512-dimensional uses; text MiniLM is 384 dimensions. Namespace guards use `hf4.3.2-q8-image-v2` and `hf4.3.2-q8-minilm-v2`; remote RAG embedding versions include the configured model identity. Convex dimensions must match the producing service, not merely a model's friendly name.

Old vectors are excluded by version/namespace checks; changing a version string does not migrate a vector. Owner must rebuild embeddings into the correct namespace using approved artifacts and verify completeness before switching retrieval. No production reindex was performed. Owner numerical parity must compare tokenization, preprocessing/resizing, normalization, dimensions, representative embeddings, ranking/recall and classifier labels/scores against approved baselines. Mocked tests cannot establish parity or quality. Preserve old artifacts/namespaces for controlled rollback without mixing versions.

## F. Convex deployment and migration requirements

Deploy backend schema/functions before the updated mobile client, in an isolated staging project first:

1. New optional `orders.emailOwnershipVerifiedAt` records successful emailed recovery. New optional `pushTokens.emailVerified` records server-authorized enrollment. Existing optional `orders.userId` is now populated only for a verified matching checkout account.
2. `pushTokens.by_customer_email_active` extends its fields to `customerEmail, isActive, emailVerified`. New `by_visitor_email_active` fields are `visitorId, customerEmail, isActive, emailVerified`. Wait for index readiness and verify all query consumers before client rollout. Existing prefix queries remain valid.
3. Run authenticated codegen/schema validation and deploy only using isolated staging credentials. None was run here. Inspect schema diff against deployed components, including earlier remediation tables/indexes, rather than assuming the repository reflects deployed state.
4. **Do not blanket-backfill verification flags or infer identity from historical checkout emails.** Legacy push bindings are intentionally excluded from private delivery and access until verified sign-in or emailed recovery/re-enrollment. Historical orders without `userId` stay anonymous in profile attribution. Review previously email-attributed recommendation profiles separately; any cleanup/rebuild needs an owner-approved data plan.
5. Earlier analytics indexes/backfills and embedding version migrations remain owner actions. If needed on isolated staging only, `npx convex run securityAnalytics:backfill '{}'`; review its bounded result and repeat only as documented. Do not run production backfills from this workspace. Recovery/notification fixtures are tests, not a database migration.

## G. Owner-only build and staging checklist

**Commands below are documentation only; none of these build/deployment operations were executed.** Use a separate staging working copy, test payment keys and isolated Convex/EAS/Vercel/service projects. Verify every deployment target in its dashboard before supplying credentials. Do not inherit production `.env.local`, deployment keys or the mobile production profile.

Install from lockfiles (owner):

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix services/review-ai-worker
(cd services/ai-service && uv sync --frozen)
```

After selecting and independently verifying the isolated staging Convex project/credentials:

```sh
npx convex codegen
npx convex deploy
npm run build
```

`npm run build` targets the Next web workspace. **`npm run build:vercel` is not a pure compilation command**: `scripts/vercel-build.mjs` syncs SITE_URL, deploys Convex and can seed admin/settings; `apps/web/vercel.json` uses that wrapper. Review those side effects and isolated targets before any Vercel staging build, or configure that staging project's web-only build after separate backend deployment. Do not copy production deployment configuration blindly.

Configure the EAS `preview` environment with staging public values and an appropriate EAS CLI (eas.json requires >=16), then owner-only:

```sh
(cd apps/mobile && eas build --profile preview --platform android)
(cd apps/mobile && eas build --profile preview --platform ios)
docker build -t ecommerce-ai-service:staging services/ai-service
docker build -t ecommerce-review-ai-worker:staging services/review-ai-worker
```

Repository Compose alternatives are `docker compose -f docker-compose.python-ai.yml build python-ai` and `docker compose -f docker-compose.ai.yml build review-ai-worker`. Review required model-directory/Ollama digest configuration first. Do not start services against production or download unapproved artifacts.

Environment variable names, never secret values:

* Web/Convex: `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
* Mobile preview: `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key). `mobile:env` copies local settings; inspect the source target before using it.
* Python client/service: `PYTHON_AI_SERVICE_URL`, `PYTHON_AI_SERVICE_API_KEY`, `AI_SERVICE_API_KEY`, optional rotation `AI_SERVICE_API_KEY_PREVIOUS`, approved artifact paths and inference flags.
* Worker/model runtime: `AI_WORKER_SECRET`, `AI_MODEL_ROOT`, `AI_MODEL_DIRECTORY`, `OLLAMA_IMAGE_DIGEST`, `OLLAMA_HOST`, `OLLAMA_MODEL`.
* Image route: matching `IMAGE_EMBED_API_SECRET` (at least 32 characters) in its callers/service, `IMAGE_EMBED_ALLOWED_ORIGINS`. Vapi credentials such as `VAPI_API_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` are owner-only integration configuration; leave absent until intentional staging validation.

Start with experimental flags off in staging and production: `ENABLE_MODEL_INFERENCE=false`, `PYTHON_ML_SERVE_ENABLED=false`, settings `enable_python_ml_recommendations=false` and `python_ml_recommendation_mode=off`; `RAG_SHOPPING_ASSISTANT_ENABLED=false` and `enable_rag_shopping_assistant=false`; `DEMAND_FORECASTING_ENABLED=false`, `DEMAND_FORECAST_EXPORT_ENABLED=false`, `enable_demand_forecasting=false`; `MLOPS_MONITORING_ENABLED=false`, `MLOPS_DRIFT_DETECTION_ENABLED=false`, `MLOPS_RETRAINING_ENABLED=false` and corresponding monitor/drift/retrain settings disabled; `AGENTIC_AI_ENABLED=false`, `AGENTIC_AI_DRAFT_WRITES_ENABLED=false`, `AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS=false` and agent/draft settings off with human approval required; `BEHAVIORAL_EXPORT_ENABLED=false`. Do not disable the existing supported recommendation fallback. Turn on one staged feature at a time with synthetic data and an approved provider/artifact plan.

Owner smoke checks after owner deployment (staging URLs only):

```sh
curl --fail "$PYTHON_AI_SERVICE_URL/health/live"
curl --fail "$PYTHON_AI_SERVICE_URL/health/ready"
curl --fail http://127.0.0.1:3100/health
```

Worker health is liveness, not model quality. Python readiness may load the configured content model when inference is enabled; with inference disabled it does not certify model readiness. For protected status, avoid putting credentials in command arguments/logs:

```sh
python - <<'PY'
import os
import urllib.request
req = urllib.request.Request(
    os.environ['PYTHON_AI_SERVICE_URL'].rstrip('/') + '/api/v1/internal/status',
    headers={'Authorization': 'Bearer ' + os.environ['PYTHON_AI_SERVICE_API_KEY']},
)
with urllib.request.urlopen(req, timeout=10) as response:
    print(response.status)
PY
```

Owner staging acceptance:

- Verify correct/incorrect/expired email OTP, password sessions, logout, disabled unused routes, admin/superadmin separation and denied public bootstrap.
- Exercise synthetic COD and Stripe **test-mode** checkout, delivery/discount totals, duplicate webhooks and refund retries; verify inventory and payment states exactly once. Any staged email/provider operation is an owner action, not performed in this review.
- Verify guest isolation, email-only order lookup denial, recovery rotation, cancellation/review ownership and safe DTOs. Demonstrate that a checkout using another mailbox cannot subscribe to its notifications. Verify emailed recovery, enrollment, preference changes, revocation, legacy-record denial and inbox recovery prompt.
- On real Android/iOS devices, test cold/warm order links, malformed links, Stripe returns, push taps, biometric lifecycle and SecureStore recovery persistence. Confirm the app connects only to staging.
- Validate disabled feature gates without outbound calls; then individually test approved synthetic RAG grounding/quotas, model parity/fallback, forecast volume/failure publication, and agent approval/cancellation races. Never send a real campaign as a smoke test.
- Confirm index readiness and schema compatibility, review service logs with secrets redacted, and record owner build/device/model evidence before any release decision.

Rollback: retain prior artifacts, versioned vector namespaces, publication pointers and an owner-reviewed database snapshot/restore plan. Disable experimental flags first. Keep additive schema fields/indexes through mixed-client rollout. Do not restore unsafe legacy email-based authorization or mark legacy push tokens verified merely to restore delivery. A rollback must preserve mailbox authorization; use a patched client/backend pair. Re-enrollment is an intentional compatibility change.

## H. Verification and final classification

Safe tests and static checks are recorded in the completion commit's report results below. They establish source/mock regressions only. Builds, authenticated codegen, remote schema readiness, real devices, live auth/email/payment/provider paths and numerical model parity remain unverified owner work.

**Blocked by unresolved critical security risks.** Root dependency critical/high matches remain open despite mitigations. This classification does not mean the safe source tests failed, and passing tests does not override it. No unconditional production readiness is asserted.

### Actual safe verification results

| Check | Result |
| --- | --- |
| Main Vitest suite | 353 tests passed, 0 failed; focused six-test push suite also passed |
| Mobile Vitest | 24 files, 133 tests passed |
| Web + mobile TypeScript (`npm run typecheck:all`) | Passed |
| Web ESLint | Passed with 0 errors, 32 existing warnings |
| Mobile ESLint | Passed with 0 errors, 28 existing warnings |
| Python pytest | 191 passed; 1 upstream Starlette/httpx deprecation warning |
| Ruff check / format check | Passed; 166 files already formatted |
| Review-worker Node tests | 8 passed; mocked inference/local HTTP only |
| Root npm audit | Nonzero advisory exit expected: 20 matches (1 critical, 4 high, 15 low) |
| Worker npm audit | 0 matches |
| Python audit | No known matches in auditable packages; local-version Torch skipped |
| Changed-file secret pattern scan / git diff whitespace check | Passed (28 relevant changed/new files; heuristic scan, not a guarantee against all secrets) |

Lint warnings were not hidden or converted to errors. No test is evidence of a deployed service, real model parity or real device behavior.
