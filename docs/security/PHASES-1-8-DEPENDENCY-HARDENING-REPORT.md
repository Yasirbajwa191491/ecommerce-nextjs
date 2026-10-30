# Phases 1–8 dependency security and hardening report

Verified 2026-10-30 (Asia/Karachi). Baseline commit: `ea16748`.
Branch: `feature/agentic-ai-tool-orchestration-multi-step-workflows-and-human-approval`.

## Result

Source-level dependency remediation is implemented and locally tested. **Not unconditional production clearance.** Root advisory package rollups decreased from **29 to 20** (one critical, four high, fifteen low remain); the review worker decreased from **five to zero**. These are affected package rollups, not unique exploitable vulnerabilities. Remaining advisories are itemized below, including a precisely reproduced Expo compatibility blocker and the supported Better Auth peer constraint.

**No application builds were executed during this task. No Convex, Vercel, Expo or production deployment was performed.** No dev servers, remote codegen, image builds/pulls, live migrations, seeds, provider authentication, emails/payments/refunds, live AI-provider inference, model downloads or production training occurred. The only local HTTP listeners were synthetic test fixtures. Third-party package installs used `--ignore-scripts`; dependency wheels/binaries are packages, not downloaded models. Build verification is explicitly deferred to the repository owner. Earlier build attempts in the preceding remediation report predate this task and are not evidence for this dependency revision.

## Inventory and changes

[Complete before/after inventory](PHASES-1-8-DEPENDENCY-INVENTORY.csv) records both npm lock graphs, their development classification and peer constraints, plus the Python lock. Requested direct ranges are below; exact transitive requested ranges/integrities remain reviewable in the baseline/current lockfile diff. No `--force`, `--legacy-peer-deps`, audit-ignore configuration, unmaintained auth fork or obsolete inference downgrade was used.

| Component | Baseline → final | Rationale |
|---|---|---|
| Web and worker inference | `@xenova/transformers 2.17.2` → `@huggingface/transformers 4.3.2` | Maintained migration removes old protobufjs/onnx-proto chain; retains model identifiers and features, with new version namespaces. |
| Sharp | Old nested `0.32.x` → direct, deduplicated `0.35.5` | Patched decoding stack; root Next and inference share the new version. |
| ONNX | Old web `1.14.x`/node `1.14.x` → web `1.31.0-dev.20260914-8d85527a0` / node `1.30.0` | Official pinned Transformers 4 dependency choices; no old protobufjs/onnx-proto remains. The web dependency is an upstream exact development build; provenance and model parity still require operator review. CPU Node path is explicitly selected. |
| Image contract | `v1` → `hf4.3.2-q8-image-v2` | Prevent numerical/tokenization/preprocessing changes being silently compared with old vectors. |
| Review/text contract | Unversioned remote worker → `hf4.3.2-q8-minilm-v2` | Requires versioned finite 384-element output; RAG and review scope namespaces change accordingly. |
| Tiptap HTML | `@tiptap/html 3.26.0` → official static renderer `3.32.1` | Avoid incompatible Happy DOM peer and DOM emulation at runtime. Related editor/core/PM packages align to 3.32.1. Happy DOM 21 remains development-only. |
| Email render | Nested `@react-email/render 2.0.6` → `2.2.0` | Tested same-major override of the umbrella package's exact old dependency; rendering and plain-text output preserved. |
| PostCSS | Expo nested `8.4.49` → `8.5.32` | Same-major override; parser/transform tests pass. Prevent known source-map disclosure/XSS advisory ranges remaining in Metro tooling. |
| PyTorch CPU | `2.10.0+cpu` → `2.15.0+cpu` | Separate base-release scan found advisories skipped by CPU-wheel scanner. New base-release audit has no known matches; 191 synthetic tests pass with the new CPU wheel. No production weights loaded. |
| Better Auth / adapter | Retained `1.6.33` / `0.12.2` | No stable supported adapter allows patched Better Auth 1.7.x; latest adapter trial also introduced a client type regression and was reverted. Backend now explicitly declares these dependencies, preventing reliance on workspace hoisting. |
| Expo | SDK 54 retained | Preserve RN 0.81.5, React 19.1, navigation, payments, notifications and device integrations. No unvalidated SDK 58 migration. |

The existing cached npm graph retained stale overridden entries. A clean resolution was investigated, then the final lock was narrowed back to the baseline-compatible graph plus the verified migration and patched parser/renderer dependency closures. Frozen installs validate the final metadata/integrities. The CSV includes every retained delta; broad unrelated refreshes and newly conflicting peers were not retained. The decoder experiment was reverted to the original integrity-verified SDK lock entry after a real parser regression. No incompatible decoder override remains.

### Direct requested ranges and installed versions

| Manifest | Dependency / classification | Before range → after range | Before installed → after installed |
|---|---|---|---|
| `package.json` | `@convex-dev/better-auth` / dependencies | `—` → `0.12.2` | 0.12.2 → 0.12.2 |
| `package.json` | `ajv` / dependencies | `^8.20.0` → `^8.20.0` | 6.15.0, 8.20.0 → 6.15.0, 8.20.0 |
| `package.json` | `better-auth` / dependencies | `—` → `~1.6.33` | 1.6.33 → 1.6.33 |
| `package.json` | `convex` / dependencies | `^1.40.0` → `^1.40.0` | 1.48.0 → 1.48.0 |
| `package.json` | `convex-helpers` / dependencies | `^0.1.118` → `^0.1.118` | 0.1.118 → 0.1.131 |
| `package.json` | `convex-test` / devDependencies | `^0.0.41` → `^0.0.41` | 0.0.41 → 0.0.41 |
| `package.json` | `npm-run-all` / devDependencies | `^4.1.5` → `^4.1.5` | 4.1.5 → 4.1.5 |
| `package.json` | `typescript` / devDependencies | `^5` → `^5` | 5.9.3 → 5.9.3 |
| `package.json` | `vitest` / devDependencies | `^4.1.12` → `^4.1.12` | 4.1.12 → 4.1.12 |
| `apps/web/package.json` | `@base-ui/react` / dependencies | `^1.5.0` → `^1.5.0` | 1.5.0 → 1.5.0 |
| `apps/web/package.json` | `@convex-dev/better-auth` / dependencies | `^0.12.2` → `0.12.2` | 0.12.2 → 0.12.2 |
| `apps/web/package.json` | `@ecommerce/shared` / dependencies | `*` → `*` | workspace/absent → workspace/absent |
| `apps/web/package.json` | `@fontsource-variable/inter` / dependencies | `^5.3.0` → `^5.3.0` | 5.3.0 → 5.3.0 |
| `apps/web/package.json` | `@huggingface/transformers` / dependencies | `—` → `4.3.2` | workspace/absent → 4.3.2 |
| `apps/web/package.json` | `@react-email/components` / dependencies | `^1.0.12` → `^1.0.12` | 1.0.12 → 1.0.12 |
| `apps/web/package.json` | `@tailwindcss/postcss` / dependencies | `^4.3.0` → `^4.3.0` | 4.3.0 → 4.3.3 |
| `apps/web/package.json` | `@tiptap/core` / dependencies | `—` → `3.32.1` | 3.32.1 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/extension-image` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/extension-link` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/extension-placeholder` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/html` / dependencies | `^3.26.0` → `—` | 3.26.0 → workspace/absent |
| `apps/web/package.json` | `@tiptap/pm` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/react` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/starter-kit` / dependencies | `^3.26.0` → `3.32.1` | 3.26.0 → 3.32.1 |
| `apps/web/package.json` | `@tiptap/static-renderer` / dependencies | `—` → `3.32.1` | workspace/absent → 3.32.1 |
| `apps/web/package.json` | `@vapi-ai/web` / dependencies | `^2.5.2` → `^2.5.2` | 2.5.2 → 2.5.2 |
| `apps/web/package.json` | `@xenova/transformers` / dependencies | `^2.17.2` → `—` | 2.17.2 → workspace/absent |
| `apps/web/package.json` | `better-auth` / dependencies | `~1.6.33` → `~1.6.33` | 1.6.33 → 1.6.33 |
| `apps/web/package.json` | `class-variance-authority` / dependencies | `^0.7.1` → `^0.7.1` | 0.7.1 → 0.7.1 |
| `apps/web/package.json` | `clsx` / dependencies | `^2.1.1` → `^2.1.1` | 2.1.1 → 2.1.1 |
| `apps/web/package.json` | `cmdk` / dependencies | `^1.1.1` → `^1.1.1` | 1.1.1 → 1.1.1 |
| `apps/web/package.json` | `convex` / dependencies | `^1.40.0` → `^1.40.0` | 1.48.0 → 1.48.0 |
| `apps/web/package.json` | `date-fns` / dependencies | `^4.4.0` → `^4.4.0` | 4.4.0 → 4.4.0 |
| `apps/web/package.json` | `embla-carousel-react` / dependencies | `^8.6.0` → `^8.6.0` | 8.6.0 → 8.6.0 |
| `apps/web/package.json` | `framer-motion` / dependencies | `^12.40.0` → `^12.40.0` | 12.40.0 → 12.40.0 |
| `apps/web/package.json` | `happy-dom` / dependencies | `^21.0.4` → `—` | 21.0.4 → 21.0.4 |
| `apps/web/package.json` | `input-otp` / dependencies | `^1.4.2` → `^1.4.2` | 1.4.2 → 1.4.2 |
| `apps/web/package.json` | `jsqr` / dependencies | `^1.4.0` → `^1.4.0` | 1.4.0 → 1.4.0 |
| `apps/web/package.json` | `libphonenumber-js` / dependencies | `^1.13.6` → `^1.13.6` | 1.13.6 → 1.13.6 |
| `apps/web/package.json` | `lucide-react` / dependencies | `^1.17.0` → `^1.17.0` | 1.17.0 → 1.17.0 |
| `apps/web/package.json` | `next` / dependencies | `^16.4.3` → `^16.4.3` | 16.4.3 → 16.4.3 |
| `apps/web/package.json` | `next-themes` / dependencies | `^0.4.6` → `^0.4.6` | 0.4.6 → 0.4.6 |
| `apps/web/package.json` | `postcss` / dependencies | `^8.5.15` → `^8.5.15` | 8.4.49, 8.5.23, 8.5.32 → 8.5.32 |
| `apps/web/package.json` | `qrcode` / dependencies | `^1.5.4` → `^1.5.4` | 1.5.4 → 1.5.4 |
| `apps/web/package.json` | `react` / dependencies | `19.2.4` → `19.2.4` | 19.1.0, 19.2.4 → 19.1.0, 19.2.4 |
| `apps/web/package.json` | `react-day-picker` / dependencies | `^10.0.1` → `^10.0.1` | 10.0.1 → 10.0.1 |
| `apps/web/package.json` | `react-dom` / dependencies | `19.2.4` → `19.2.4` | 19.1.0, 19.2.4 → 19.1.0, 19.2.4 |
| `apps/web/package.json` | `react-email` / dependencies | `^6.5.0` → `^6.5.0` | 6.5.0 → 6.5.0 |
| `apps/web/package.json` | `react-icons` / dependencies | `^5.6.0` → `^5.6.0` | 5.6.0 → 5.6.0 |
| `apps/web/package.json` | `react-phone-number-input` / dependencies | `^3.4.17` → `^3.4.17` | 3.4.17 → 3.4.17 |
| `apps/web/package.json` | `react-resizable-panels` / dependencies | `^4.11.2` → `^4.11.2` | 4.11.2 → 4.11.2 |
| `apps/web/package.json` | `recharts` / dependencies | `^3.8.0` → `^3.8.0` | 3.8.0 → 3.8.0 |
| `apps/web/package.json` | `resend` / dependencies | `^6.12.4` → `^6.12.4` | 6.12.4 → 6.12.4 |
| `apps/web/package.json` | `shadcn` / dependencies | `^4.10.0` → `^4.10.0` | 4.23.0 → 4.23.0 |
| `apps/web/package.json` | `sharp` / dependencies | `—` → `0.35.5` | 0.32.6, 0.35.5 → 0.35.5 |
| `apps/web/package.json` | `sonner` / dependencies | `^2.0.7` → `^2.0.7` | 2.0.7 → 2.0.7 |
| `apps/web/package.json` | `stripe` / dependencies | `^22.2.0` → `^22.2.0` | 22.2.0 → 22.2.0 |
| `apps/web/package.json` | `styled-components` / dependencies | `^6.4.2` → `^6.4.2` | 6.4.2 → 6.4.2 |
| `apps/web/package.json` | `tailwind-merge` / dependencies | `^3.6.0` → `^3.6.0` | 3.6.0 → 3.6.0 |
| `apps/web/package.json` | `tailwindcss` / dependencies | `^4.3.0` → `^4.3.0` | 4.3.0 → 4.3.3 |
| `apps/web/package.json` | `tw-animate-css` / dependencies | `^1.4.0` → `^1.4.0` | 1.4.0 → 1.4.0 |
| `apps/web/package.json` | `twilio` / dependencies | `^6.0.2` → `^6.0.2` | 6.0.2 → 6.0.2 |
| `apps/web/package.json` | `vaul` / dependencies | `^1.1.2` → `^1.1.2` | 1.1.2 → 1.1.2 |
| `apps/web/package.json` | `@types/node` / devDependencies | `^20` → `^20` | 20.19.41 → 20.19.41 |
| `apps/web/package.json` | `@types/qrcode` / devDependencies | `^1.5.6` → `^1.5.6` | 1.5.6 → 1.5.6 |
| `apps/web/package.json` | `@types/react` / devDependencies | `^19` → `^19` | 19.1.17, 19.2.16 → 19.1.17, 19.2.16 |
| `apps/web/package.json` | `@types/react-dom` / devDependencies | `^19` → `^19` | 19.2.3 → 19.2.3 |
| `apps/web/package.json` | `@types/react-phone-number-input` / devDependencies | `^3.0.17` → `^3.0.17` | 3.0.17 → 3.0.17 |
| `apps/web/package.json` | `@types/styled-components` / devDependencies | `^5.1.36` → `^5.1.36` | 5.1.36 → 5.1.36 |
| `apps/web/package.json` | `eslint` / devDependencies | `^9` → `^9` | 8.57.1, 9.39.4 → 8.57.1, 9.39.4 |
| `apps/web/package.json` | `eslint-config-next` / devDependencies | `^16.4.3` → `^16.4.3` | 16.4.3 → 16.4.3 |
| `apps/web/package.json` | `happy-dom` / devDependencies | `—` → `^21.0.4` | 21.0.4 → 21.0.4 |
| `apps/web/package.json` | `typescript` / devDependencies | `^5` → `^5` | 5.9.3 → 5.9.3 |
| `apps/mobile/package.json` | `@ecommerce/shared` / dependencies | `*` → `*` | workspace/absent → workspace/absent |
| `apps/mobile/package.json` | `@react-native-async-storage/async-storage` / dependencies | `2.2.0` → `2.2.0` | 2.2.0 → 2.2.0 |
| `apps/mobile/package.json` | `@react-native-community/netinfo` / dependencies | `11.4.1` → `11.4.1` | 11.4.1 → 11.4.1 |
| `apps/mobile/package.json` | `@sentry/react-native` / dependencies | `~7.2.0` → `~7.2.0` | 7.2.0 → 7.2.0 |
| `apps/mobile/package.json` | `@stripe/stripe-react-native` / dependencies | `0.50.3` → `0.50.3` | 0.50.3 → 0.50.3 |
| `apps/mobile/package.json` | `ajv` / dependencies | `^8.20.0` → `^8.20.0` | 6.15.0, 8.20.0 → 6.15.0, 8.20.0 |
| `apps/mobile/package.json` | `convex` / dependencies | `^1.40.0` → `^1.40.0` | 1.48.0 → 1.48.0 |
| `apps/mobile/package.json` | `expo` / dependencies | `^54.0.0` → `^54.0.0` | 54.0.38 → 54.0.38 |
| `apps/mobile/package.json` | `expo-camera` / dependencies | `~17.0.10` → `~17.0.10` | 17.0.10 → 17.0.10 |
| `apps/mobile/package.json` | `expo-clipboard` / dependencies | `~8.0.8` → `~8.0.8` | 8.0.8 → 8.0.8 |
| `apps/mobile/package.json` | `expo-constants` / dependencies | `~18.0.14` → `~18.0.14` | 18.0.14 → 18.0.14 |
| `apps/mobile/package.json` | `expo-device` / dependencies | `~8.0.10` → `~8.0.10` | 8.0.10 → 8.0.10 |
| `apps/mobile/package.json` | `expo-file-system` / dependencies | `~19.0.24` → `~19.0.24` | 19.0.24 → 19.0.24 |
| `apps/mobile/package.json` | `expo-haptics` / dependencies | `~15.0.8` → `~15.0.8` | 15.0.8 → 15.0.8 |
| `apps/mobile/package.json` | `expo-image` / dependencies | `~3.0.11` → `~3.0.11` | 3.0.11 → 3.0.11 |
| `apps/mobile/package.json` | `expo-image-manipulator` / dependencies | `~14.0.8` → `~14.0.8` | 14.0.8 → 14.0.8 |
| `apps/mobile/package.json` | `expo-image-picker` / dependencies | `~17.0.11` → `~17.0.11` | 17.0.11 → 17.0.11 |
| `apps/mobile/package.json` | `expo-linking` / dependencies | `~8.0.12` → `~8.0.12` | 8.0.12 → 8.0.12 |
| `apps/mobile/package.json` | `expo-local-authentication` / dependencies | `~17.0.9` → `~17.0.9` | 17.0.9 → 17.0.9 |
| `apps/mobile/package.json` | `expo-media-library` / dependencies | `~18.2.1` → `~18.2.1` | 18.2.1 → 18.2.1 |
| `apps/mobile/package.json` | `expo-notifications` / dependencies | `~0.32.17` → `~0.32.17` | 0.32.17 → 0.32.17 |
| `apps/mobile/package.json` | `expo-router` / dependencies | `~6.0.24` → `~6.0.24` | 6.0.24 → 6.0.24 |
| `apps/mobile/package.json` | `expo-secure-store` / dependencies | `~15.0.8` → `~15.0.8` | 15.0.8 → 15.0.8 |
| `apps/mobile/package.json` | `expo-sharing` / dependencies | `~14.0.8` → `~14.0.8` | 14.0.8 → 14.0.8 |
| `apps/mobile/package.json` | `expo-splash-screen` / dependencies | `~31.0.13` → `~31.0.13` | 31.0.13 → 31.0.13 |
| `apps/mobile/package.json` | `expo-status-bar` / dependencies | `~3.0.9` → `~3.0.9` | 3.0.9 → 3.0.9 |
| `apps/mobile/package.json` | `libphonenumber-js` / dependencies | `^1.13.6` → `^1.13.6` | 1.13.6 → 1.13.6 |
| `apps/mobile/package.json` | `qrcode` / dependencies | `^1.5.4` → `^1.5.4` | 1.5.4 → 1.5.4 |
| `apps/mobile/package.json` | `react` / dependencies | `19.1.0` → `19.1.0` | 19.1.0, 19.2.4 → 19.1.0, 19.2.4 |
| `apps/mobile/package.json` | `react-dom` / dependencies | `19.1.0` → `19.1.0` | 19.1.0, 19.2.4 → 19.1.0, 19.2.4 |
| `apps/mobile/package.json` | `react-native` / dependencies | `0.81.5` → `0.81.5` | 0.81.5 → 0.81.5 |
| `apps/mobile/package.json` | `react-native-safe-area-context` / dependencies | `~5.6.0` → `~5.6.0` | 5.6.2 → 5.6.2 |
| `apps/mobile/package.json` | `react-native-screens` / dependencies | `~4.16.0` → `~4.16.0` | 4.16.0 → 4.16.0 |
| `apps/mobile/package.json` | `react-native-view-shot` / dependencies | `4.0.3` → `4.0.3` | 4.0.3 → 4.0.3 |
| `apps/mobile/package.json` | `react-native-web` / dependencies | `^0.21.0` → `^0.21.0` | 0.21.2 → 0.21.2 |
| `apps/mobile/package.json` | `@babel/core` / devDependencies | `^7.25.2` → `^7.25.2` | 7.29.7 → 7.29.7 |
| `apps/mobile/package.json` | `@types/qrcode` / devDependencies | `^1.5.6` → `^1.5.6` | 1.5.6 → 1.5.6 |
| `apps/mobile/package.json` | `@types/react` / devDependencies | `~19.1.10` → `~19.1.10` | 19.1.17, 19.2.16 → 19.1.17, 19.2.16 |
| `apps/mobile/package.json` | `eslint` / devDependencies | `^8.57.0` → `^8.57.0` | 8.57.1, 9.39.4 → 8.57.1, 9.39.4 |
| `apps/mobile/package.json` | `eslint-config-expo` / devDependencies | `~10.0.0` → `~10.0.0` | 10.0.0 → 10.0.0 |
| `apps/mobile/package.json` | `typescript` / devDependencies | `^5` → `^5` | 5.9.3 → 5.9.3 |
| `services/review-ai-worker/package.json` | `@huggingface/transformers` / dependencies | `—` → `4.3.2` | workspace/absent → 4.3.2 |
| `services/review-ai-worker/package.json` | `@xenova/transformers` / dependencies | `^2.17.2` → `—` | 2.17.2 → workspace/absent |
| `services/review-ai-worker/package.json` | `express` / dependencies | `^4.21.2` → `^4.21.2` | 4.22.3 → 4.22.3 |
| `services/review-ai-worker/package.json` | `sharp` / dependencies | `—` → `0.35.5` | 0.32.6 → 0.35.5 |

## Security boundaries and compatibility

### Authentication

Registry inspection found latest stable `@convex-dev/better-auth 0.12.6` still declares `better-auth >=1.6.11 <1.7.0`; latest compatible auth patch is 1.6.33. The provider-advertised fixes require 1.7.x. Trial adapter 0.12.6 failed client typechecking (`AuthClient` inferred `useSession().data` as `never`) and was reverted rather than cast away. No supported security-patched 1.6 release was found. Keep this issue open until the adapter supports the patched auth release and all consumers can be verified.

Configured auth uses Convex adapter, email/password, emailOTP and admin. The remaining advisories target unused device authorization, OAuth proxy/state or PostgreSQL Drizzle rate-limiter paths. This reduces observed reachability, but is not proof of whole-package safety. No OAuth/device/Drizzle feature was enabled. Actual memory-adapter HTTP tests cover user/admin self/other promotion denial, unauthorized account modification, valid super-admin, email OTP/wrong OTP, required email verification, login/session validation, session revocation, generic password recovery and invalid reset tokens. Public bootstrap, guest checkout/order ownership and secure recovery regressions remain in the full suite.

### Inference and stored vectors

Web and worker use maintained Transformers 4 with CPU `dtype: q8`, explicit local-only loading and remote downloads disabled. Constructors are lazy; pipeline initialization is single-flight and failed initialization may retry. Worker IDs remain DistilBERT sentiment, all-MiniLM-L6-v2 text embedding and MobileBERT zero-shot; web IDs remain SigLIP and CLIP. Arbitrary web model overrides are rejected because changing a model requires a new declared contract. Image extraction now uses the maintained `pool` option (SigLIP pooled output, CLIP projected output), followed by explicit finite, nonzero normalization and dimension checks. This is a numerical contract change even though IDs/dimensions are retained.

New image vectors/cache keys are namespaced. Vector indexes filter by `imageEmbeddingVersion`; writes clear the other provider's old vector so a common version marker cannot relabel an incompatible older vector. Old visual cache keys cannot be reused. Review vectors carry a version and a combined product/version scope, preventing cross-product or old/new comparisons. Remote RAG version includes the worker model contract. No stored vector is relabeled or production-reindexed here.

**Real model parity is unverified.** Mock-only tests establish API, shapes, finite values, normalization, fallback/error, initialization and deadlines; they do not demonstrate numerical similarity, retrieval relevance, old artifact compatibility or production image/model execution. Until an operator provisions reviewed artifacts and safely reindexes, semantic/image results may be empty and existing configured keyword/Gemini fallback paths remain available. Existing text products use their unchanged Gemini embedding path.

SSRF controls remain: exact approved HTTPS origins, all-address public IP validation, pinned DNS connection, no redirects, streamed 5 MiB image cap, MIME/pixel limits, shared-secret authentication and bounded concurrency. A 30-second image response deadline does not release a native inference slot until underlying work settles. Worker timeout likewise retains its two slots and suppresses late writes to an already-completed response. CPU-native work is not forcibly cancelled; a permanently stuck model can exhaust local capacity and requires operator restart. Mock tests verify this distinction.

### Expo, parsers and email

SDK 54 is retained. A targeted decoder 0.5.1 override removed advisory matches but **failed a real `query-string.parse` regression**: `TypeError: decodeComponent is not a function` because SDK 54's query-string 7 uses CommonJS while the patched decoder exports ESM. The override is absent from the final manifests and original decoder 0.2.2 restored. A supported router/query-parser migration needs Expo/native/deep-link validation which cannot be established through prohibited builds; this remains a documented blocker. Do not force SDK 58 or reapply this override based only on audit counts.

Metro's image-size 1.x also remains: its public 1.x line is below the patched 2.0.3 boundary. Migrating to 2.x changes exports/processing API and needs the supported Metro/Expo path. Build-time image processing is the main observed exposure; no native-device exploit is claimed. Deepmerge 4.3.1 is still latest and has no published patch; it is reachable in Expo configuration and shadcn registry/tooling, not a demonstrated shopper request exploit. Shadcn's CSS import is retained; its CLI/registry is not run by application request code. React Email umbrella packages are deprecated but required components remain; patched renderer plus DOM-free Tiptap preserve email generation without contacting Resend.

PostCSS and React Email overrides intentionally cross parent exact/tilde dependency constraints within their existing major API. `npm ci --ignore-scripts` validates the final locks, and parser/render regression tests pass. `npm ls --all` can report those two installed dependencies as invalid against the parent's original range despite the explicit root overrides, plus transitive range/optional-package bookkeeping (including picomatch/entities); this is disclosed, not claimed a completely clean npm-ls run; that diagnostic is not a passed gate. No auth peer dependency is bypassed. Treat future parent updates as a chance to remove these overrides; do not apply them as a blanket advisory ignore.

### Python and supply chain

CPU Torch 2.10.0+cpu was skipped by installed-package pip-audit. An explicit base-release audit found PYSEC-2026-139 / CVE-2026-4538 (PT2 deserialization) and PYSEC-2025-194 / GHSA-rrmf-rvhw-rf47 / CVE-2025-3000 (torch.jit.script). Application code does not use PT2 or JIT; neural weights load through CPU `state_dict` with `weights_only=True`, checksum/path/schema controls preserved. Nevertheless the CPU package is upgraded to 2.15.0 and its base release separately audited clean. The wheel itself/platform-native code is not proven fully covered by the PyPI scanner. Other locked FastAPI/Starlette/Pydantic/scikit-learn/NumPy/SciPy/pandas packages have no matches in the accessible installed-package audit; this is not evidence that no vulnerabilities exist.

Worker Dockerfile now copies its lock and uses frozen `npm ci --omit=dev --ignore-scripts`, Node 24 patch tag and non-root user. Python base is patch-tagged 3.12.14; uv remains pinned. Native CPU ONNX binaries are shipped in its npm package, not fetched at startup. Container images were neither built nor pulled, and OS/ABI compatibility remains unverified. Tags are still mutable; operators should resolve/review exact manifest digests. Compose requires an Ollama SHA-256 digest and reviewed model directory, mounted read-only. No guessed image digest is committed.

CI retains immutable action refs/read-only permissions, runs all worker tests and no-script npm installs, and removes automatic Docker build to respect the user's no-build instruction. Python dependency installation remains frozen. No credentials were added to public environment variables or CI commands. Local-only model loading is not proof of provenance: operators must verify upstream model revision/license/checksums, provision read-only artifacts and approve any contract version change. No untrusted request supplies a model identifier or artifact path. Existing Python checksum/path restrictions remain intact.

## Verification

Final results are recorded after the final frozen installs:

| Check | Result |
|---|---|
| `npx --no-install vitest run` | 62 files, 328 passed. |
| `npm run test:mobile-unit` | 20 files, 97 passed. |
| `npm run typecheck:all` | Passed, web/Convex and mobile. |
| Web/mobile ESLint | Passed, zero errors; 32 web and 28 mobile existing warnings. |
| Node worker tests (server and Transformers contract) | Eight passed after worker frozen install. |
| Python frozen pytest | 191 passed using Torch 2.15.0+cpu; one upstream TestClient/httpx deprecation warning. |
| Ruff check / format check | Passed, 166 files formatted. |
| Root and worker frozen npm installs | Passed with lifecycle scripts disabled. |
| Python lock check | Passed. |
| Installed-package Python audit / explicit Torch 2.15 base audit | No known matches; CPU/native coverage limitation above. |
| Tracked/changed source secret scan | Passed: no credential patterns in 1,548 tracked paths; no values printed. |
| All application builds / deployment / real provider calls | Not executed; deferred to owner. |

Tests exercise the previous order/recovery/bootstrap/admin/wishlist/SSRF/worker/export/RAG quota/voice/indexing/grounding/agent cancellation/approval/forecast/attribution security boundaries. CI itself has not been observed running after push and is not claimed green remotely.

## Advisory outcomes

Removed from both final npm graphs (advisory identifiers, deduplicated; no exploitability claim):

`GHSA-2pr8-phx7-x9h3`, `GHSA-66ff-xgx4-vchm`, `GHSA-685m-2w69-288q`, `GHSA-6g55-p6wh-862q`, `GHSA-75px-5xx7-5xc7`, `GHSA-f38q-mgvj-vph7`, `GHSA-f88m-g3jw-g9cj`, `GHSA-fx83-v9x8-x52w`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-jggg-4jg4-v7c6`, `GHSA-jvwf-75h9-cwgg`, `GHSA-q6x5-8v7m-xcrf`, `GHSA-qx2v-qp2m-jg93`, `GHSA-r28c-9q8g-f849`, `GHSA-rgj7-g3m4-5g8c`, `GHSA-wcpc-wj8m-hjx6`, `GHSA-wq5f-xc86-pv6w`, `GHSA-xq3m-2v4x-88gg`.

The Torch base-release advisory IDs above are separately addressed by the CPU package migration. All remaining root rows follow. Package rollup severity may inherit a transitive match; inspect the listed dependency chain rather than counting each parent as an independent exploit.

| Remaining package | Severity | Chain / actual exposure / disposition | Advisory URLs |
|---|---|---|---|
| `@better-auth/drizzle-adapter` | low | Convex adapter → Better Auth; configured plugin surface discussed above; supported auth upgrade blocked | https://github.com/advisories/GHSA-44jh-23m7-hpcf |
| `@better-auth/kysely-adapter` | low | Convex adapter → Better Auth; configured plugin surface discussed above; supported auth upgrade blocked | https://github.com/advisories/GHSA-44jh-23m7-hpcf |
| `@expo/cli` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `@expo/config` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `@expo/metro-config` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `@expo/prebuild-config` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `@shadcn/registry` | low | Expo config / shadcn CLI registry → deepmerge; no published patch; avoid untrusted configuration/registries | Inherited transitive match |
| `better-auth` | critical | Convex adapter → Better Auth; configured plugin surface discussed above; supported auth upgrade blocked | https://github.com/advisories/GHSA-44jh-23m7-hpcf https://github.com/advisories/GHSA-965c-763c-88jm https://github.com/advisories/GHSA-q84f-53jg-9ppm https://github.com/advisories/GHSA-r4xp-prcw-77qf |
| `decode-uri-component` | high | SDK54 router → query-string7 → decoder0.2; failed patched ESM override reverted; runtime malformed-link parsing risk remains | https://github.com/advisories/GHSA-qr28-fpjm-wq7f https://github.com/advisories/GHSA-vcc3-ghjq-m6fr |
| `deepmerge` | low | Expo config / shadcn CLI registry → deepmerge; no published patch; avoid untrusted configuration/registries | https://github.com/advisories/GHSA-gcqx-w48m-w2h4 |
| `expo` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `expo-asset` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `expo-constants` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `expo-linking` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `expo-notifications` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `expo-router` | high | SDK54 router → query-string7 → decoder0.2; failed patched ESM override reverted; runtime malformed-link parsing risk remains | Inherited transitive match |
| `expo-splash-screen` | low | Expo SDK54 configuration/module chain → affected transitive tooling; no forced SDK major upgrade | Inherited transitive match |
| `image-size` | high | Expo/RN → Metro → image-size1; untrusted build asset parsing; supported 2.x migration requires validation | https://github.com/advisories/GHSA-5p2g-fcmc-qvqq https://github.com/advisories/GHSA-w3rx-r6r6-pgpr |
| `query-string` | high | SDK54 router → query-string7 → decoder0.2; failed patched ESM override reverted; runtime malformed-link parsing risk remains | Inherited transitive match |
| `shadcn` | low | Expo config / shadcn CLI registry → deepmerge; no published patch; avoid untrusted configuration/registries | Inherited transitive match |

## Operator migration and production recommendation

1. Review/merge through the owner's process; **do not deploy this work automatically**. Owner handles all web/mobile/Convex/container builds, authenticated codegen and schema/index deployment. New vector filter fields/index definitions require that deployment before new searches can serve correctly. No live migration was executed.
2. Provision approved local models at `AI_MODEL_ROOT`, using original model IDs/layout, q8 files and read-only permissions. Record immutable upstream revisions/checksums. Set Compose `AI_MODEL_DIRECTORY` and reviewed `OLLAMA_IMAGE_DIGEST`; do not use `latest`. No automatic model downloads at startup/request are enabled. Verify native CPU runtime/container ABI in the owner's builds.
3. Validate actual SigLIP/CLIP/MiniLM numerical output and search relevance in staging, then explicitly plan reindex under the new image/review/RAG namespaces. Never label existing vectors as v2. Completed old jobs do not automatically become a full reindex. Until reindex, matching old semantic vectors are intentionally excluded; normal product/review listing and fallback features remain. If model/tokenizer/dtype/artifacts change again, define a new contract version before writes.
4. Validate existing Torch neural artifact loading/ranking in staging with owner-approved artifacts before enabling serving. Synthetic tests cannot establish real model parity. No automatic production retrain/reindex occurs.
5. Keep unsupported OAuth/device/SQL auth plugins disabled, and resolve the adapter/Better Auth upgrade before claiming critical dependency clearance. Plan an Expo-supported decoder/Metro migration with owner device/deep-link/payment/notification checks. Do not ship the experimentally incompatible decoder override.
6. Historical admin credential response remains operator-only: review affected deployments, rotate/revoke if warranted through an approved operation. No passwords/sessions/history were changed here. Earlier forecast single-action extraction and >2,000-row detailed reporting limitations remain as documented in the previous report; this dependency task does not claim to remove them.
7. Review remaining advisory matches, container OS/manifests, model provenance, current CI and staging results. **Not fully production-ready or unconditional Phase 9 clearance** while critical auth and high Expo dependencies remain unresolved. Safe verified changes are committed/pushed to the existing feature branch; there is no new branch, PR, force-push, merge or deployment.

## Changed files

- `.github/workflows/checks.yml`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/src/lib/ai/image-embedding/service-timeout.test.ts`
- `apps/web/src/lib/ai/image-embedding/service.test.ts`
- `apps/web/src/lib/ai/image-embedding/service.ts`
- `apps/web/src/lib/ai/image-embedding/types.ts`
- `apps/web/src/lib/email-marketing/email-render-security.test.tsx`
- `apps/web/src/lib/email-marketing/tiptap-html.test.ts`
- `apps/web/src/lib/email-marketing/tiptap-html.ts`
- `convex/imageEmbeddingActions.ts`
- `convex/imageEmbeddingMutations.ts`
- `convex/imageEmbeddingQueries.ts`
- `convex/lib/ai/constants.ts`
- `convex/lib/ai/imageEmbeddingClient.ts`
- `convex/lib/ai/inferenceContracts.test.ts`
- `convex/lib/ai/providers/remoteWorker.ts`
- `convex/lib/authSecurityContracts.test.ts`
- `convex/lib/dependencyParserContracts.test.ts`
- `convex/lib/rag/generate.ts`
- `convex/productReviewSearch.ts`
- `convex/reviewAi.ts`
- `convex/schema.ts`
- `convex/visualProductSearch.ts`
- `docker-compose.ai.yml`
- `docs/security/PHASES-1-8-DEPENDENCY-HARDENING-REPORT.md`
- `docs/security/PHASES-1-8-DEPENDENCY-INVENTORY.csv`
- `docs/security/PHASES-1-8-REMEDIATION-REPORT.md`
- `docs/security/PHASES-1-8-REMEDIATION-TRACKER.md`
- `package-lock.json`
- `package.json`
- `services/ai-service/Dockerfile`
- `services/ai-service/pyproject.toml`
- `services/ai-service/uv.lock`
- `services/review-ai-worker/Dockerfile`
- `services/review-ai-worker/package-lock.json`
- `services/review-ai-worker/package.json`
- `services/review-ai-worker/src/moderation.js`
- `services/review-ai-worker/src/server.js`
- `services/review-ai-worker/src/server.test.js`
- `services/review-ai-worker/src/transformers.js`
- `services/review-ai-worker/src/transformers.test.js`
- `vitest.config.ts`
