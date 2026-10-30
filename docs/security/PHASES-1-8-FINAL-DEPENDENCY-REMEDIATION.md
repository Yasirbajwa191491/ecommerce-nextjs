# Final dependency remediation — Better Auth, Expo and remaining dependencies

Date: 2026-10-30 (Asia/Karachi). Baseline: `c4acbac`.
Branch: `feature/agentic-ai-tool-orchestration-multi-step-workflows-and-human-approval`.

## Outcome

**Partial dependency remediation with verified source mitigations; no unconditional security or production clearance.** Root advisory package matches remain **20**: one critical, four high, fifteen low. Worker audit remains zero. These are package rollups, not 20 independent application exploits. The request's approximate count of 18 was rechecked against actual lockfiles and fresh advisory responses.

`image-size` stays at **1.2.1**: the proposed 2.0.3 override was rejected after inspecting its filename API incompatibility with a second Metro call site. Both image parsing advisory IDs remain open with source-level defenses below. Better Auth and the Expo decoder remain open because a supported compatible upgrade was not found; independent safe mitigations and their limits are below. No auth-system replacement, unsupported auth peer install, new SDK migration, downgrade, advisory suppression or auth fork was introduced.

**No application builds were executed. No Convex, Vercel, Expo or production deployment was performed.** No dev servers, remote codegen, production seeds/migrations, credential rotations, real payment/refund/email/AI-provider calls, production models, training or reindexing were run. Only local/mocked test fixtures and dependency metadata/package reads were used. The image-size package tarball was inspected as source without executing Metro. Owner build/device/staging verification is pending.

## Baseline and final package versions

| Package | Baseline → final | Status |
|---|---|---|
| Better Auth | 1.6.33 → 1.6.33 (`~1.6.33`) | Open advisories; supported configuration mitigation added. |
| Convex Better Auth adapter | 0.12.2 → 0.12.2 (exact) | Latest stable 0.12.6 still requires Better Auth `>=1.6.11 <1.7.0`. No supported 1.7 pairing. |
| Expo / React Native | 54.0.38 / 0.81.5 → unchanged | Preserve SDK54 native compatibility. |
| Expo Router | 6.0.24 → 6.0.24 | Latest public 6.x; decoder mitigation at native intent boundary. |
| query-string / decoder | 7.1.3 / 0.2.2 → unchanged | Patched decoder 0.5.1 is ESM, incompatible with the installed query-string CJS function call. Prior failed override is not reintroduced. |
| Metro | RN copy 0.83.7 / Expo-owned copy 0.83.3 → unchanged | Both exact image metadata call patterns inspected. |
| image-size | **1.2.1 → 1.2.1** | Patched 2.0.3 exports are compatible for buffers but its default function no longer supports the filename used by Metro asset loading; upgrade reverted. |
| deepmerge / shadcn registry | 4.3.1 / 0.2.1 → unchanged | Current releases; no published patched deepmerge release found. |
| Transformers / Sharp / CPU Torch | 4.3.2 / 0.35.5 / 2.15.0+cpu → unchanged | Previous migration preserved. No model/vector namespace change. |

[Complete current inventory](PHASES-1-8-DEPENDENCY-INVENTORY.csv) compares this task's baseline `c4acbac` to the final locks, including peers, development classification and review status. The prior inventory remains in Git at `c4acbac` for the earlier migration comparison. No package version, range or lockfile changes remain in this task. The exploratory override was reverted to the original integrity-verified lock; `npm ci --ignore-scripts` passed. No lifecycle build scripts ran. The pre-existing PostCSS/renderer overrides cross parent ranges; no new image-size override is retained; `npm ls` is not presented as an entirely clean peer/dependency diagnostic. No auth peer constraint was bypassed.

## Better Auth investigation and mitigation

Current registry metadata confirms adapter latest **0.12.6** requires **Better Auth >=1.6.11 <1.7.0**. Existing 0.12.2/1.6.33 remain. Provider-reported fixes require 1.7.x. No maintained supported backport was found. The previous adapter trial's client type issue is recorded in the preceding report and was not masked with a cast or forced install.

The configured instance uses Convex component adapter, email/password, emailOTP and admin plugins. It does not configure device authorization, OAuth proxy, social providers, or PostgreSQL Drizzle/Kysely adapters. Remaining package matches concern those unconfigured surfaces; that observation does not prove the full installed package safe.

`convex/betterAuth/auth.ts` now uses the supported **`disabledPaths`** option for unused social-login/linking, device and proxy entry points. The installed Better Auth request handler checks normalized paths before routing. Exact paths are `/sign-in/social`, `/link-social`, `/device/code`, `/device/token`, `/device/approve`, `/device/deny`, `/oauth-proxy-callback`. Static unused paths close explicitly; this is not a general wildcard callback blocker or a library patch. Email/password, OTP, admin routes, sessions and Convex token endpoints remain enabled. Any future social/device feature requires security review and a patched supported auth pairing before re-enabling paths.

The actual local HTTP handler returns 404 on every disabled path while password sign-up still succeeds. Full memory-adapter regressions also cover login, required verification, wrong/correct OTP, session validation/revocation, reset-token handling, role escalation denial, super-admin rights and direct admin endpoints. Existing public bootstrap/order/checkout/ownership tests remain green. No deployed user/session migration was attempted.

## Expo Router / URI boundary

Current supported SDK54 Router 6.x stops at 6.0.24 and depends on query-string 7.1.3 with decoder ^0.2.2. The prior test proved decoder 0.5.1's ESM export fails the CJS call (`decodeComponent is not a function`). No such override is committed. Upgrading Router/query-string across SDK/module contracts requires owner mobile verification; the package advisories remain open.

New `incoming-link-security.ts` validates the original OS URI **before** `+native-intent.ts` passes it to Stripe or Router:

- At most 8,192 characters overall, 64 query entries, 2,048 characters per encoded entry.
- Reject malformed percent encodings, invalid UTF-8, controls, backslashes and encoded controls/backslashes. Validation does not repeatedly decode or repair input.
- Accept relative app routes, `ecommerce:` links, and HTTPS matching the exact configured `EXPO_PUBLIC_SITE_URL` origin. Reject network-path links, credentials, other origins and unsafe schemes. Expo development schemes are allowed only under `__DEV__`.
- Preserve valid encoded separators, Unicode, capability parameters, supported auth/QR links and bounded unknown query parameters. Backend capability/ownership validation remains authoritative; URL safety is not user authorization.
- Identify exact Stripe return routes instead of matching attacker-controlled `stripe-redirect` text in a query. Successful native Stripe handling returns null so checkout stays active. Unsupported native Stripe falls through to existing routing.
- Safely rewrite only actual legacy `/track-order/:orderNumber` paths; support custom scheme two-/three-slash forms, preserve query and fragment, and fall back to `/` on invalid input without logging raw URLs/tokens.

Tests exercise initial/warm incoming links, malformed encodings, repeated percent signs, oversized values, controls, cross-origin URLs, encoded separators, valid order capability links, auth/QR paths, Stripe callback success/failure and navigation fallback.

**Scope limit:** this is the native intent boundary. It does not prove all Expo web/in-app/third-party Router decoding entry points are guarded and does not repair the vulnerable decoder package. Maintain open advisory status and verify actual Android/iOS cold/warm/app-link and payment flows with the owner's builds. HTTPS app links require the existing site origin configuration. No real payment or device test occurred.

## Metro / image-size blocker and source mitigation

Installed parent chains are React Native community CLI → Metro 0.83.7 and Expo @expo/metro → Metro 0.83.3. Their `Assets.js` has **two distinct contracts**: `getAssetSize` supplies buffers, but `getAssetData` normally passes an asset **filename**, using a buffer only for `.zip/` paths. Both copies were inspected.

Static inspection of the actual published **image-size 2.0.3 tarball** shows CommonJS `__esModule` and default/imageSize exports compatible with the buffer wrapper. However, its default function accepts bytes; filesystem support moved to the separate asynchronous `fromFile` entrypoint. Therefore a successful buffer-only test was insufficient. The attempted override was rejected and original 1.2.1 package/lock restored. A new regression tests **both actual Metro filename contracts** with real local synthetic PNG files, preventing a future buffer-only compatibility assumption. No upstream supported SDK54 patch exists: its Metro 0.83 parents still depend on 1.x. A reviewed parent asset-loader migration is required; no unvalidated Metro fork or broad SDK migration is added.

Open IDs:

- **GHSA-5p2g-fcmc-qvqq** — JXL/HEIF parser infinite-loop advisory (affected through 2.0.2).
- **GHSA-w3rx-r6r6-pgpr** — ICNS parser infinite-loop advisory (affected through 2.0.2).

`metro-image-safety.cjs` and the existing custom resolver add independent defenses:

- Configure each owning Metro copy's supported `disableTypes` API for ICNS/HEIF/JXL/JXL-stream, which are outside Metro's normal image-type list.
- `disableTypes` alone is insufficient because detection validators run before that check. The resolver reads only eight header bytes for resolved image assets and rejects ICNS/JXL/BMFF signatures before image-size parsing, including disguised `.png` files.
- Reject empty/non-file/static image assets above 64 MiB. Preserve source modules, non-image assets and the existing web navigation shim.
- Synthetic tests prove the ICNS record never dispatches to its vulnerable calculator, risky headers reject before any parser, valid PNG buffer/filename size survives, and empty/source resolution behavior is correct. No Metro module/server/build runs in tests.

**Limits:** the upstream package remains vulnerable, and direct asset-server paths or external image-size callers can bypass the resolver precheck. The source guards reduce controlled build/development exposure; they do not remove either advisory. Owner must keep untrusted assets/configuration out of build inputs, verify the hook with their builds, and adopt a supported patched Metro chain or separately reviewed filename API migration. The Node-only helper is not a native image decoder or a production shopper endpoint. No application/mobile upload feature is removed.

## Remaining advisories and reachability

| Package | Version | Severity | Chain / disposition | Exact advisory IDs |
|---|---|---|---|---|
| `@better-auth/drizzle-adapter` | 1.6.33 | low | Convex adapter → Better Auth; unused OAuth/device/SQL surfaces; compatible patched pairing unavailable; stays open | GHSA-44jh-23m7-hpcf |
| `@better-auth/kysely-adapter` | 1.6.33 | low | Convex adapter → Better Auth; unused OAuth/device/SQL surfaces; compatible patched pairing unavailable; stays open | GHSA-44jh-23m7-hpcf |
| `@expo/cli` | 54.0.28 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `@expo/config` | 12.0.14 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `@expo/metro-config` | 54.0.17 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `@expo/prebuild-config` | 54.0.9 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `@shadcn/registry` | 0.2.1 | low | Expo configuration / shadcn CLI registry → deepmerge; latest 4.3.1 unpatched; avoid untrusted configuration/registries | Inherited transitive match; see decoder/deepmerge/auth row |
| `better-auth` | 1.6.33 | critical | Convex adapter → Better Auth; unused OAuth/device/SQL surfaces; compatible patched pairing unavailable; stays open | GHSA-44jh-23m7-hpcf, GHSA-965c-763c-88jm, GHSA-q84f-53jg-9ppm, GHSA-r4xp-prcw-77qf |
| `decode-uri-component` | 0.2.2 | high | SDK54 Router → query-string → decoder; native URI guard added; package/other entry points remain open | GHSA-qr28-fpjm-wq7f, GHSA-vcc3-ghjq-m6fr |
| `deepmerge` | 4.3.1 | low | Expo configuration / shadcn CLI registry → deepmerge; latest 4.3.1 unpatched; avoid untrusted configuration/registries | GHSA-gcqx-w48m-w2h4 |
| `expo` | 54.0.38 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-asset` | 12.0.14 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-constants` | 18.0.14 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-linking` | 8.0.12 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-notifications` | 0.32.17 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-router` | 6.0.24 | high | SDK54 Router → query-string → decoder; native URI guard added; package/other entry points remain open | Inherited transitive match; see decoder/deepmerge/auth row |
| `expo-splash-screen` | 31.0.13 | low | Expo configuration/tooling dependency chain → unpatched deepmerge; inherited match; no forced SDK migration | Inherited transitive match; see decoder/deepmerge/auth row |
| `image-size` | 1.2.1 | high | RN/Expo Metro -> image-size1 filename API; 2.x drop-in reverted; resolver/header defenses do not fix package | GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr |
| `query-string` | 7.1.3 | high | SDK54 Router → query-string → decoder; native URI guard added; package/other entry points remain open | Inherited transitive match; see decoder/deepmerge/auth row |
| `shadcn` | 4.23.0 | low | Expo configuration / shadcn CLI registry → deepmerge; latest 4.3.1 unpatched; avoid untrusted configuration/registries | Inherited transitive match; see decoder/deepmerge/auth row |

Counts are not unique advisory totals and no application account takeover or DoS was exploited. CLI/config risk is distinct from shopper request code: shadcn is referenced for CSS/tooling, Expo config/CLI executes during owner development/build processes. This task does not run those tools or remove their legitimate functionality. No compatible patched deepmerge release was published in accessible registry metadata. No blanket audit ignore was added. Lockfile/toolchain range warnings remain a documented limitation, not a passed npm-ls gate.

## Verification

| Safe check | Result / exit code |
|---|---|
| `npx --no-install vitest run` | **64 files, 332 passed; exit 0**. Includes auth, actual image-size interop, orders, recovery, bootstrap, wishlist, SSRF, quotas, export gate, agent approval/cancellation, forecast publication and attribution. |
| `npm run test:mobile-unit` | **22 files, 129 passed; exit 0**. |
| `npm run typecheck:all` | Web/Convex and mobile passed; exit 0. |
| `npm run lint` / `npm run lint:mobile` | Zero errors; 32 web / 28 mobile existing warnings; exit 0. No rule disabled to pass. |
| Node worker server + Transformers tests | **8 passed; exit 0**. |
| Frozen Python pytest | **191 passed; exit 0**. Synthetic ML fixtures only. |
| Ruff / format check | Passed; 166 files formatted; exit 0. |
| `npm ci --ignore-scripts` | Passed with official locked metadata/integrities; exit 0. |
| Root npm audit | **20 matches; expected exit 1**, open critical/high rows above. |
| Worker npm audit | **Zero matches; exit 0**. |
| Installed-package Python audit | No known matches among auditable packages; exit 0. CPU Torch wheel remains scanner-limited; its unchanged 2.15 base-release assessment is in the previous report. |
| Staged tracked-source secret scan | Passed: no credential patterns in 1,555 tracked paths; no .env/private service-account files staged. Binary/hosted secrets remain outside scan scope. |
| Builds / remote codegen / deployment / live migrations | **Not executed.** |

Existing Vite native-loader and upstream FastAPI/httpx deprecation warnings remain disclosed. Unit tests and typechecks do not prove native device/Metro build or production readiness. The recent maintained inference dependencies, exact model IDs/dimensions and `hf4.3.2-q8-image-v2` / `hf4.3.2-q8-minilm-v2` namespaces remain unchanged. No reindex, retrain or model artifact operation is performed.

## Owner verification and recommendation

1. Owner handles all web/mobile/Convex/container builds and staging; none run here. Validate the guarded Metro configuration on actual Expo SDK54 Android/iOS/web builds and normal static assets. Confirm Node >=18 (existing CI uses 24). Include empty/corrupt/disguised asset behavior and 64 MiB image policy.
2. Verify Android/iOS cold/warm app links, exact configured HTTPS origin, native custom scheme, QR/order recovery capability links, expired tokens, Stripe 3DS/bank returns and Expo Go fallback. No URI/token may be logged. Native unit tests do not certify real PaymentSheet/deep-link runtime behavior.
3. Keep unused OAuth/device flows disabled. Resolve a supported patched Better Auth adapter pairing before considering critical dependency clearance; keep email/password/OTP/admin/session behavior intact. No user/session migration was done.
4. Plan the supported Expo Router/query-parser upgrade with module-format/deep-link verification; do not reintroduce decoder 0.5.1 under query-string 7. Continue restricting untrusted build-time assets/configuration/registries while tooling advisories remain.
5. Historical administrator credential response, model parity/local artifact provisioning/reindex staging and prior forecast/reporting scale limits remain owner tasks described in preceding reports. No production rotation, revocation, data migration or vector relabeling occurred.

**Production-readiness recommendation: conditional, not cleared.** Independent source mitigations are added, but critical Better Auth, high decoder-chain and image-size package advisories remain open. Owner builds, native/staging checks and supported upstream upgrades are required. Safe changes are committed/pushed to the same existing feature branch without PR creation, force-push, merge or deployment.

## Changed files

- `apps/mobile/app/+native-intent.ts`
- `apps/mobile/lib/incoming-link-security.test.ts`
- `apps/mobile/lib/incoming-link-security.ts`
- `apps/mobile/lib/native-intent-security.test.ts`
- `apps/mobile/lib/qr-deep-links.ts`
- `apps/mobile/metro-image-safety.cjs`
- `apps/mobile/metro.config.js`
- `convex/betterAuth/auth.ts`
- `convex/lib/metroImageSafety.test.ts`
- `convex/lib/unusedAuthFlows.test.ts`
- `docs/security/PHASES-1-8-DEPENDENCY-HARDENING-REPORT.md`
- `docs/security/PHASES-1-8-DEPENDENCY-INVENTORY.csv`
- `docs/security/PHASES-1-8-FINAL-DEPENDENCY-REMEDIATION.md`
- `docs/security/PHASES-1-8-REMEDIATION-TRACKER.md`
