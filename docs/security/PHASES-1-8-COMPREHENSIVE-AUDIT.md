# Phases 1–8 comprehensive security, bug, architecture and integration audit

## 1. Executive summary

Audit date: 2026-10-29 (Asia/Karachi). **Do not approve this revision for production on the evidence available.** Five high-severity implementation/configuration findings, twelve medium findings, and one low quality finding are confirmed. Critical dependency advisory matches require application-level verification and are counted separately. No application-level critical exploit was confirmed.

Administrator takeover during bootstrap, administrator role escalation, weak guest order ownership checks, image-fetch SSRF and unsafe published AI service defaults take priority. Confirmed integration/correctness defects affect RAG indexing, grounded answers, draft cancellation/approval persistence, and forecasting. Existing tests pass but miss these boundaries.

No provider API credentials were detected in the scanned Git text blobs. **Historical default administrator credentials were found**, and the old default is still documented. Whether any deployment still uses them is unknown. A dependency fixture private key was found in generated server output; it is distinguished from an application credential below. No secrets were tested against providers, transmitted to scanners or printed in this report.

Application code, tests, dependencies and lockfiles were not modified. This report is the only repository addition. Remediation has not started.

| Severity | Confirmed | Probable | Needs verification |
|----------|-----------|----------|--------------------|
| Critical | 0 | 0 | 1 |
| High | 5 | 0 | 0 |
| Medium | 12 | 0 | 0 |
| Low | 1 | 0 | 0 |

## 2. Audit scope

Repository: Yasirbajwa191491/ecommerce-nextjs. Inventory: 1,505 tracked files; apps 858, Convex 375, services 184, shared packages 21, docs 18, n8n 14, scripts 13, plus root configuration. Discovery covered the entire tracked tree, manifests/lockfiles, environment examples, configuration and source risk patterns. Manual review concentrated on public entry points, auth/payment trust boundaries and all eight phase implementations. This is not a claim that every source line or every possible behavior was exhaustively verified.

Included Next.js/Expo apps, shared packages, Convex schema/functions/http/crons, Python FastAPI/training/evaluation/MLOps, review worker, Docker/Vercel/GitHub Actions, accessible history and available generated output. No production deployments, data writes, payment/refund operations, email campaigns, credential validation, rotation or revocation were performed. Python tests use fixture artifacts and synthetic datasets. HTTP/provider behavior in security reproductions was mocked or local.

## 3. Revision and branch

Branch: `feature/agentic-ai-tool-orchestration-multi-step-workflows-and-human-approval`.

Full revision: `fbc6a4a2197fc6a7b37e58e3a36fd384c7f70297` (agentic tool orchestration implementation). Existing checkout `/workspace/ecommerce-nextjs` was used; no worktree was created. The original checkout was clean. Target branch dependencies match the installed locked graph; no dependency upgrades were made. Runtime: Node 24.19.0/npm 11.9.0; Python 3.12.14, frozen uv environment.

## 4. Git history coverage

Fetched all advertised heads and tags through the existing authenticated HTTPS Git proxy. Remote advertised 26 branch heads and one tag (`mobile-v1.0.0-preview`); all were available locally. The clone reports `is-shallow-repository=false`; 265 reachable commits were available across refs. `git fsck --full --no-reflogs` completed with exit 0 and no reported missing/corrupt/dangling objects. The scan used all locally available blob objects, not only branch diffs, so deleted historical files in available objects were included.

Coverage excludes remote-deleted branches/commits no longer retained locally, unadvertised PR refs, GitHub Actions logs/artifacts, hosted deployment configuration/data, and inaccessible external release/mobile artifacts. No claim of complete lifetime GitHub history is made. A blob can have multiple historical paths; the scanner records one mapped path and exact object ID, with commits checked for the credential finding.

## 5. Secret scan methodology

Local-only custom Python scans streamed `git cat-file --batch-all-objects` and mapped `git rev-list --objects --all`: 4,003 blobs, 47,272,030 bytes. Binary/NUL-containing blobs were counted but not interpreted as text. Patterns covered Stripe secret/restricted/webhook keys, GitHub tokens, Google API keys, provider-prefixed keys, Convex deployment tokens, credentialed database URLs, private PEM markers and quoted credential assignments. A second credential-context entropy scan examined the same objects. First pass: 42 assignment candidates, no provider-prefixed matches. Second pass: 273 entropy candidates, largely setting/storage key names and explicit test fixtures. Review of the non-setting candidates found no additional application credential.

Gitleaks and TruffleHog were unavailable; no scanner binaries were downloaded. Pattern/entropy detection is imperfect, particularly for proprietary formats, split/encoded credentials, values in binary files and runtime-injected secrets. No provider validity checks were performed. Generated `.next` output scan covered 1,875 files / 283,808,010 bytes at scan time; it contains mixed prior onboarding dev output and this branch's failed build, not a verified production release. No APK/IPA or production source maps were supplied.

## 6. Secret exposure findings

AUD-01 is historical default admin credential exposure, with current documentation still distributing the old default. Current seed code requires operator-provided credentials, so historical exposure does not prove a new deployment seeds the old password. Owners should treat installations that may have used that password as requiring review and credential/session replacement.

Generated output contained a complete private PEM from `node_modules/happy-dom/src/fetch/certificate/FetchHTTPSCertificate.ts:24`, SHA-256 prefix `7f7f8c83ded1`, in a server chunk source map. Its source explicitly identifies it as a certificate generated for Happy DOM HTTPS requests; the package ships it as a fixture. Other PEM marker matches were JOSE parsing strings. This was not classified as an exposed application/provider key, and no fixture PEM is reproduced here. No evidence established that this key secures a deployed application endpoint. Happy DOM is nevertheless in the runtime dependency graph and has advisory matches (AUD-18).

## 7. Environment variable review

A direct source lookup inventory found 85 `process.env.NAME`/Python getenv references; dynamic bracket lookups and Pydantic aliases were reviewed separately. Public variables found: Convex cloud/site URLs, Vapi public key/assistant ID, Expo site/Convex URLs, Sentry DSN, Stripe publishable key/merchant identifier/Google Pay flag. These are public identifiers/configuration by design. `apps/mobile/lib/stripe-config.ts:1–7` rejects non-`pk_` keys. No private provider credential was found under NEXT_PUBLIC_/EXPO_PUBLIC_ in scanned source.

Server credential families include BETTER_AUTH_SECRET, Stripe secret/webhook keys, Gemini/OpenAI/Anthropic/Groq/OpenRouter provider keys, Vapi private/webhook keys, Resend/Twilio, Convex deploy and admin seed credentials, PYTHON_AI_SERVICE_API_KEY/AI_SERVICE_API_KEY and its previous key, catalog/behavioral export tokens and salt, AI_WORKER_SECRET and image embedding secret. They are referenced through server configuration rather than hardcoded provider values in the scanned tree. No Revolut/Neon credential was detected by the scan; this does not prove none exists outside scope.

Root `.gitignore` ignores `.env*`; the Python service `.env.example` is intentionally tracked and contains blank/example bindings. Python Settings use SecretStr, minimum 32-character production keys, HTTPS host constraints, and safe repr. No injected app credentials were present during onboarding. Hosted Convex/Vercel/Expo/GitHub secrets and their rotation policies were unavailable for verification. Fail-open optional worker/image secrets are separate findings (AUD-06/07). The Git proxy supplies Git access without a printed raw token.

## 8. Authentication findings

AUD-02 covers public first-user administrator bootstrap; AUD-01 covers historical seed credentials. Python bearer auth is fail-closed when the key is absent, compares SHA-256 digests with constant-time comparison, accepts the configured previous key and caps token length (`app/core/security.py:18–64`). Production requires a sufficiently long key. Python authentication tests passed. Better Auth email verification and configured admin plugin were inspected; a valid session alone is not sufficient operator authorization for bootstrap.

## 9. Authorization findings

AUD-03 covers the role hierarchy. AUD-04 covers order ownership, AUD-05 recommendation identity, and AUD-11 cancellation/write races. `requireAdmin` checks user existence, ban status and role server-side. Most reviewed administration/AI/forecast/MLOps entry points invoke it directly or via authenticated internal queries. The static public-function inventory was manually followed through delegated checks, so functions such as adminProductPricing were not incorrectly treated as unauthenticated merely because they lack a literal requireAdmin call.

## 10. Payment security findings

AUD-04 allows unauthorized access/cancellation with email knowledge; it does not show arbitrary payment status escalation. Positive controls: `orderPricing.ts` loads current product prices, rejects mixed currency and checks combined requested stock; cart validation/merge rejects negative/fractional quantities; Stripe webhook uses the raw body and `constructEvent`; paid/refund handlers are internal; event claims and refund attempt idempotency have existing regression tests. QR/payment session IDs are capability-like values, not user identities.

No real Stripe transactions/refunds were executed. No new signature bypass, double inventory deduction or arbitrary refund-destination vulnerability was confirmed. Full distributed webhook races and provider-side behavior remain unverified; passing pure/helper tests does not replace a staging Stripe integration test.

## 11. Convex security findings

Reviewed public registration inventory, HTTP routes, schema indexes, rate limits, scheduled jobs and internal wrappers. Findings are AUD-02–05/08/11–16/19. ML catalog/behavioral HTTP exports require bearer tokens; behavioral export requires token/salt; the documented boolean opt-out is missing server-side (AUD-19). HMAC-derived event/visitor/order tokens are exported instead of raw identities. Dataset projection excludes customer fields. Public wildcard upload URLs and legacy bounded/unbounded scans deserve operational load review, but no separate confirmed exploit is claimed solely from a `.collect()` occurrence.

## 12. Frontend findings

AUD-06 is the image-fetch boundary; AUD-12 the insufficient approval preview; AUD-17 the agent panel lint failure. The Vapi text-chat quota concern is in AUD-08. Reviewed unsafe HTML sinks: policy text goes through escaping or Tiptap rendering; generated agent campaign HTML is escaped before persistence. No confirmed stored XSS was established in this pass. Content security headers, endpoint-specific CSRF posture and externally hosted caches need deployment verification; no hypothetical XSS/CSRF is counted as confirmed.

## 13. Mobile findings

The same Convex guest-order and recommendation identity issues affect Expo callers (AUD-04/05). Public Stripe configuration enforces publishable keys. Recent order capabilities use expo-secure-store (`apps/mobile/lib/recent-orders.ts:19–62`); catalog/offline caches use AsyncStorage. App lock, QR/deep links, wishlist queue and notification unit tests were exercised. Firebase example identifiers are placeholders/public app configuration, not a found service-account private key. No device build, installed-app backup inspection, biometric prompt or real push delivery was performed.

## 14. Python FastAPI findings

AUD-09 is a verified caller/schema mismatch. AUD-17 is failing Python CI formatting/lint. All inference/internal/RAG/forecast/MLOps routers are service-auth protected; health endpoints are deliberately public. Production docs are disabled. Schemas bound batches/top-k/context and forbid extra fields where appropriate. Error handlers omit request inputs and service logging redacts configured credentials and bearer headers. Synchronous model/index work inside async endpoints and total request-body/concurrency limits require load verification; no unauthenticated model promotion or arbitrary file path endpoint was found.

## 15–22. Verified phase inventory and phase findings

| Phase | Implementation verified in source | Controls / limits | Findings and remaining limits |
|---|---|---|---|
| 1 Foundation | FastAPI factory, bearer rotation, health/readiness, Convex adapter, Docker | Production key validation; redirects disabled in service clients; startup does not train models | Python local tests pass; no live service-to-service credential propagation verified |
| 2 Content recommendations | TF-IDF training, manifest/checksum artifacts, content API, Convex snapshot import/publish, legacy fallback | Default strategy convex; separate off/shadow/serve gates; cached snapshots keep Python out of checkout | Artifact trust depends on operator filesystem control; no real-catalog relevance claim |
| 3 Collaborative/hybrid | Behavior ingestion, HMAC export, sparse item-neighbor model, hybrid fusion, temporal evaluation | Client purchase events rejected in new ingestion; paid-order purchase export; export credentials absent by default | AUD-05 identity spoofing; AUD-16 separate analytics conversion spoofing; AUD-19 missing export opt-out; pseudonymous tokens remain tracking data |
| 4 Neural | PyTorch training/inference, inner temporal validation, negative sampling, versioned artifact files | Checksum/schema validation, CPU load, `torch.load(..., weights_only=True)` at neural_artifacts.py:129; customer serve gates retained | Synthetic/offline tests pass; real serving quality and CPU wheel advisory coverage unverified |
| 5 RAG | Web/mobile assistant, public-only documents, Python chunk/index/retrieval, Convex embeddings, grounded generation | Deployment/admin/service/provider gates; embedding-version reconciliation; no admin tool registry in public RAG | AUD-08/09/10: quota bypass, indexing contract failure, claim-to-product grounding gap |
| 6 Forecasting | Eligible paid Stripe/COD extraction, UTC aggregation, time-ordered backtests, baselines/regression, dashboard/publications | Refund/cancel/gifts excluded; data/stock limitations labeled; no automatic inventory/price writes | AUD-13/14: silently partial/stale inputs and publication before complete rows |
| 7 MLOps | Registry/evaluations/promotion records, diagnostic activation/rollback, monitoring/drift, retraining plans/queue, current stock snapshots | Admin+deployment gates; allowlisted job types; approval separate from serving; no arbitrary shell executor | Retraining endpoint plans but does not execute; diagnostic activation does not swap customer caches; no real candidate deployment validated |
| 8 Agentic AI | Eight tools (seven reads, one campaign-draft writer), decision parsing/provider fallback, persistent runs/steps/approvals, cancellation/leases/cron, admin panel | Server registry/argument validation; per-run planner/tool/replan limits; ownership checks; idempotent draft key; approval default on | AUD-11/12/15 and AUD-17. No registered email-send, price/stock/refund/delete/shell/fetch-url tools; multi-step correctness tested only locally |

Phase 7 is deliberately a control plane, not an automatic production trainer/deployer. Python retraining returns executed=false, and activation returns pending_deployment/customer-serving-unchanged semantics. This limitation is not reported as unauthorized execution. Registry checksum verification is an integrity check, not a signature proving artifact provenance. Joblib remains code-capable deserialization at operator-controlled artifact paths; no request-selected untrusted artifact upload/load chain was established. Read-only artifact mounts and restricted writes remain essential.

Prompt injection filtering is heuristic. The agent also enforces a finite tool allowlist, permissions, arguments, approval records and write idempotency server-side; those boundaries were reviewed rather than treating prompts as authorization. No claim is made that all prompt injection is solved. Its sole writer saves an editable draft, not a sent campaign. No real LLM/provider fallback calls were made.

## 23. Dependency vulnerabilities

AUD-18 contains advisory matches, **not confirmed application exploits**. Installed key versions: Next 16.2.7, Better Auth 1.6.14, Convex 1.40.0, Vitest 3.2.7, Happy DOM 20.11.2, @xenova/transformers 2.17.2. Both npm lockfiles were queried separately. Counts must not be added as unique vulnerabilities because graphs overlap and package rollups include meta-vulnerabilities.

Representative provider-reported advisory URLs: Next image SVG RCE [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw), Next AVIF image RCE [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), Better Auth email-OTP account takeover [GHSA-qq9h-g4jm-xgf3](https://github.com/advisories/GHSA-qq9h-g4jm-xgf3), Vitest mocker file read [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). Advisories may target unused plugins, Windows-only paths, dev servers or disabled features; validate those preconditions before treating them as exploits. The repository enables emailOTP and image optimization, making these paths priorities for review.

Python pip-audit: certifi 2026.7.22 → PYSEC-2026-4320/GHSA-6q48-6c7w-9gw2 (two duplicate entries with fix suggestions 2026.10.18/2026.10.19); pytest 8.4.2 → PYSEC-2026-1845/CVE-2025-71176 (duplicate entries, suggested fix 9.0.3); setuptools 84.0.0 → GHSA-xmj3-9gf7-h52w (suggested fix 84.1.0, Windows wheel-install path). Certifi is runtime TLS-related; pytest is dev/test; setuptools' reported exploit precondition is not this Linux runtime. CPU torch 2.10.0+cpu was explicitly skipped because it is not a PyPI-resolvable version in that scanner. Docker OS packages/base-image vulnerabilities were not scanned; no container image was built.

Root npm package rollup:

| Package | Reported severity | Direct | Triage scope |
|---|---|---|---|
| @expo/cli | moderate | no | Runtime/tooling reachability requires review |
| @expo/config | low | no | Runtime/tooling reachability requires review |
| @expo/config-plugins | moderate | no | Runtime/tooling reachability requires review |
| @expo/metro-config | moderate | no | Runtime/tooling reachability requires review |
| @expo/prebuild-config | low | no | Runtime/tooling reachability requires review |
| @hono/node-server | moderate | no | Runtime/tooling reachability requires review |
| @modelcontextprotocol/sdk | high | no | Runtime/tooling reachability requires review |
| @react-email/components | low | yes | Runtime/tooling reachability requires review |
| @react-email/render | low | no | Runtime/tooling reachability requires review |
| @react-navigation/core | moderate | no | Runtime/tooling reachability requires review |
| @tiptap/core | high | no | Runtime/tooling reachability requires review |
| @vitest/mocker | moderate | no | Development graph |
| @xenova/transformers | high | yes | Runtime/tooling reachability requires review |
| @xmldom/xmldom | high | no | Runtime/tooling reachability requires review |
| axios | high | no | Runtime/tooling reachability requires review |
| better-auth | critical | yes | Runtime/tooling reachability requires review |
| body-parser | high | no | Runtime/tooling reachability requires review |
| brace-expansion | high | no | Runtime/tooling reachability requires review |
| compression | high | no | Runtime/tooling reachability requires review |
| convex | high | yes | Runtime/tooling reachability requires review |
| decode-uri-component | moderate | no | Runtime/tooling reachability requires review |
| deepmerge | low | no | Runtime/tooling reachability requires review |
| engine.io | high | no | Runtime/tooling reachability requires review |
| esbuild | low | no | Runtime/tooling reachability requires review |
| expo | moderate | yes | Runtime/tooling reachability requires review |
| expo-asset | low | no | Runtime/tooling reachability requires review |
| expo-constants | low | yes | Runtime/tooling reachability requires review |
| expo-linking | low | yes | Runtime/tooling reachability requires review |
| expo-notifications | low | yes | Runtime/tooling reachability requires review |
| expo-router | moderate | yes | Runtime/tooling reachability requires review |
| expo-splash-screen | low | yes | Runtime/tooling reachability requires review |
| fast-uri | high | no | Runtime/tooling reachability requires review |
| follow-redirects | high | no | Runtime/tooling reachability requires review |
| happy-dom | high | yes | Runtime/tooling reachability requires review |
| hono | high | no | Runtime/tooling reachability requires review |
| html-to-text | low | no | Runtime/tooling reachability requires review |
| image-size | high | no | Runtime/tooling reachability requires review |
| ip-address | high | no | Runtime/tooling reachability requires review |
| js-yaml | high | no | Runtime/tooling reachability requires review |
| nanoid | high | no | Runtime/tooling reachability requires review |
| next | critical | yes | Runtime/tooling reachability requires review |
| node-forge | high | no | Runtime/tooling reachability requires review |
| onnx-proto | high | no | Runtime/tooling reachability requires review |
| onnxruntime-web | high | no | Runtime/tooling reachability requires review |
| postcss | high | yes | Runtime/tooling reachability requires review |
| postcss-selector-parser | moderate | no | Runtime/tooling reachability requires review |
| prosemirror-view | high | no | Runtime/tooling reachability requires review |
| protobufjs | critical | no | Runtime/tooling reachability requires review |
| proxy-addr | critical | no | Runtime/tooling reachability requires review |
| qs | moderate | no | Runtime/tooling reachability requires review |
| query-string | moderate | no | Runtime/tooling reachability requires review |
| shadcn | high | yes | Runtime/tooling reachability requires review |
| sharp | high | no | Runtime/tooling reachability requires review |
| shell-quote | critical | no | Runtime/tooling reachability requires review |
| socket.io-adapter | high | no | Runtime/tooling reachability requires review |
| socket.io-parser | high | no | Runtime/tooling reachability requires review |
| source-map-js | high | no | Runtime/tooling reachability requires review |
| tinypool | critical | no | Development graph |
| undici | high | no | Runtime/tooling reachability requires review |
| uuid | moderate | no | Runtime/tooling reachability requires review |
| vite | high | no | Development graph |
| vitest | critical | yes | Development graph |
| ws | high | no | Runtime/tooling reachability requires review |
| xcode | moderate | no | Runtime/tooling reachability requires review |
| zod | high | no | Runtime/tooling reachability requires review |

Separate worker rollup:

| Package | Reported severity | Direct |
|---|---|---|
| @xenova/transformers | high | yes |
| body-parser | high | no |
| onnx-proto | high | no |
| onnxruntime-web | high | no |
| protobufjs | critical | no |
| proxy-addr | critical | no |
| qs | moderate | no |
| sharp | high | no |

## 24. Code quality findings

AUD-17 captures actual failed commands. AUD-13/14/15 are demonstrated correctness/persistence problems independent of style. Web and mobile TypeScript passed. No Python static type checker is configured in pyproject.toml and none was represented as passing. Ruff is a linter, not a complete type/architecture proof.

## 25. Integration findings

The RAG caller and Python schema disagree (AUD-09), even though both languages' suites pass. RAG multi-product validation is insufficient (AUD-10). Forecast publication is not atomic across its batches (AUD-14). Agent write decisions can outrun cancellation (AUD-11) and serialized approval payloads can be corrupted (AUD-15). Existing LLM provider adapters and recommendation fallbacks remain in source; none was removed/rewritten. No live provider routing, Convex deployment, n8n webhook, external SMS/email, artifact activation or mobile/native integration was verified.

## 26. Test execution results

Commands ran on the audited revision except explicitly labeled earlier onboarding checks. Output logs and synthetic reproduction scripts are local under `/workspace/audit-evidence/`; they are not committed, do not contain raw discovered credentials, and are not required by production code.

| Command / working directory | Exit | Executed results |
|---|---:|---|
| npm ci --no-audit --no-fund --cache /workspace/.npm-cache / root | 0 | 1,772 packages installed during onboarding; branch lockfile unchanged |
| uv sync --frozen / services/ai-service | 0 | Python 3.12.14; 47 pinned packages installed |
| npm run typecheck:all / root | 0 | Web and mobile tsc --noEmit completed |
| ./node_modules/.bin/vitest run --maxWorkers=2 / root | 0 | 49 files, 253 tests passed; 0 failed |
| ./node_modules/.bin/vitest run --config vitest.mobile.config.ts --maxWorkers=2 / root | 0 | 20 files, 97 tests passed; 0 failed |
| OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 MKL_NUM_THREADS=2 .venv/bin/pytest / Python service | 0 | 189 passed; 0 failed; 1 TestClient deprecation warning |
| .venv/bin/ruff check . / Python service | 1 | 2 diagnostics in rag.py (I001/E501) |
| .venv/bin/ruff format --check . / Python service | 1 | 1 file would change; 163 already formatted |
| npm run lint / root | 1 | 1 error, 31 warnings |
| npm run build with documented public Convex URLs / root | 1 | Target-branch build blocked fetching Inter from Google Fonts; not a confirmed source compilation defect |
| npm audit --json / root | 1 | Advisory findings; 65 package rollups |
| npm audit --json / services/review-ai-worker | 1 | Advisory findings; 8 package rollups |
| pip-audit --disable-pip --no-deps -r frozen-export --format json | 1 | 5 entries / 3 packages / 3 unique IDs; CPU torch skipped |
| git ls-remote; git fetch all advertised heads/tags; git fsck --full --no-reflogs | 0 | Remote coverage/integrity checks completed |
| Local redacted blob/entropy scans | 0 | 4,003 Git blobs; historical seed candidate confirmed; no provider-key match |
| node /workspace/audit-evidence/local-pocs.cjs | 0 | Email-only order access; multi-product grounding bypass; forecast latest-day drop; valid approval JSON corruption; cancelled-run draft write reproduced |
| node /workspace/audit-evidence/access-pocs.cjs | 0 | Bootstrap promotion, admin role forwarding, email-only wishlist lookup reproduced with mocks |
| node /workspace/audit-evidence/image-poc.cjs | 0 | Arbitrary loopback URL reaches mocked fetch; no actual private-network request |
| node /workspace/audit-evidence/export-poc.cjs | 0 | HTTP export accepted a synthetic credential with export flag=false |
| FastAPI TestClient prepare contract fixture | 0 | Correct payload HTTP 200; actual caller shape HTTP 422 reproduced |

Total completed repository unit tests: **539 passed** (253 + 97 + 189), none failed. Reproduction scripts succeeding means they reproduced bugs, not that the bugs are fixed. Convex tests primarily exercise helpers; no live Convex integration suite or production database test was performed. The first Python suite attempt stalled under shell socket restrictions and was terminated; rerun with required TestClient permissions completed. The initial npm attempt similarly needed permitted proxy access; the successful clean frozen install supersedes that incomplete attempt.

Earlier main-branch onboarding storefront request returned HTTP 500 when Convex could not be reached. That result is not relabeled as a target-branch functional test. Target-branch full storefront behavior remains unverified. Google Fonts/Convex destination additions were saved in the onboarding draft but were not applied/published during this audit.

## 27. Production readiness assessment

**Not ready for production sign-off.** Resolve high-severity trust boundaries, review historically seeded deployments, triage critical runtime advisory matches and repair verified contract/persistence bugs. Re-run failed quality checks and demonstrate a target-branch storefront request, isolated Convex auth/payment tests and representative Python integration after network setup. Feature gates defaulting off reduce current AI exposure; they do not repair unsafe behavior once features are enabled. There is no evidence of a current compromise, and no live secret validity was established.

## 28. Prioritized remediation plan

| Order | Issues / risk | Components | Recommended change and regression | Breaking/change considerations |
|---|---|---|---|---|
| 1 | AUD-01 historical admin credential | Seed/docs/deployed admin accounts | Owner reviews affected deployments, changes credentials/revokes sessions if relevant; verify env-only seed and stale documentation removal | Session invalidation; owner-controlled action |
| 2 | AUD-02 authentication/bootstrap takeover | Convex/Better Auth | Gate/remove public bootstrap; unauthorized/concurrent setup tests | Changes first-run provisioning |
| 3 | AUD-03/04/05 authorization and payment access | Admin/auth/orders/wishlist; web/mobile | Enforce role hierarchy and verified ownership; cross-user/admin tests | Migrate guest email-only flows to OTP/capability; client updates |
| 4 | AUD-11/12/15 execution/approval reliability | Agent backend/panel | Transactional cancellation/gate checks, exact payload preview, safe JSON storage; concurrent approval/cancel and max-payload tests | Mostly additive UI/API and persistence migration |
| 5 | AUD-06/07/19 network and privacy exposure | Image API/Docker/worker | Allowlist/stream image input; private service bindings and mandatory auth; server-side export opt-out; SSRF/privacy/config tests | Storage/input API and operator configuration changes |
| 6 | AUD-08/09/10 RAG cost/contract/claim integrity | Convex/Python/web/mobile | Atomic quotas, contract-aligned prepare request, product-scoped grounded rendering; disabled/default/concurrent/contract tests | RAG response structure may change |
| 7 | AUD-18 dependency risks | npm/Python/images | Reachability triage and targeted tested upgrades, runtime first; retain all integrations | Potential majors and lockfile changes require approval |
| 8 | AUD-13/14/16 data correctness | Forecast/analytics | Complete aggregates, true latest window, stage-then-publish, authoritative conversion writes; large-history/failure/replay tests | Analytics recalculation and publication migration may be needed |
| 9 | AUD-17 quality and broader maintainability | Python/web/CI | Repair lint/import formatting, expand contract/auth tests; pin CI actions and image digests after review | No expected user API change |

No remediation has been implemented. Production changes, real credential rotation and application modifications require the user's explicit second-stage authorization.

## 29. Unverified risks and limits

- Hosted credentials, deployed feature-flag values, real artifact provenance/quality, network firewall exposure and actual past default-password use were not available. Do not infer these from checked-in defaults.
- npm advisories are provider-reported matches, not exploit verification. Python CPU torch, OS/base-image packages and mobile binary dependencies have incomplete advisory coverage.
- No live checkout/refund/email/SMS/AI-provider/Convex/n8n/push operations or native app builds were exercised. No Docker build/runtime security test was performed.
- Public RAG session keys are caller-controlled context selectors; guessing another key depends on client entropy/disclosure. No independent high-severity cross-session leak is asserted without that evidence.
- Agent flags and administrator permissions are snapshot into runs; rechecking them at each internal side effect should accompany AUD-11 remediation. No unrestricted shell/HTTP tool chain was found.
- Operator-controlled joblib artifacts remain executable serialization even with checksums; an attacker with filesystem/manifest write access is outside the demonstrated request threat model. Do not load externally supplied artifacts without a verified trusted provenance chain.
- CI action refs are version tags, not immutable commit SHAs; Docker bases/ollama:latest are mutable. These are supply-chain hardening observations, not proof of compromised dependencies.
- Build/HTTP validation is limited by unapplied network configuration; no production-ready build or published cloud snapshot was established.
- No secret scanner can prove absence of unknown, encoded or binary credentials. Remote-deleted/unadvertised history and hosted logs are outside the available scope.

## 30. Final conclusion

This revision implements all eight phase foundations, with Phase 7 intentionally retaining manual deployment/training boundaries and Phase 8 limited to read tools and draft creation. That inventory does not establish end-to-end readiness. Confirmed authorization, SSRF/configuration, RAG contract/grounding and agent/forecast persistence defects need remediation. The 539 passing tests are useful evidence for existing behavior, while the local bug reproductions show missing security/contract coverage. Historical default administrator credentials were found; no live provider credential was detected or tested in the scanned scope. Stop here for review and explicit remediation approval.

## Detailed finding records

### AUD-01 — Historical default super-admin password remains disclosed in documentation

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Cross-cutting
- **Evidence:** Historical convex/seed.ts:101 at 614869e1024d3fba2757c130a04566cd2c7b303e (blob 0387dd96a6c324bea7cd7c1a1bba3bda3a1d74e4); README.md:70; current convex/seed.ts:169–177.
- **Technical explanation:** The historical seed passes a hardcoded password to account creation and promotes the account. Current seeding requires ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD, but the README still publishes the old default. This is a real default credential used by code, not a provider API token. SHA-256 prefix of the password: ef797c8118f0. No credential was tested against any service.
- **Potential impact:** Any installation retaining the historical seeded credential may allow administrator compromise. Current deployment use and credential rotation status are unknown. The seed was server-side; current documentation distributes the default, not a newly found client-bundled live provider key.
- **Safe local reproduction:** Use git log --all --find-object=0387dd96a6c324bea7cd7c1a1bba3bda3a1d74e4 --no-patch to identify exposure commits; inspect the seed locally with values redacted. Do not attempt login.
- **Recommended fix:** Have the owner review installations created with the old seed and change/revoke affected passwords and sessions if they may still be valid. Remove stale credential instructions. Do not rotate automatically or rewrite history as part of this audit.
- **Regression test:** Assert seeding fails without explicit credentials, and documentation does not contain a usable default password.
- **Change considerations:** Credential/session changes can invalidate existing administrator sessions; coordinate with the owner.

### AUD-02 — Public bootstrap grants super-admin to an arbitrary signed-in user

- **Severity:** High · **Confidence:** Confirmed · **Affected phase:** Authentication / all phases
- **Evidence:** convex/auth.ts:197–226; convex/betterAuth/auth.ts:72–75.
- **Technical explanation:** bootstrapSuperAdmin only requires a signed-in user and absence of an existing superAdmin. It then writes role=superAdmin and emailVerified=true. There is no operator setup token, allowlisted identity, or deployment bootstrap gate. Email/password signup is enabled.
- **Potential impact:** A user can claim a new/unseeded deployment, or a deployment after its last super-admin is removed. This is conditional on the absence of a super-admin, not a bypass on every initialized deployment.
- **Safe local reproduction:** Run the real mutation handler with a mocked auth user having role=user and an adapter fixture returning no super-admin. The local fixture returned bootstrapped=true and wrote role=superAdmin. No remote mutation was used.
- **Recommended fix:** Remove public self-promotion or require an expiring operator-controlled bootstrap authorization tied to a specified verified identity. Finish provisioning before exposing signup.
- **Regression test:** Test ordinary users, missing setup authorization, existing/absent super-admin, and simultaneous bootstrap attempts. Only the authorized operator should succeed.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-03 — Ordinary administrators can assign the super-admin role

- **Severity:** High · **Confidence:** Confirmed · **Affected phase:** Authorization / all phases
- **Evidence:** convex/adminUsers.ts:38–76; convex/betterAuth/auth.ts:27–41,94–99; node_modules/better-auth/dist/plugins/admin/routes.mjs:43–80.
- **Technical explanation:** createUser/setRole permit superAdmin while requiring only requireAdmin. The Better Auth admin role explicitly receives user:set-role and user:create. Its set-role endpoint checks that permission and that the role exists; it does not enforce this application's admin/superAdmin hierarchy. UI restrictions do not repair the direct auth endpoint.
- **Potential impact:** An admin can promote itself or another account to superAdmin and bypass operations intended to be super-admin-only. Related set-password/delete/ban permissions also merit hierarchy enforcement.
- **Safe local reproduction:** Local handler fixture with role=admin forwards {userId: self, role: superAdmin} to auth.api.setRole. Inspect the installed permission check to verify it allows the supplied role; no live account was altered.
- **Recommended fix:** Enforce hierarchy in both Convex wrappers and Better Auth plugin permissions/endpoints. Reserve role assignment, super-admin creation, and sensitive operations against super-admin targets to super-admins.
- **Regression test:** Run isolated auth endpoint tests proving an admin cannot self-promote, create a super-admin, or alter a super-admin; confirm authorized super-admin management still works.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-04 — Knowing an order number and email substitutes for ownership verification

- **Severity:** High · **Confidence:** Confirmed · **Affected phase:** Payments / authorization / mobile and web
- **Evidence:** convex/lib/orderAccess.ts:23–37; convex/orders.ts:303–334,1624–1670.
- **Technical explanation:** assertOrderAccess accepts a matching caller-provided email OR the order access token. getOrderByNumber uses this check and returns the full order object, including its capability token and customer details. cancelOrder uses the same helper and can initiate cancellation/refund handling. Neither requires proof of control of that email.
- **Potential impact:** Anyone knowing an order number and email can read private order data and obtain the stronger access token; eligible orders can be cancelled. This is not a claim of bypassing Stripe signatures or refunding to an attacker-selected account.
- **Safe local reproduction:** Local call to hasOrderAccess for a fixture order with a secret token returns true with only the matching victim@example.invalid email and no auth session/token. Trace that helper into the two public handlers; do not exercise cancellation remotely.
- **Recommended fix:** Require an unguessable order capability, a verified email OTP, or an authenticated owner. Return a minimal DTO and withhold capability tokens from weak lookup paths. Rate-limit lookups.
- **Regression test:** Fixture tests must reject known email+order number without ownership proof, allow valid capabilities, and verify cancellation cannot schedule refunds for an unauthorized caller.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-05 — Wishlist and behavioral identities trust arbitrary customer email

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 3 / recommendations / web and mobile
- **Evidence:** convex/recommendationQueries.ts:68–91; convex/recommendationMutations.ts:33–65,207–260; convex/lib/recommendations/identity.ts:17–34.
- **Technical explanation:** Public wishlist queries and mutations derive identityKey directly from customerEmail. The supplied visitorId need not belong to the customer. linkVisitorToCustomer and behavior ingestion likewise accept an unverified email/phone identity.
- **Potential impact:** An unauthenticated caller can read or change another customer's wishlist and contaminate recommendation profiles. The reviewed wishlist response contains product IDs, not payment credentials.
- **Safe local reproduction:** A local query fixture supplying attacker visitorId and victim email selected identityType=customer, identityKey=victim@example.invalid and returned the fixture victim product. Test add/remove using a mock DB only.
- **Recommended fix:** Derive customer identities from a verified session/ownership capability. Use separate signed guest identifiers, and require proof before merging guest/customer profiles.
- **Regression test:** Two-user tests should deny cross-user reads/writes/merges and preserve authorized offline wishlist sync.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-06 — Image embedding endpoint permits arbitrary server-side URL fetches

- **Severity:** High · **Confidence:** Confirmed · **Affected phase:** Frontend API / visual search
- **Evidence:** apps/web/src/app/api/ai/embed-image/route.ts:8–37; apps/web/src/lib/ai/image-embedding/service.ts:68–96.
- **Technical explanation:** When IMAGE_EMBED_API_SECRET is unset, the route accepts all requests. imageUrl is passed directly to fetch with default redirect following, without protocol/host/address restrictions. The 5 MiB check happens after response.arrayBuffer has allocated the entire response.
- **Potential impact:** Blind SSRF to services reachable by the deployment, redirect-based SSRF, and memory/compute exhaustion. The cloud audit machine's restrictive egress does not establish production protections; arbitrary response contents are not directly returned by this route.
- **Safe local reproduction:** Execute embedImage with a mocked transformer and fetch, using a loopback fixture URL. The real code called fetch for http://127.0.0.1:8999/local-audit-fixture with default redirect following. No real private host or metadata service was contacted.
- **Recommended fix:** Prefer controlled storage IDs or allowlisted HTTPS hosts. Validate resolved addresses and every redirect, reject loopback/private/link-local destinations, stream with a byte cap, and enforce authentication/rate limits/request size limits.
- **Regression test:** Use mocked DNS/HTTP for loopback, link-local, private IPv4/IPv6, redirects and oversized/chunked responses; reject before making unsafe requests.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-07 — Docker AI stack publishes Ollama and worker with unsafe authentication defaults

- **Severity:** High · **Confidence:** Confirmed · **Affected phase:** Infrastructure / existing AI integrations
- **Evidence:** docker-compose.ai.yml:2–19; services/review-ai-worker/src/server.js:11–22,110–112.
- **Technical explanation:** Ollama is published as 11434:11434, and the worker as 3100:3100, without a loopback host binding. The worker compose configuration falls back to a fixed development secret. Running the worker directly with an empty AI_WORKER_SECRET disables its auth check. The Python compose file has better loopback/read-only defaults and is not the affected service.
- **Potential impact:** On a host whose firewall exposes these published ports, unauthenticated Ollama inference/model operations and predictable/no-auth worker inference are available to other hosts. No assertion is made that a production host is currently reachable.
- **Safe local reproduction:** Inspect rendered compose port bindings and the worker conditional in an isolated environment. An empty SECRET makes the middleware call next for a non-health route. No model download or exposed Docker service was started for this audit.
- **Recommended fix:** Bind local services to loopback or private container networks; place remote service access behind authenticated TLS. Require a nonempty operator-supplied worker secret and remove fixed fallback credentials. Pin images after review.
- **Regression test:** Configuration tests should reject wildcard published ports without an explicit exposure policy and verify missing/wrong secrets fail closed.
- **Change considerations:** Host/network and secret configuration changes require updating authorized callers.

### AUD-08 — RAG rate limiting can be bypassed by omitting or changing sessionKey

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 5
- **Evidence:** convex/rag.ts:120–142,210,252–261; convex/lib/rag/content.ts:76–85,117–130.
- **Technical explanation:** The public ask action only checks/increments the 30/hour counter when a valid caller-chosen sessionKey exists. Missing/invalid keys skip both blocks. Counts are read in a query and saved after provider work, allowing concurrent requests to consume the same count. Replacing the session key creates another allowance.
- **Potential impact:** When the RAG feature is enabled and its service/provider are configured, anonymous callers can bypass intended quotas and incur embedding/LLM spending. The separate Vapi chat route also has no visible app-level request quota, message-length cap, or fetch timeout (apps/web/src/app/api/vapi/chat/route.ts:40–91).
- **Safe local reproduction:** Use mocked Python/LLM clients; call ask repeatedly without sessionKey and observe that neither session read nor write runs. For concurrency, run two requests with count 29 before either write. No paid provider calls are needed.
- **Recommended fix:** Reserve quota atomically before any provider call, under a server-derived authenticated or signed guest identity, with global/per-provider budgets. Treat conversation keys as context selectors, not quota identities.
- **Regression test:** Test missing/invalid/new keys, concurrency at the boundary, failed provider calls and deployment disabled states.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-09 — Convex RAG indexing always sends a body rejected by Python prepare

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 5 / integration
- **Evidence:** convex/ragIndexing.ts:27–35,54–57,164–167,197–201; services/ai-service/app/rag/schemas.py:171–179; services/ai-service/app/api/routes/rag.py:24–26.
- **Technical explanation:** IndexBody requires embedding_mode, and indexBody sends that full object to /api/v1/internal/rag/prepare. PrepareRequest forbids extra fields and does not define embedding_mode. Product and policy indexing therefore fail before embedding/indexing can complete.
- **Potential impact:** A fresh catalog RAG index cannot be created through the implemented Convex workflow. Existing stale indices do not demonstrate this path works.
- **Safe local reproduction:** FastAPI TestClient with a synthetic bearer key returned 200 for {products:[]} and 422 extra_forbidden for {products:[], embedding_mode:provided}. The latter is the body shape the Convex caller constructs.
- **Recommended fix:** Send a dedicated prepare payload matching PrepareRequest; keep indexing-only fields in the index request. Verify both source languages against a shared contract.
- **Regression test:** Add a caller-to-FastAPI contract test for product and policy indexing, not only tests that exercise each service separately.
- **Change considerations:** No public client API change should be necessary.

### AUD-10 — Strict RAG grounding does not bind claims to individual products

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 5
- **Evidence:** convex/lib/rag/grounding.ts:74–98; convex/rag.ts:220–239.
- **Technical explanation:** Every detected dollar/USD amount is accepted if it matches any cited fact, and stock conflicts are checked with every across all cited products. There is no association between a claim, its named product, and that product's current fact. Non-dollar currencies are also outside the MONEY matcher.
- **Potential impact:** Multi-product answers can falsely state prices/availability yet be returned as grounded. This undermines shopping advice; checkout still derives prices server-side.
- **Safe local reproduction:** With A=$10/out of stock and B=$20/in stock, a local strict-mode check accepted “Product A costs $20. Product B costs $10. Both are in stock.” with grounded=true and reasons=[]. All data was synthetic.
- **Recommended fix:** Use structured product-scoped claims and deterministic rendering/validation against current facts, including currency. Reject unsupported product-fact associations instead of validating a bag of amounts.
- **Regression test:** Test swapped prices, mixed stock, non-USD currencies, ambiguous products, invalid citations and unsupported claims in strict and standard modes.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-11 — A cancelled agent run can still create an approved draft

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 8
- **Evidence:** convex/agentInternal.ts:416–475,500–541; convex/lib/agents/stateMachine.ts:93–106; convex/agentActions.ts:128–141.
- **Technical explanation:** createApprovedDraft reads the run but does not reject cancelled/terminal/expired runs or verify the current lease/version. Cancellation only invalidates pending approvals; an already approved approval remains usable. An action resuming from an older snapshot can reach the write after cancellation committed.
- **Potential impact:** A campaign draft can appear after the administrator cancelled the run. This tool only creates drafts; no email sending, price changes, inventory writes, or payment tools are registered.
- **Safe local reproduction:** Run the actual mutation handler with a mocked cancelled run and an unexpired approved approval. It returned available=true and inserted emailCampaigns plus agentAuditLogs in the fixture DB. No production state was touched.
- **Recommended fix:** In the same transaction as the write, require a current nonterminal run, correct lease/version, valid approval and current authorization/gates. Make cancellation win against any subsequent write.
- **Regression test:** Integration tests should interleave approval, resume, cancellation and draft mutation, and assert no write after cancellation or expiry.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-12 — Human approval UI omits the draft arguments being approved

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 8 / frontend
- **Evidence:** convex/agents.ts:117–133; apps/web/src/components/admin/ai-copilot/agent-mode-panel.tsx:126–140; convex/lib/agents/orchestrator.ts:326–336.
- **Technical explanation:** The getRun DTO strips approval arguments, and the approval card shows only the model-generated summary/risk/expiry. The administrator cannot inspect the proposed subject, body, product IDs, promotion explanation or rationale before approving the saved draft.
- **Potential impact:** A misleading summary or injected store text can obtain approval for draft content the reviewer did not see. Arguments are hash-bound internally, but a hash does not make hidden content reviewable. This is not a demonstrated bypass allowing email sending.
- **Safe local reproduction:** Use a fixture approval with an innocuous summary and a different draft body; inspect the getRun mapping and rendered card. Neither includes the draft fields.
- **Recommended fix:** Return a safe immutable preview of the exact normalized write payload with the approval request. Show it before Approve and bind the decision to that payload.
- **Regression test:** UI/API tests should verify subject/body/product/promotion previews are present and match the payload eventually written.
- **Change considerations:** Additive DTO/UI change.

### AUD-13 — Published forecasts silently use truncated history and partial-store totals

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 6
- **Evidence:** convex/forecasting.ts:222–249,251–288; convex/forecastData.ts:12–13,41–62; convex/lib/forecasting/eligibility.ts:32–53.
- **Technical explanation:** Publication reads at most 8 pages of 25 orders without reporting incomplete extraction, retains only the first 12 products, and derives category/store series from those products. fillSalesDays walks from the oldest day and stops after 180, dropping the most recent days for longer spans. Series also stop at the last sale rather than a common current cutoff.
- **Potential impact:** Forecasts labeled store/category can represent only a subset, and sparse sales can produce stale input windows. Current stock is not automatically modified, but reorder/stockout recommendations can be misleading.
- **Safe local reproduction:** A local history fixture with sales on 2026-01-01 and 2026-10-01 produced 180 points ending 2026-06-29, omitting the latest sale. An isolated >12-product/>200-order fixture demonstrates the publication bounds; no production orders were extracted.
- **Recommended fix:** Build complete resumable aggregates with a declared cutoff and explicit coverage. Aggregate store/category before display/product caps, select the latest bounded window, and fill through the common cutoff while distinguishing missing/stockout days.
- **Regression test:** Test >200 orders, >12 products, histories >180 days, inactive/no-sale products, refunds/COD eligibility, and recent zero-sale days.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-14 — Forecast publication becomes visible before its rows are stored

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 6 / integration
- **Evidence:** convex/forecastData.ts:109–122; convex/forecasting.ts:316–327,355–369.
- **Technical explanation:** beginPublication archives current publications and inserts the new one as published before the action writes forecast points and insights in later mutations. A failed batch leaves the new published record incomplete and the last good publication archived.
- **Potential impact:** Dashboards/agent tools can observe empty or partial results as a published forecast, and failures can remove the last usable publication.
- **Safe local reproduction:** Using mocked DB/scheduler, execute beginPublication then simulate failure of the first addForecastRows call. The control flow has already committed published status. A concurrent dashboard read can select the incomplete publication.
- **Recommended fix:** Stage an unpublished candidate, write/validate all expected rows, then atomically switch the published pointer. Keep the previous version readable until that switch.
- **Regression test:** Inject failures between every batch, read concurrently, and verify failed candidates never replace the last complete publication.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-15 — Valid draft arguments are corrupted by slicing serialized approval JSON

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 8
- **Evidence:** convex/agentInternal.ts:31–39,83–88,319; convex/lib/agents/tools.ts:100–109,132–158; convex/lib/agents/approvals.ts:67–69.
- **Technical explanation:** Tool validation permits a 4,000-character body and other fields, but approval persistence takes JSON.stringify(arguments).slice(0,8000). JSON escaping can expand valid content beyond 8,000 characters; truncation produces invalid JSON. readRunRecord then substitutes an empty object and approval hash verification fails.
- **Potential impact:** Legitimate generated drafts containing many quoted strings/newlines can become impossible to approve. Other JSON fields are also sliced, so review similar persistence boundaries.
- **Safe local reproduction:** A local fixture with a 4,000-quote body and one synthetic product ID passes validateToolArguments. Serialized size was 8,168 characters; JSON.parse on the stored slice throws.
- **Recommended fix:** Bound encoded byte length before accepting input and persist valid structured JSON. Never truncate serialized JSON arbitrarily; return a clear validation error if the payload cannot be stored.
- **Regression test:** Test maximum field sizes, escaping, Unicode byte sizes, round-trip persistence, hash stability and approval execution.
- **Change considerations:** No behavior change for already supported small payloads.

### AUD-16 — Clients can fabricate recommendation conversions and revenue

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 3 / existing recommendation analytics
- **Evidence:** convex/recommendationMutations.ts:294–334; convex/lib/recommendations/behaviorEventPolicy.ts:8–11; convex/pythonMlShadow.ts:253–274.
- **Technical explanation:** Public recordRecommendationInteraction accepts conversion and arbitrary revenue and adds them to recommendationAnalytics without validating an order/payment or deduplicating an order event. The newer behavior policy rejects client purchase events and purchase export reads paid orders, but those protections do not cover this separate analytics entry point.
- **Potential impact:** Anonymous callers can inflate/deflate conversion and revenue statistics and poison business/optimization inputs. The authoritative Phase 3 purchase export is not shown to accept fabricated purchases by this path.
- **Safe local reproduction:** Call the real handler with a mocked DB and eventType=conversion, an arbitrary revenue and no identity; assert the written analytics values follow the client input. Repeat to demonstrate absence of order deduplication.
- **Recommended fix:** Record conversions/revenue from authoritative paid-order transitions only, with order/product idempotency keys. Restrict public interactions to bounded impression/click signals.
- **Regression test:** Reject browser conversion/revenue input, deduplicate replayed paid orders and ensure refunds update metrics under an explicit policy.
- **Change considerations:** Possible API/configuration change; preserve existing consumers during migration.

### AUD-17 — Repository quality checks fail on the target branch

- **Severity:** Low · **Confidence:** Confirmed · **Affected phase:** Phases 5 and 8 / CI
- **Evidence:** services/ai-service/app/api/routes/rag.py:3–11; apps/web/src/components/admin/ai-copilot/agent-mode-panel.tsx:32–35; .github/workflows/checks.yml:19–21.
- **Technical explanation:** Ruff reports I001 and E501 for the RAG import block; ruff format --check reports one file. Web ESLint reports one error (setState synchronously in effect) and 31 warnings. The Python CI job executes the failing Ruff checks.
- **Potential impact:** Python CI fails and the documented web lint check fails despite passing typechecks/tests. Hook warnings elsewhere warrant review but are not all confirmed functional bugs.
- **Safe local reproduction:** Run .venv/bin/ruff check ., .venv/bin/ruff format --check . from services/ai-service and npm run lint from the root. Exit codes are 1.
- **Recommended fix:** In a separately approved remediation task, correct import formatting and the agent panel state synchronization, then rerun the exact checks. Add branch CI coverage for web lint/typechecks and agent/RAG contracts.
- **Regression test:** Existing lint commands should exit zero and render-state tests should preserve prefill behavior.
- **Change considerations:** No expected public API break.

### AUD-18 — Locked dependencies have critical/high advisory matches requiring reachability review

- **Severity:** Critical · **Confidence:** Needs verification · **Affected phase:** All phases / dependencies
- **Evidence:** apps/web/package.json:1–75; package-lock.json:1; services/review-ai-worker/package-lock.json:1; services/ai-service/uv.lock:1.
- **Technical explanation:** Advisory services reported 65 affected npm packages in the root graph (7 critical, 32 high, 14 moderate, 12 low), and 8 in the separate worker graph (2 critical, 5 high, 1 moderate). These are package rollups, not unique CVE counts and not 73 independent application exploits. pip-audit returned 5 entries in 3 packages; two pairs duplicate advisory IDs, leaving 3 unique IDs. Exact package lists are below.
- **Potential impact:** Known vulnerable code is present in the locked dependency graphs. Exploitability depends on enabled plugins, endpoints, runtime, OS and attacker-controlled inputs. No remote code execution/account takeover advisory was exploited or confirmed against this application.
- **Safe local reproduction:** Run npm audit --json in root and worker; export frozen Python requirements and run pip-audit --disable-pip --no-deps. Queries transmit package/version metadata, not source or credentials. Compare advisory ranges and enabled features before assigning application-level severity.
- **Recommended fix:** Triage active runtime paths first, then make targeted compatible upgrades under separate approval. Do not use automatic force upgrades; some suggested fixes downgrade/break packages. Review Next.js image/runtime advisories, Better Auth emailOTP and the worker transformer chain first.
- **Regression test:** Rerun advisory queries plus auth, image upload, checkout, Expo and AI integration regressions after each targeted upgrade. Test any required major migration.
- **Change considerations:** Potential major npm/Expo/Vitest changes and Python version constraints; review each remediation.

### AUD-19 — Behavioral HTTP export ignores the documented disabled flag

- **Severity:** Medium · **Confidence:** Confirmed · **Affected phase:** Phase 3 / privacy
- **Evidence:** convex/mlBehavioralHttp.ts:13–24,42–61; convex/pythonMlShadow.ts:174–190; services/ai-service/training/export_behavioral.py:23–34; docs/python-behavioral-collaborative-recommendations.md:117.
- **Technical explanation:** The documentation promises HTTP 503 unless BEHAVIORAL_EXPORT_ENABLED is true and Convex token/salt are configured. Only the Python CLI checks that boolean. The HTTP authorization function and underlying queries never inspect it; token and salt alone enable export.
- **Potential impact:** An operator retaining configured credentials cannot rely on the documented export-disable switch. Pseudonymous visitor histories remain exportable to a token holder despite the flag being false. This is an opt-out enforcement defect, not an unauthenticated bearer bypass.
- **Safe local reproduction:** The actual HTTP handler with fixture token/salt and BEHAVIORAL_EXPORT_ENABLED=false returned HTTP 200 for an empty mocked behavior page. No customer data or real credential was used.
- **Recommended fix:** Add a fail-closed server-side export enable gate before reading data, and align the CLI/docs with that authoritative control. Keep tokens/salt checks and minimized HMAC projection.
- **Regression test:** Test omitted/false/true enable flags with valid credentials and prove disabled requests never query data. Also test missing/wrong tokens and salt.
- **Change considerations:** Existing export clients must opt in explicitly on the server.
