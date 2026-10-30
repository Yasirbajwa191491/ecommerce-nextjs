# Phases 1–8 remediation verification

Date: 2026-10-29. Baseline: `fbc6a4a2197fc6a7b37e58e3a36fd384c7f70297`.
Branch: `feature/agentic-ai-tool-orchestration-multi-step-workflows-and-human-approval`.

## Outcome and scope

The confirmed application vulnerabilities have source fixes and synthetic regression coverage. All 19 canonical findings and six related corrections are tracked in [the tracker](PHASES-1-8-REMEDIATION-TRACKER.md); numbering follows [the comprehensive audit](PHASES-1-8-COMPREHENSIVE-AUDIT.md), because the remediation templates used conflicting numbers.

This is **not unconditional production clearance**. Historical credential exposure requires an operator response. Dependency advisories remain, including critical package matches, and production deployment, real mail delivery, authenticated component codegen and live migrations were deliberately not performed. These are explicitly open items, not claimed fixes. The user's direct instruction authorizes committing and pushing this branch, overriding the template's generic no-automatic-push instruction. The final user instruction limits further validation to tests/checks; no additional app or web builds are to be run. Build results below occurred before that instruction.

## Changes and regression evidence

| Finding | Before → after / code evidence | Verification |
|---|---|---|
| AUD-01 | README disclosed a development credential; disclosure removed, `convex/lib/seedCredentials.ts` requires explicit email and unique >=16-character password, existing super-admin is not overwritten. | Weak/default seed input regression in `convex/securityRemediation.test.ts`. Historical exposure cannot be undone without forbidden history rewriting; operator credential/session review remains open. |
| AUD-02 | A first signed-in caller could claim super-admin; `convex/auth.ts` now rejects public bootstrap unconditionally. Initialization stays internal/operator-only; first-user UI removed. | Empty-deployment bootstrap rejection; browser ownership suite. |
| AUD-03 | Ordinary admins could change accounts/roles; `adminUsers.ts` requires super-admin for account changes and `betterAuth/auth.ts` removes direct account/session mutation permissions from ordinary admins. | Convex role test plus `lib/adminPermissions.test.ts` exercises actual Better Auth HTTP API with memory adapter: admin denied, super-admin allowed. |
| AUD-04 | Order number/email/phone could disclose private data or cancel orders; `lib/orderAccess.ts`, tracking, reviews and voice now require possession of a high-entropy capability. `orderRecovery.ts` emails a one-use challenge code; generic requests do not enumerate orders. | Email-only cancellation rejects before scheduling; token failures/success; recovery expiry, attempts, exact code and replay tests. Web/mobile recovery clients updated. |
| AUD-05 | Claimed email and freely chosen visitor IDs crossed ownership boundaries; guest capabilities are server-issued with hashed database verifiers, customer identity derives only from verified authentication. Wishlist/behavior/link/personalization paths use resolved ownership. | Cross-visitor wishlist read/write and invalid capability tests. Guest issuance is capped; sessions are never merged by an unverified claimed email. |
| AUD-06 | Arbitrary image URLs could reach internal networks; approved exact HTTPS origins, all-address DNS validation, pinned connection, no redirects, 5 MiB response limit, supported MIME and 16M decoded-pixel limit replace arbitrary fetching. Public visual search uses Convex storage bytes. API requires >=32-character shared secret. | Validator and mocked HTTPS tests cover mixed private DNS, pinning, redirect, chunked oversize, MIME; route tests cover missing/wrong key and redacted provider failure. No external SSRF probes. |
| AUD-07 | Worker/Ollama published unsafe defaults; loopback host ports, required secret, fail-closed constant-time key verification, bounded JSON/concurrency/timeouts and generic errors. | Four local HTTP tests with injected synthetic providers; no real model/provider invocation. |
| AUD-08 | Omitted/rotated RAG session keys bypassed limits; `aiUsage.ts` requires issued guest proof and reserves caller and global budget transactionally before provider work. Voice uses the same budget and signed HttpOnly conversation cookie, streamed limits, two in-flight requests per process and provider deadline. | RAG identity/budget tests; voice budget rejection, signed continuation, forged continuation, streamed limit and concurrency tests. Reservations remain consumed if provider fails. |
| AUD-09 | Index-only fields reached strict Python prepare schema; `prepareRagPayload` emits exactly products/policies/faqs. | Shared `tests/contracts/rag-prepare.json` in TypeScript and Python; fresh synthetic prepare → index → retrieval contract test, rejects old incompatible prepare shape. |
| AUD-10 | Swapped multi-product prices/stock could pass grounding; ambiguous multi-product financial/availability claims and currency conflicts are rejected. Valid single-product facts still pass. | Swapped product claim/valid single-product and existing grounding tests. Conservative fallback may reject valid multi-product comparisons; free-form grounding is not a proof of every natural-language claim. |
| AUD-11 | In-flight approved work could write after cancellation; `agentInternal.createApprovedDraft` checks terminal state, run version, active lease, current role/ban, deployment/settings gates, exact approved arguments, approval expiry/execution and idempotency in the writing transaction. Cancellation invalidates outstanding approvals. | Stale/revoked/cancelled/disabled/changed-payload rejection; valid one-time approved draft and replay tests. No real campaign sent. |
| AUD-12 | Approval omitted the draft body; owner DTO exposes normalized immutable arguments, panel renders subject/body/products/promotion/rationale/risk/expiry. | Approval DTO regression. UI renders text through React, not raw HTML. |
| AUD-13 | Fixed page/product/category limits silently dropped sales and oldest window displaced recent history; all eligible line pages are read, every order item is included, all scopes use a common latest 180-day window and distinct order identities. | >40-line paid order/gift exclusion, recent-window fixture, Python category/store distinct-count fixture. Extraction must complete or the action fails; see scale limit below. |
| AUD-14 | Publication became current before its rows existed; stage rows with idempotent batch keys, validate persisted counts, atomically archive/switch only at completion. | Interrupted/incomplete staging retains previous current publication; replay/count tests. |
| AUD-15 | `JSON.slice` corrupted valid approval JSON; byte-bound validation rejects oversize complete payloads without truncation, canonical equality checks exact arguments. | Escaped quote/Unicode round-trip, oversize rejection, changed approval argument test. |
| AUD-16 | Public events fabricated conversions/revenue; public financial fields are rejected. Internal paid-order attribution requires a prior verified-customer product click; per-line ledger deduplicates variants/replays, refunds reverse revenue once. | Pending → paid, two variants, replay and refund regression. Unverified guest email is not trusted for financial attribution. |
| AUD-17 | Source lint failed; errors fixed without suppressing rules, Python formatting fixed, CI expanded to web/mobile/Convex/worker/Python checks. | Checks below; existing warnings are disclosed. |
| AUD-18 | Vulnerable locks; compatible patches plus tested Vitest 4, Happy DOM 21 and pytest 9/pytest-asyncio 1 upgrades. | Detailed advisory inventory below; unresolved packages are explicitly open. |
| AUD-19 | Disabled HTTP behavioral export still read/exported; authoritative deployment flag checked server-side before data access. | Disabled export denies before database reads; enabled correct/wrong bearer tests. |

Additional changes: transactional maintained public/email statistics (`convex/server.ts`, `securityAnalytics.ts`, `lib/securityAnalytics.ts`) replace repeated full-table counts. Bounded, restartable, idempotent backfill handles concurrent updates; actual `convex-test` coverage exercises >one page, concurrent writes, replay and rollback. Interactive legacy BI/detail reports now reject >2,000 matching rows instead of returning partial totals (`lib/boundedRead.ts`). Stock list uses bounded indexed reads. The paid-line/quality exporters page all order items instead of slicing at 40. Python preserves order IDs until scope aggregation and unions them instead of summing per-product counts. Missing mail configuration no longer logs OTPs. CI uses immutable action references and read-only repository permissions.

## Verification

All tests use synthetic data, mocked providers or local HTTP, and no production deployment/customer records.

| Command / check | Result |
|---|---|
| `npx vitest run` | 55 files, **312 passed**, including security, auth HTTP, Convex transaction/backfill, agent, contract, SSRF and voice tests; patched Vitest 4.1.12. |
| `npm run test:mobile-unit` | 20 files, **97 passed**. |
| `cd services/ai-service && uv run --frozen pytest` | **191 passed**, including prepare contract and distinct scope-count regressions. Patched pytest 9.2.0 / pytest-asyncio 1.4.1. |
| `node --test services/review-ai-worker/src/server.test.js` | **4 passed**. |
| `npm run typecheck:all` | Web/Convex and mobile passed. |
| `npm run lint` / `npm run lint:mobile` | Zero errors; 32 web and 28 mobile existing warnings (unused symbols, hook dependencies, accessibility/navigation); these warnings are not claimed fixed. |
| Python `ruff check .` / `ruff format --check .` | Passed; 166 files formatted. |
| Web production webpack build with placeholder public Convex URLs | Passed compilation, TypeScript and route generation; no real deployment/authentication exercised. |
| Default Turbopack build | Blocked by cloud worker socket permission (`Operation not permitted`) even on permitted retry. Supported webpack build passed. |
| `python3 scripts/security-secret-scan.py` | Passed: no credential patterns in 1,538 tracked paths; location/fingerprint-only output, no credential values. Does not scan hosted secrets, binary artifacts or prove historical revocation. |
| Full authenticated `convex codegen` | Not verified: deployment/network credentials unavailable. Offline application API generation uses installed Convex codegen template and preserves prior component metadata (`scripts/codegen-offline.mjs`); typecheck passed. |
| Container build / live web-mobile-provider end-to-end | Not performed locally. Docker build retained in CI; no production readiness claim based on unit tests. |

FastAPI's TestClient emits an upstream httpx deprecation warning; Vite warns about a future native config-loader default. Neither is suppressed. Python audit reports no known matches for auditable installed packages after patches; CPU Torch is absent from PyPI audit and remains unverified. Container OS/base-image and downloaded model advisories are also unverified.

## Compatibility and operator deployment prerequisites

1. Review this branch and deploy schema/index/function changes with the supported Convex workflow in a separate authorized deployment. Run authenticated component codegen and staging smoke tests first. No deployment or migration was run here. Frozen installs: `npm ci`, `npm ci --prefix services/review-ai-worker`, `uv sync --frozen`.
2. Historical credential exposure: operator must determine whether the old development credential was ever used, replace affected passwords, review privileged accounts and revoke affected sessions through approved operations. Source removal cannot invalidate an existing password or remove historical copies. No credential rotation or session revocation was performed.
3. For a genuinely new deployment, configure `ADMIN_SEED_EMAIL` and a unique `ADMIN_SEED_PASSWORD` >=16 characters through secret management, then run the existing internal seed action as an operator. Never put secret values in commands committed to Git, reports or logs. Public bootstrap always rejects; existing super-admin is not overwritten. Ordinary admins retain read access; account changes require super-admin, including direct Better Auth endpoints.
4. Configure working Resend credentials/from-domain for auth and order recovery; verify delivery in staging with an operator-approved test mailbox. Missing config returns no OTP via logs. Recovery requests always return a challenge, codes expire in ten minutes, allow five attempts and consume once; global/per-email rate limits apply. Successful recovery rotates the order capability, so prior device links stop working. No real email was sent here.
5. Web and mobile now require issued guest capabilities. Web local storage and native SecureStore hold the raw guest token; only its hash is stored in the guest-capability table. Expo web falls back to AsyncStorage. Legacy arbitrary visitor IDs are intentionally not treated as proof and cannot safely auto-claim old wishlists. Clients obtain a fresh identity; old guest data needs a separately verified migration if recovery is required. Anonymous purchase/email alone never claims a customer wishlist.
6. Checkout-issued order links continue working; email/phone-only tracking/cancellation/reviews no longer work. Web uses a URL fragment/sessionStorage for recovered capability and mobile carries it in navigation. Raw existing order capabilities remain in the order record for compatibility; they are **not newly claimed to be hashed**. New guest/challenge/code verifiers are hashed. Treat all capability-bearing links/device storage as sensitive; XSS/device compromise can expose a bearer capability.
7. Set the same random `IMAGE_EMBED_API_SECRET` (>=32 characters) in Convex and web service, and approved exact HTTPS origins in `IMAGE_EMBED_ALLOWED_ORIGINS`. There is no permissive default. Add only owned/approved image hosts, including the correct storage host if internal catalog indexing needs it. Public visual search accepts storage IDs and server-read validated bytes. Configure `AI_WORKER_SECRET` >=32 characters for caller and worker. Compose refuses a missing secret and exposes worker/Ollama only on host loopback. Keep them behind authenticated networking in any remote deployment; container interfaces are intentionally reachable within the private Compose network.
8. Voice requires `VAPI_API_KEY`, assistant ID and Convex URL; signed cookies bind continuation IDs. The API key also signs these cookies, so an approved key rotation invalidates voice sessions. Caller quotas do not depend on user-supplied IDs alone; global reservation caps remain even when attackers mint fresh guests. Per-process concurrency is bounded, but multiple replicas each have their own semaphore; add deployment-wide capacity controls if running many replicas. Global budgets are shared in Convex. Limits intentionally trade availability for spend protection.
9. Keep experimental agent/draft/forecast/export flags disabled until staging verification. Existing AI provider/model architecture remains. Agent drafts always require explicit approval; exact reviewed payload is enforced again inside the write transaction. No approval executes a send/publish operation.
10. Maintained security analytics must complete `securityAnalytics.backfill` before public exact counts/dashboard totals are available. A five-minute cron starts/resumes bounded backfill, or an operator may invoke the internal action. Until ready, public stats show loading and private dashboard reports initialization; no invented zero/partial totals. Contributions make replay and concurrent updates idempotent. No production backfill was invoked.
11. Forecast publication now reads complete eligible pages or fails without replacing the old publication. It still aggregates an entire export inside one action: very large histories can exceed action time/memory. A persisted resumable publication extraction job remains a scale improvement; the quality scanner and analytics backfill do persist progress. Do not claim a true historical database snapshot: membership is bounded by cutoff creation/payment times, but status changes during extraction can affect eligibility. Old unfinished quality runs used order cursors, so operators must start a new cutoff/run rather than resume an old order cursor through the new item stream. Do not delete production runs automatically.
12. Detailed BI reports intentionally reject >2,000 matched rows and request a narrower range. Public/email summary counts are maintained across all records; a fully asynchronous arbitrary large detail-report export remains open. There are no silently truncated exact totals. Model dataset aggregates must be rebuilt from order identities for corrected distinct scope counts; old aggregates without IDs are rejected rather than inventing counts. Feature/weight shape is unchanged; retrain only through the normal reviewed ML workflow.
13. Review unresolved dependency rows below before enabling Phase 9 or approving production. Do not use forced major/downgrade recommendations blindly. CI advisory reporting remains informational for known matches, while invalid/unavailable advisory queries fail; tests/lint/typechecks are mandatory gates. CI itself will run after push and is not claimed observed green here.

## Dependency advisory status and reachability triage

Advisory rollups count affected packages, not confirmed exploitable application vulnerabilities. Original root rollup: 65 (7 critical/32 high/14 moderate/12 low). Final root: 29 (2 critical/6 high/6 moderate/15 low). Worker: eight originally; five remain (one critical/four high). Compatible fixes removed root Next.js, worker Express/proxy/body-parser matches and many transitive matches. Patched Vitest and Happy DOM were verified by the full suites. Certifi/setuptools were patched and pytest/pytest-asyncio upgraded together; Python audit has no remaining matches among auditable packages.

Better Auth remains on its compatible 1.6 patch line: the installed Convex adapter's peer range is `>=1.6.11 <1.7.0`, while advisory fixes require 1.7.x. The configured auth instance uses Convex adapter, email/password, emailOTP and admin plugins; reported device authorization, OAuth proxy/state and PostgreSQL Drizzle limiter paths are not configured. This is a code-level reachability observation, not proof that the entire package is safe; supported adapter/auth upgrade and retesting remain required.

Transformers 2.x brings older protobuf/ONNX and nested sharp. npm proposes a breaking downgrade to Transformers 1.4.2; this is not a validated fix. Public callers cannot provide model protobuf schemas/artifacts, and model artifacts are server-controlled, reducing the direct protobuf input surface. Image decoding remains an application surface despite MIME/pixel/concurrency controls; nested sharp/libvips advisories therefore remain a material unresolved risk. Migrate to a supported inference stack and run real model/image parity tests in staging before clearance. No model downloads/inference or OS-image scan was performed here.

Remaining Expo/build-tool advisories require toolchain upgrades or dependency replacements. The table lists every remaining package rollup and advisory URL; transitive entries with no direct advisory URL inherit their dependency's match. No exploit reachability is inferred solely from severity.

| Workspace / package | Severity | Exposure / disposition | Advisory URLs |
|---|---|---|---|
| root / `@better-auth/drizzle-adapter` | low | Auth package; unused plugin/SQL paths as described; supported adapter upgrade required | https://github.com/advisories/GHSA-44jh-23m7-hpcf |
| root / `@better-auth/kysely-adapter` | low | Auth package; unused plugin/SQL paths as described; supported adapter upgrade required | https://github.com/advisories/GHSA-44jh-23m7-hpcf |
| root / `@expo/cli` | moderate | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `@expo/config` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `@expo/metro-config` | moderate | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `@expo/prebuild-config` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `@react-email/components` | low | Email rendering/transitive parsing; templates server controlled; upgrade/review required | Inherited dependency match |
| root / `@react-email/render` | low | Email rendering/transitive parsing; templates server controlled; upgrade/review required | Inherited dependency match |
| root / `@shadcn/registry` | low | Transitive/tooling package; no live exploit verified; upgrade/reachability review remains open | Inherited dependency match |
| root / `@xenova/transformers` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| root / `better-auth` | critical | Auth package; unused plugin/SQL paths as described; supported adapter upgrade required | https://github.com/advisories/GHSA-44jh-23m7-hpcf https://github.com/advisories/GHSA-965c-763c-88jm https://github.com/advisories/GHSA-q84f-53jg-9ppm https://github.com/advisories/GHSA-r4xp-prcw-77qf |
| root / `decode-uri-component` | moderate | Transitive/tooling package; no live exploit verified; upgrade/reachability review remains open | https://github.com/advisories/GHSA-vcc3-ghjq-m6fr |
| root / `deepmerge` | low | Email rendering/transitive parsing; templates server controlled; upgrade/review required | https://github.com/advisories/GHSA-gcqx-w48m-w2h4 |
| root / `expo` | moderate | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-asset` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-constants` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-linking` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-notifications` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-router` | moderate | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `expo-splash-screen` | low | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | Inherited dependency match |
| root / `html-to-text` | low | Email rendering/transitive parsing; templates server controlled; upgrade/review required | Inherited dependency match |
| root / `image-size` | high | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | https://github.com/advisories/GHSA-5p2g-fcmc-qvqq https://github.com/advisories/GHSA-w3rx-r6r6-pgpr |
| root / `onnx-proto` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| root / `onnxruntime-web` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| root / `postcss` | high | Mobile build/toolchain; review upgrade with Expo compatibility; unverified exploitability | https://github.com/advisories/GHSA-6g55-p6wh-862q https://github.com/advisories/GHSA-fxqj-rqcc-2cmp https://github.com/advisories/GHSA-qx2v-qp2m-jg93 https://github.com/advisories/GHSA-r28c-9q8g-f849 |
| root / `protobufjs` | critical | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | https://github.com/advisories/GHSA-2pr8-phx7-x9h3 https://github.com/advisories/GHSA-66ff-xgx4-vchm https://github.com/advisories/GHSA-685m-2w69-288q https://github.com/advisories/GHSA-75px-5xx7-5xc7 https://github.com/advisories/GHSA-f38q-mgvj-vph7 https://github.com/advisories/GHSA-fx83-v9x8-x52w https://github.com/advisories/GHSA-jggg-4jg4-v7c6 https://github.com/advisories/GHSA-jvwf-75h9-cwgg https://github.com/advisories/GHSA-q6x5-8v7m-xcrf https://github.com/advisories/GHSA-wcpc-wj8m-hjx6 https://github.com/advisories/GHSA-xq3m-2v4x-88gg |
| root / `query-string` | moderate | Transitive/tooling package; no live exploit verified; upgrade/reachability review remains open | Inherited dependency match |
| root / `shadcn` | low | Transitive/tooling package; no live exploit verified; upgrade/reachability review remains open | Inherited dependency match |
| root / `sharp` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | https://github.com/advisories/GHSA-f88m-g3jw-g9cj https://github.com/advisories/GHSA-rgj7-g3m4-5g8c https://github.com/advisories/GHSA-wq5f-xc86-pv6w |
| worker / `@xenova/transformers` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| worker / `onnx-proto` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| worker / `onnxruntime-web` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | Inherited dependency match |
| worker / `protobufjs` | critical | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | https://github.com/advisories/GHSA-2pr8-phx7-x9h3 https://github.com/advisories/GHSA-66ff-xgx4-vchm https://github.com/advisories/GHSA-685m-2w69-288q https://github.com/advisories/GHSA-75px-5xx7-5xc7 https://github.com/advisories/GHSA-f38q-mgvj-vph7 https://github.com/advisories/GHSA-fx83-v9x8-x52w https://github.com/advisories/GHSA-jggg-4jg4-v7c6 https://github.com/advisories/GHSA-jvwf-75h9-cwgg https://github.com/advisories/GHSA-q6x5-8v7m-xcrf https://github.com/advisories/GHSA-wcpc-wj8m-hjx6 https://github.com/advisories/GHSA-xq3m-2v4x-88gg |
| worker / `sharp` | high | Inference runtime; controlled model artifacts; image decoder risk remains; supported migration required | https://github.com/advisories/GHSA-f88m-g3jw-g9cj https://github.com/advisories/GHSA-rgj7-g3m4-5g8c https://github.com/advisories/GHSA-wq5f-xc86-pv6w |

## Remaining risks and production recommendation

Application authorization, guest privacy, SSRF controls, agent write fencing and publication integrity have local regression evidence. Operator credential response is open, dependency risk is not eliminated, default Turbopack remains unverified in this environment, and full authenticated deployment/provider/mobile end-to-end validation remains open. Large forecast extraction and detailed reporting have explicit scale limits described above. Do not approve unconditional production readiness or Phase 9 solely from this remediation. Complete the operator checklist, supported inference/auth upgrades, staging checks and CI review first.

No production deployment, real mail/payment/refund, campaign publication, credential rotation, history rewrite or live customer-data access occurred. Suggested/used commit subject: `fix: remediate phases 1-8 security and integration findings`.

## File inventory

The branch diff is the authoritative review artifact. Major areas: web/mobile ownership and recovery clients; Convex auth, order, identity, AI budget, agent, forecast, attribution and maintained analytics; Python contract and scope counts; worker authentication/network/resource controls; Docker, CI, locks and security documentation. The many Convex import-only changes route mutations through one transaction-aware trigger wrapper so aggregate maintenance cannot be bypassed by ordinary repository mutation paths. Test-only modules use static test mappings and are not public production fixtures.

Created/modified files at verification time:

- `.github/workflows/checks.yml`
- `README.md`
- `apps/mobile/app/(tabs)/track.tsx`
- `apps/mobile/app/order/[id].tsx`
- `apps/mobile/components/OrderAccessRecovery.tsx`
- `apps/mobile/components/ai/RagShoppingAssistant.tsx`
- `apps/mobile/lib/visitor-id.ts`
- `apps/web/package.json`
- `apps/web/src/app/(shop)/track-order/[orderNumber]/page.tsx`
- `apps/web/src/app/api/ai/embed-image/route.test.ts`
- `apps/web/src/app/api/ai/embed-image/route.ts`
- `apps/web/src/app/api/vapi/chat/route.test.ts`
- `apps/web/src/app/api/vapi/chat/route.ts`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/about/about-stats-section.tsx`
- `apps/web/src/components/admin/admin-access-gate.tsx`
- `apps/web/src/components/admin/ai-copilot/agent-mode-panel.tsx`
- `apps/web/src/components/ai-shopping/rag-shopping-assistant.tsx`
- `apps/web/src/components/home/store-stats-section.tsx`
- `apps/web/src/components/orders/order-access-recovery.tsx`
- `apps/web/src/components/orders/track-order-view.tsx`
- `apps/web/src/hooks/use-recommendations.ts`
- `apps/web/src/lib/ai/image-embedding/secure-input.test.ts`
- `apps/web/src/lib/ai/image-embedding/secure-input.ts`
- `apps/web/src/lib/ai/image-embedding/service.ts`
- `apps/web/src/lib/limited-body.ts`
- `apps/web/src/lib/recommendations/visitor-id.ts`
- `apps/web/src/providers/ConvexClientProvider.tsx`
- `convex/_generated/api.d.ts`
- `convex/aboutStats.ts`
- `convex/adminContentRecommendations.ts`
- `convex/adminDashboard.ts`
- `convex/adminImageEmbeddings.ts`
- `convex/adminOrders.ts`
- `convex/adminRecommendations.ts`
- `convex/adminReviewAi.ts`
- `convex/adminReviews.ts`
- `convex/adminUsers.ts`
- `convex/agentActions.ts`
- `convex/agentInternal.ts`
- `convex/agents.ts`
- `convex/aiBusinessCopilotQueries.ts`
- `convex/aiCopilotRateLimit.ts`
- `convex/aiCopilotStore.ts`
- `convex/aiUsage.ts`
- `convex/auth.ts`
- `convex/betterAuth/auth.ts`
- `convex/contactMessages.ts`
- `convex/contentRecommendations.ts`
- `convex/crons.ts`
- `convex/email.ts`
- `convex/emailCampaigns.ts`
- `convex/emailHelpers.ts`
- `convex/emailMarketingDashboard.ts`
- `convex/emailTemplates.ts`
- `convex/forecastData.ts`
- `convex/forecastQuality.ts`
- `convex/forecasting.ts`
- `convex/guestIdentity.ts`
- `convex/imageEmbeddingMutations.ts`
- `convex/inAppNotifications.ts`
- `convex/lib/adminPermissions.test.ts`
- `convex/lib/agents/approvals.ts`
- `convex/lib/agents/serialization.ts`
- `convex/lib/agents/stateMachine.ts`
- `convex/lib/ai/businessIntelligence.ts`
- `convex/lib/boundedRead.ts`
- `convex/lib/capabilities.ts`
- `convex/lib/dashboardAggregates.ts`
- `convex/lib/forecasting/eligibility.ts`
- `convex/lib/guestIdentity.ts`
- `convex/lib/notificationAccess.ts`
- `convex/lib/orderAccess.ts`
- `convex/lib/publicOrderDto.ts`
- `convex/lib/rag/grounding.ts`
- `convex/lib/recommendations/verifiedIdentity.ts`
- `convex/lib/securityAnalytics.ts`
- `convex/lib/seedCredentials.ts`
- `convex/migrations.ts`
- `convex/migrations/backfillProductDeliveryWarranty.ts`
- `convex/migrations/backfillProductFinalPrice.ts`
- `convex/mlBehavioralHttp.ts`
- `convex/mlops.ts`
- `convex/orderNotifications.ts`
- `convex/orderPaymentRecovery.ts`
- `convex/orderRecovery.ts`
- `convex/orderTracking.ts`
- `convex/orders.ts`
- `convex/productAi.ts`
- `convex/productCategories.ts`
- `convex/productContentJobs.ts`
- `convex/productPricingRecommendations.ts`
- `convex/productPromotions.ts`
- `convex/productReviewInsights.ts`
- `convex/productReviews.ts`
- `convex/productSearchQueries.ts`
- `convex/products.ts`
- `convex/providerHealthMutations.ts`
- `convex/pushNotificationsInternal.ts`
- `convex/pushTokens.ts`
- `convex/pythonMlShadow.ts`
- `convex/qr.ts`
- `convex/rag.ts`
- `convex/ragData.ts`
- `convex/ragIndexing.ts`
- `convex/recommendationAttribution.ts`
- `convex/recommendationMutations.ts`
- `convex/recommendationQueries.ts`
- `convex/recommendations.ts`
- `convex/reviewAi.ts`
- `convex/reviewAiBackfill.ts`
- `convex/reviewAiGenerations.ts`
- `convex/reviewAiMetrics.ts`
- `convex/reviewAiQueueMutations.ts`
- `convex/reviewCalls.ts`
- `convex/schema.ts`
- `convex/securityAnalytics.test.ts`
- `convex/securityAnalytics.ts`
- `convex/securityRemediation.test.ts`
- `convex/seed.ts`
- `convex/server.ts`
- `convex/settings.ts`
- `convex/stripeRefundAttempts.test.ts`
- `convex/stripeRefundAttempts.ts`
- `convex/subscriberInterests.ts`
- `convex/subscribers.ts`
- `convex/vapi/admin.ts`
- `convex/vapi/browserOwnership.test.ts`
- `convex/vapi/logging.ts`
- `convex/vapi/reviewCallTools.ts`
- `convex/vapi/shoppingTools.ts`
- `convex/vapi/tools.ts`
- `convex/vapi/voiceCartSync.ts`
- `convex/visualProductSearch.ts`
- `convex/visualProductSearchMutations.ts`
- `docker-compose.ai.yml`
- `docs/security/PHASES-1-8-COMPREHENSIVE-AUDIT.md`
- `docs/security/PHASES-1-8-REMEDIATION-REPORT.md`
- `docs/security/PHASES-1-8-REMEDIATION-TRACKER.md`
- `package-lock.json`
- `package.json`
- `scripts/codegen-offline.mjs`
- `scripts/dependency-report.mjs`
- `scripts/security-secret-scan.py`
- `services/ai-service/app/api/routes/rag.py`
- `services/ai-service/app/ml/forecasting/dataset.py`
- `services/ai-service/pyproject.toml`
- `services/ai-service/tests/ml/test_security_scope_counts.py`
- `services/ai-service/tests/rag/test_prepare_contract.py`
- `services/ai-service/uv.lock`
- `services/review-ai-worker/package-lock.json`
- `services/review-ai-worker/src/ollama.js`
- `services/review-ai-worker/src/server.js`
- `services/review-ai-worker/src/server.test.js`
- `tests/contracts/rag-prepare.json`
- `vitest.config.ts`

## Dependency hardening follow-up — 2026-10-30

See [the dependency hardening report](PHASES-1-8-DEPENDENCY-HARDENING-REPORT.md) and [before/after inventory](PHASES-1-8-DEPENDENCY-INVENTORY.csv). This supersedes the prior dependency status: maintained Transformers migration, patched Sharp/PostCSS/email renderer, DOM-free Tiptap, version-separated image/review/RAG embeddings and CPU Torch 2.15. Root matches fall from 29 to 20 and worker from five to zero. AUD-18 remains partially open: supported auth/Expo upgrades and unpatched tooling are explicitly documented. Historical credential response remains operator-only. No application builds, deployment, live migrations or real model/provider calls were performed in this follow-up. New namespaces require owner-controlled artifact validation and reindex planning; they are not parity evidence.
