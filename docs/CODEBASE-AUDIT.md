# Codebase audit — 6 October 2026

The monorepo has a sensible structure and substantial feature coverage, but it has confirmed security, payment, inventory, filtering, and synchronization defects. It cannot receive an “all features correctly implemented” sign-off.

This review compares the source with PROJECT-OVERVIEW.md, respecting its distinction between implemented, partial, and planned features. No application source was changed and no live orders, payments, messages, or database changes were made. Findings are based on source traces; isolated reproductions are identified below.

## Validation

| Check | Result |
|---|---|
| Backend/shared unit tests | 105 tests passed across 17 files |
| Mobile unit tests | 51 tests passed across 12 files |
| Web lint | Failed: 71 errors, 32 warnings |
| Mobile lint | Failed: 6 errors, 24 warnings |
| Web TypeScript | Failed: 9 TS2345 errors in convex/lib/siteUrl.test.ts because mocked environments omit required NODE_ENV |
| Mobile TypeScript | Failed: 2 errors; QR resolver uses missing ColorPalette.card at line 531; settings compares incompatible permission types at line 121 |
| Production web build | Passed, including compilation, Next.js TypeScript step, page generation, and route generation |

Initial type/build/mobile-lint attempts were blocked by sandbox access to existing generated Convex files. Authorized reruns distinguished those environment failures from the code failures listed above. The web type errors also stop the combined typecheck:all script before mobile runs.

The tracked tests mostly exercise backend/mobile helpers. There is no tracked web component/browser test suite or Convex endpoint integration suite covering these failures. Passing 156 unit tests does not establish end-to-end correctness.

## Feature coverage and structure

| Feature family | Assessment |
|---|---|
| Web shop, catalog, PDP, cart, policies, contact | Documented routes/components present; catalog/search has confirmed defects |
| Web admin | Documented routes present; authorization, bootstrap, search, and scaling need corrections |
| COD, Stripe Checkout, mobile PaymentSheet, cancellation | Paths present; payment recovery, refunds, inventory, and delivery validation have defects |
| Tracking, QR, receipts, reorder | Paths present; tracking verification is insecure; HTTPS App Links still contain release placeholders |
| Mobile browsing, settings, App Lock, push, notification center | Screens/providers present; helper tests pass; native-device flows were not exercised |
| Mobile offline cache/wishlist | Architecture present; wishlist changes can be lost during sync |
| AI search, visual search, recommendations, review AI, copilot | Wiring present; constraints, session isolation, authorization, and scaling need corrections; live providers were not exercised |
| Email, SMS, Vapi, optional n8n/worker | Implementation paths present; deployment credentials and live delivery were not validated |
| Features explicitly listed in the roadmap | Remain outside implemented scope |

Separation into apps/web, apps/mobile, packages/shared, and root convex is appropriate. Components, hooks, providers, and backend helpers are organized by responsibility. Both clients configure strict TypeScript. A source scan found no explicit ": any", "as any", or "<any>" outside generated code; some Convex return validators remain permissive through v.any().

Large files weaken maintainability: mobile ProductCard is approximately 1,330 lines, mobile PDP 1,061, web admin order detail 884, and web catalog 749. Split behavior/state responsibilities after correcting the defects.

## Confirmed findings

P1 means high priority for privacy, payments, or inventory. P2 means a functional, scaling, or conditional deployment issue.

1. **P1 — Phone suffix bypasses order verification.** [convex/lib/publicOrderDto.ts:134](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/publicOrderDto.ts:134) accepts either normalized phone ending with the other, with no minimum length. [convex/orderTracking.ts:175](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orderTracking.ts:175) accepts this as proof and returns complete details plus an access token. Anonymous output already displays the final four digits. A caller with an order number can read that suffix and resubmit it to obtain verified access. The actual helper accepted both four digits and one final digit in an isolated reproduction. Require a full normalized phone number and an independent capability/verified proof for sensitive operations.

2. **P1 — Arbitrary email permits customer-profile reads and writes.** [convex/orders.ts:1324](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:1324) publicly returns name, phone, address, and the full saved profile without ownership proof. [convex/orders.ts:1286](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:1286) publicly overwrites the same fields for any supplied email and can associate visitor history. Checkout mounts the write mutation; no current frontend usage of the read query was found. Remove unused public exposure and protect profile reads/writes with verified ownership or a suitable guest capability.

3. **P1 — Voice fallback leaks another customer's checkout/state.** [convex/vapi/voiceCheckout.ts:112](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/vapi/voiceCheckout.ts:112) takes no session arguments, scans global recent conversations, and returns the first checkout URL/order number. The widget mounts it. [convex/vapi/voiceStorefrontSync.ts:116](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/vapi/voiceStorefrontSync.ts:116) selects the sole globally active voice conversation, and the public query at line 335 accepts caller-controlled voiceSessionActive. Responses include cart and tool state. When Vapi is enabled, customers can receive another shopper's state. Bind access to a server-validated browser/session capability and remove global fallbacks.

4. **P1 — Failed webhook processing is discarded on retry.** [convex/stripeWebhookNode.ts:147](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripeWebhookNode.ts:147) records an event before executing payment/refund branches. [convex/orders.ts:1261](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:1261) immediately stores processedAt and treats every existing event as complete. If later processing fails, the next delivery is acknowledged and skipped although its effects remain unfinished. Separate receipt from completion and let retries resume failed work.

5. **P1 — Cancellation refunds have no durable retry.** [convex/lib/orderLifecycle.ts:41](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/orderLifecycle.ts:41) schedules the refund action. [convex/stripe.ts:940](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripe.ts:940) records Stripe failures and throws without rescheduling, while [convex/lib/stripeRefund.ts:27](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/stripeRefund.ts:27) incorrectly assumes Convex will retry. Convex scheduled actions are not automatically retried, according to [official scheduling documentation](https://docs.convex.dev/scheduling/scheduled-functions). No refund-recovery cron/worker exists; unpaid-order recovery only handles reminders/expiry. A cancelled order can remain charged after a transient failure. Persist attempts, retry/reconcile them, and use Stripe refund idempotency.

6. **P1 — Caught stock failure leaves partial deductions.** [convex/orders.ts:1051](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:1051) catches stock-commit failure and returns a refund request. [convex/lib/inventory.ts:94](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/inventory.ts:94) patches products sequentially, but clears stockReleasedAt only after the entire loop succeeds. Earlier writes survive the caught exception; refund restoration then skips them because the released flag remains set. An isolated reproduction using the actual helpers started with A stock 5 and B stock 0; A became 4, B threw, and restoration returned alreadyReleased:true, leaving A at 4. Validate every line before writing or isolate the commit in a mutation whose failure rolls back every write.

7. **P2 — Pagination still reads entire growing tables.** [convex/products.ts:280](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/products.ts:280) collects all products; public pagination at line 475 filters/slices that array. Admin products at line 514 and [convex/adminOrders.ts:188](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminOrders.ts:188) similarly collect full tables. Home best sellers collect all orders; [convex/productSearchQueries.ts:128](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/productSearchQueries.ts:128) loads every product for search. The scan found 188 collect calls overall; some are narrow, but these full-table reads directly violate AGENTS.md. Small returned pages do not bound reads/memory. Use indexed database pagination, bounded candidates, and maintained aggregates/facets. Array-offset cursors also become unstable as records change.

8. **P2 — Web filters do not affect hybrid search products.** [apps/web/src/components/products/ProductCatalog.tsx:142](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/components/products/ProductCatalog.tsx:142) sends only query, limit, and source to hybrid search. Processing at line 263 maps/sorts but does not filter; normal filtered queries are skipped. Category, brand, color, price, rating, stock, and promotion selections affect chips/facets but not results. Scenario: open /products?search=shoes, then choose filters. Filter the ranked candidate set before pagination while preserving ranking and accurate counts.

9. **P2 — Web price selection resets to global bounds.** [apps/web/src/components/products/ProductCatalog.tsx:202](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/components/products/ProductCatalog.tsx:202) expands the selected range using Math.min(selectedMin,globalMin) and Math.max(selectedMax,globalMax). The effect reruns after initialization and URL changes; line 227 then clears the price filter. With bounds 0–1000, /products?minPrice=100&maxPrice=200 initializes 100–200, expands to 0–1000, and clears the parameters after debounce. This is a deterministic source/effect trace, not a browser reproduction. Clamp inside bounds and separate initialization from synchronization.

10. **P2 — Semantic fallback drops explicit budget/rating constraints.** [convex/productSearch.ts:228](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/productSearch.ts:228) applies parsed price/rating filters, but the fallback at line 235 rebuilds semantic candidates without reapplying them. When no candidate qualifies, a budget/minimum-rating query can return products violating those constraints. Reapply hard constraints to fallback candidates.

11. **P2 — Checkout accepts incompatible delivery options.** [convex/lib/checkoutPricing.ts:59](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/checkoutPricing.ts:59) substitutes a default for an unavailable requested method. [convex/lib/deliveryPricing.ts:119](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/deliveryPricing.ts:119) returns standard even if no common delivery method exists, and checkout does not reject it. The actual pricing helper reproduced pickup-only plus express-only products returning availableDeliveryMethods:[], deliveryMethod:"standard", and a total. Reject empty intersections and explicitly unsupported selections.

12. **P2 — Wishlist draining drops newer changes.** [apps/mobile/lib/offline/wishlist-queue.ts:136](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/mobile/lib/offline/wishlist-queue.ts:136) iterates a mutable queue across awaits and overwrites it at line 152. Enqueueing a newer operation for the same product replaces the queue during sync. Reproduced with the actual module and storage mocks: enqueue add A, pause sync, enqueue remove A, finish old add; the remove disappears unsynchronized. Process a snapshot and remove only the exact operation successfully acknowledged.

13. **P2 — Load-more can mix different searches.** [apps/web/src/hooks/use-hybrid-product-search.ts:193](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/hooks/use-hybrid-product-search.ts:193) and [apps/mobile/hooks/useHybridProductSearch.ts:105](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/mobile/hooks/useHybridProductSearch.ts:105) append awaited pagination without checking the request generation. Initial requests have guards. Start page 2 of A, switch to B, finish B, then resolve A: A products/cursor enter B state. Guard pagination and its loading updates with the current query generation.

14. **P2 — Admin alphabetic search matches every phone.** [convex/adminOrders.ts:121](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminOrders.ts:121) ORs text matches with a phone predicate whose nonnumeric input becomes an empty string. Every phone contains it. The actual helper reproduced searching Alice returning both Alice and Bob. Run the phone predicate only for a nonempty normalized digit term.

15. **P2 — Admin recommendation APIs expose data publicly.** [convex/recommendationQueries.ts:81](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/recommendationQueries.ts:81), line 113, and line 148 lack requireAdmin although mounted in admin. Responses include revenue/conversion metrics and job customer identity keys. Add the guard. “Total” calculations also silently cap reads at 1,000 profiles/analytics rows and 100 pending jobs; use maintained aggregates.

16. **P2 — Administrator initialization is unsafe/incomplete.** [convex/seed.ts:207](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/seed.ts:207) and line 216 publicly expose seed/migration entrypoints without authorization/environment gating. The scheduled admin seed uses predictable credentials and invokes session-protected Better Auth listUsers at line 184 without an inherited session, preventing promotion through that path. Separately, [convex/auth.ts:20](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/auth.ts:20) checks only the first 200 users before bootstrap; a super admin outside that page can be missed and another user promoted. Protect seeds, use internal initialization/configured credentials, and query the role or paginate the existence check. No seed was run.

17. **P2 — HTTPS App Links retain release placeholders.** [apps/web/public/.well-known/apple-app-site-association:6](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/public/.well-known/apple-app-site-association:6) has a placeholder team ID and [apps/web/public/.well-known/assetlinks.json:8](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/public/.well-known/assetlinks.json:8) has a placeholder signing fingerprint. They cannot verify native HTTPS link ownership as shipped. Apple's allowlist omits some documented paths. QR/custom-scheme screens exist; this is a release configuration gap. Configure actual identities, align routes, and validate signed iOS/Android builds.

## Documentation drift and remaining scope

The overview overstates bounded/indexed pagination and inventory reservation at order creation. Current orders start uncommitted: COD deducts stock on administrator acceptance; Stripe deducts after payment. More than one shopper can therefore pay for the final unit and enter the refund path, making findings 4–6 particularly important. It also claims a shared cart key, but web uses thapaCart ([apps/web/src/context/cart_context.tsx:26](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/context/cart_context.tsx:26), [apps/web/src/reducer/cartReducer.ts:93](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/reducer/cartReducer.ts:93)) while mobile uses shared yasirCart.

Explicit roadmap items remain planned/partial: shopper accounts, shared wishlist, mobile conversational Vapi, web dark mode, web receipt/reorder/push, dedicated web Stripe resume, second locale/RTL, and native store-release QA. Their absence is separate from broken implemented features.

Live Stripe, Resend, Twilio, Expo push, Vapi, AI providers, n8n, and the local worker were not exercised. Physical-device biometrics, PaymentSheet/3DS, notification delivery, receipt capture, reconnect behavior, and signed links still require tests. Isolated helper reproductions do not replace deployed Convex transaction/device tests.

Prioritize findings 1–6 and failing validation, add endpoint access/payment-failure regressions, then fix delivery/search/queue behavior and growing-table reads. Update the overview and complete integration/device QA before sign-off.

## Resolution (code)

Each item below is a code fix verified against the current source. Configuration values and live/device checks are listed separately and were not invented or executed.

| # | Resolution | Main files | Regression coverage |
|---|------------|------------|---------------------|
| 1 | Phone proof is an exact digit match of at least 8 digits. A last-four suffix no longer verifies an order. Lookups use `by_customer_phone_normalized` and return at most 50 rows. | `convex/lib/publicOrderDto.ts`, `convex/orders.ts` | `convex/lib/publicOrderDto.test.ts` |
| 2 | Public `getCustomerProfileByEmail` removed. Profile updates require the stored profile token or an order access token for that email. The first guest write still succeeds. Checkout stores the returned token locally. | `convex/orders.ts`, `convex/lib/customerProfileAccess.ts`, web and mobile checkout storage | `convex/lib/customerProfileAccess.test.ts` |
| 3 | Voice checkout and storefront sync require a browser session token. Global “latest” and sole-active-call fallbacks are gone. The browser binds the call id before reading state. Webhook metadata copies the token onto the conversation. | `convex/vapi/voiceCheckout.ts`, `convex/vapi/voiceStorefrontSync.ts`, `convex/vapi/logging.ts`, `apps/web/src/hooks/use-vapi-storefront-sync.ts` | Token mismatch returns no conversation (query-level). No live Vapi call was placed. |
| 4 | Webhook rows start pending. Completion sets `processedAt`. Failed or pending events are eligible for replay. Handler errors return HTTP 500. Legacy rows that already have `processedAt` stay duplicates. | `convex/orders.ts`, `convex/stripeWebhookNode.ts`, `convex/lib/webhookEventClaim.ts` | `convex/lib/webhookEventClaim.test.ts` |
| 5 | Refunds are inserted in `stripeRefundAttempts` before the Stripe call, sent with an idempotency key, and deferred for a five-minute cron instead of relying on Convex to retry the action. | `convex/stripe.ts`, `convex/stripeRefundAttempts.ts`, `convex/lib/orderLifecycle.ts`, `convex/crons.ts` | `convex/lib/stripeRefundRetry.test.ts` |
| 6 | Stock commit validates every line, then writes. If a later patch throws, earlier stock writes are restored and `stockReleasedAt` stays set. Orders are still created uncommitted. | `convex/lib/inventory.ts` | `convex/lib/inventory.test.ts` |
| 7 | Catalog and admin order lists paginate with indexed scans. Search candidates are capped. Recommendation and order totals use aggregates. Best sellers read `productSalesTotals`. | `convex/products.ts`, `convex/adminOrders.ts`, `convex/productSearchQueries.ts`, `convex/lib/indexedScan.ts` | `convex/lib/indexedScan.test.ts` |
| 8 | Catalog filters are arguments to `searchHybrid` and applied before the page is sliced. | `convex/productSearch.ts`, `apps/web/src/hooks/use-hybrid-product-search.ts`, `ProductCatalog.tsx` | Filter args are part of the search request. |
| 9 | The price slider clamps inside the current bounds and no longer expands to the global min/max. | `apps/web/src/components/products/ProductCatalog.tsx` | Source trace of the effect. Browser drag was not re-run in this pass. |
| 10 | Semantic fallback candidates pass through `applyHardSearchConstraints`. | `convex/lib/search/hybridRank.ts`, `convex/productSearch.ts` | `convex/lib/search/hybridRank.test.ts` |
| 11 | Empty delivery intersections and unsupported methods throw. Checkout does not substitute `standard`. | `convex/lib/deliveryPricing.ts`, `convex/lib/checkoutPricing.ts` | `convex/lib/deliveryPricing.test.ts` |
| 12 | Wishlist drain removes only the snapshotted operation. Newer queue items survive the await. | `apps/mobile/lib/offline/wishlist-queue.ts` | `apps/mobile/lib/offline/wishlist-queue.test.ts` |
| 13 | Load-more applies `mergeSearchPage` only when the request generation is still current. | `packages/shared/src/search/pageMerge.ts`, web and mobile hybrid search hooks | `packages/shared/src/search/pageMerge.test.ts` |
| 14 | Admin text search matches a phone only when the query contains digits. | `convex/lib/adminOrderSearch.ts`, `convex/adminOrders.ts` | `convex/lib/adminOrderSearch.test.ts` |
| 15 | The three admin recommendation queries call `requireAdmin`. Totals come from `maintainedAggregates` and increment on new profiles, cache rows, jobs, and analytics events. Historical rows are not recounted until new activity writes the aggregate. | `convex/recommendationQueries.ts`, `convex/recommendationMutations.ts` | Admin guard is on the query handlers. |
| 16 | `seedAll` and `seedAdminAndSettings` are internal. Super-admin creation reads `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` (8+ characters) and uses the Better Auth adapter. Existence checks paginate past the first page. No seed was run. | `convex/seed.ts`, `convex/auth.ts` | Not executed against a deployment. |
| 17 | Placeholder well-known files were removed. Route handlers return the association documents only when `APPLE_TEAM_ID` (10-character team id) and `ANDROID_SHA256_CERT_FINGERPRINTS` are set; otherwise they return 404. Path lists come from `packages/shared/src/app-links.ts`. | `apps/web/src/app/.well-known/*/route.ts`, `apps/mobile/app.config.ts` | `packages/shared/src/app-links.test.ts` |

TypeScript errors called out in the audit (`siteUrl` env, mobile `colors.card`, settings permission narrowing) are fixed in source. Lint errors from the audit (including synchronous `setState` in effects) were cleared without disabling rules. Effect updates that the React compiler flags are scheduled with `setTimeout(0)`.

### Still required outside this change

- Set `APPLE_TEAM_ID` and `ANDROID_SHA256_CERT_FINGERPRINTS` in the web environment. Do not ship placeholders. Confirm signed iOS and Android builds open the shared HTTPS paths.
- Set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` before running `npm run seed` or `npm run seed:admin`. Those commands were not run.
- Orders created before `customerPhoneNormalized`, `finalPrice`, and `salesCountedAt` were added are invisible to the new phone index, final-price sort, and best-seller totals until a maintenance backfill writes those fields. New orders write them. That backfill was not executed.
- Recommendation aggregate totals start at zero and grow with new events. They do not include history from before this change.
- Live Stripe, Resend, Twilio, Expo push, Vapi, AI, n8n, biometrics, PaymentSheet/3DS, and signed App Links were not exercised.



