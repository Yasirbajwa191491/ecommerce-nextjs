# Cursor fix verification — 6 October 2026

The claim that all 17 findings are completely fixed is overstated. Several original defects are repaired, and the validation improvements are real, but security, refund recovery, pagination, totals, and UI synchronization still have defects.

This review inspected the current uncommitted changes and new helpers. Existing Cursor changes were preserved. Only this verification document was added; no application source, production data, credentials, or live service state was changed. Reproductions described below used actual transpiled handlers/helpers with controlled dependencies, not deployed services.

## Independently rerun checks

| Check | Result |
|---|---|
| Backend/shared Vitest | Passed: 27 files, 126 tests |
| Mobile Vitest | Passed: 13 files, 52 tests |
| Web lint | Passed: 0 errors, 31 warnings |
| Mobile lint | Passed: 0 errors, 26 warnings |
| Web/mobile TypeScript | Passed: npm run typecheck:all, exit code 0 |
| Production web build | Passed: compilation, TypeScript, page generation, and route generation, exit code 0 |

Passing tests do not cover the remaining endpoint ownership, worker interruption, transaction reconciliation, complete hook state, and native pagination restrictions. For example, indexedScan tests use an array loader that permits repeated pagination, while the production loader calls native Convex paginate.

## Original finding verdicts

“Original defect repaired” means the specific reported defect is fixed in reviewed source; it is not a full live-integration certification.

| # | Verdict | Evidence or remaining work |
|---|---|---|
| 1 | Original suffix bypass repaired | Exact normalized equality with at least eight digits; historical normalized-phone migration remains outstanding |
| 2 | Partial | Public read removed; an attacker-created guest order still supplies a token that permits overwriting an existing customer profile |
| 3 | Partial | Global fallbacks removed and reads token-filtered; first-claim binding and cart writes still need ownership enforcement |
| 4 | Original premature deduplication repaired | Events distinguish pending/failed from processed, and completion is recorded after handling |
| 5 | Partial | Durable attempts/idempotency/cron exist, but stale processing jobs and local reconciliation can be stranded |
| 6 | Original stock shortage defect repaired | All stock lines validated before writes; original multi-product shortage reproduction no longer deducts the first product |
| 7 | Partial, with regressions | Native pagination is repeatedly called inside queries; sort/reorder behavior is lost; aggregate initialization and maintenance are incomplete |
| 8 | Original filter forwarding defect repaired | Filters reach hybrid search and are applied before page slicing |
| 9 | Partial | Initial range stays clamped, but removing the price chip reinstates the old range |
| 10 | Original semantic constraint defect repaired | Hard price/rating constraints are reapplied to fallback candidates |
| 11 | Original incompatible delivery defect repaired | Empty intersections and unavailable explicit methods throw; original helper reproduction passes |
| 12 | Partial | Snapshot drain improved; direct online acknowledgements still delete newer offline changes |
| 13 | Partial, with regression | Stale pages are rejected, but web loadingMore can remain true forever after a query change |
| 14 | Original text-search defect repaired | Letter-only search no longer matches all phones; original Alice/Bob reproduction passes |
| 15 | Authorization repaired; totals incomplete | All three admin handlers guard access; historical aggregates still need initialization |
| 16 | Core seed defects repaired; conditional gap | Internal seeds/configured credentials/internal adapter now used; existence scan still returns false on cap exhaustion |
| 17 | Partial | Environment-backed handlers replace placeholders; Apple root paths remain omitted, and credentials/device verification remain required |

## Remaining defects, ordered by impact

### R1 — P1: A guest order token still permits customer-profile takeover

[convex/orders.ts:1366](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:1366) accepts any order token whose order has the requested email. Public COD creation accepts arbitrary customer email and returns the resulting order capability ([convex/orders.ts:420](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:420), [convex/orders.ts:537](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:537)). A caller can create a pending order under the target email, then use that newly issued token to overwrite the existing target profile. The save mutation returns the existing profile capability at line 1409.

The actual current save handler was reproduced against an in-memory database: the existing profile was overwritten and its original capability returned. This does not require control of the customer's email or their existing profile token. The public read vulnerability is correctly removed.

Fix: use an independently verified customer proof or the existing profile capability for recovery. A token for an order whose email is caller-supplied is not proof of owning that email. Add a full mutation-chain test covering guest order creation followed by attempted profile overwrite.

### R2 — P1: Refund jobs become stranded after interruption

[convex/stripeRefundAttempts.ts:62](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripeRefundAttempts.ts:62) changes the attempt to processing. The cron's due query at [convex/stripeRefundAttempts.ts:145](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripeRefundAttempts.ts:145) selects only pending attempts. If the worker crashes or times out after claiming, the attempt is never selected again. Although claim checks a 60-second processing lease, the cron never retrieves expired processing attempts.

Fix: discover and reclaim expired processing leases, retain idempotency, and test interruption immediately after claim and immediately after Stripe submission.

### R3 — P1: Refund success is recorded before order reconciliation

[convex/stripe.ts:960](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripe.ts:960) marks the attempt succeeded before calling markOrderRefunded at line 963. If the second mutation fails, deferStripeRefundAttempt skips the succeeded attempt ([convex/stripeRefundAttempts.ts:99](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/stripeRefundAttempts.ts:99)); getAttempt and the cron skip it too. Partial cancellation-fee refunds are intentionally ignored by the full-charge-refund webhook, so that path cannot be relied upon for repair.

The actual defer handler reproduced status=succeeded and attempts=0 after a simulated local-order update failure.

Fix: commit local order reconciliation and attempt completion together in one mutation, or retain a separate durable reconciliation state that is retried without issuing another refund.

### R4 — P1: New pagination loops exceed native Convex restrictions

[convex/products.ts:289](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/products.ts:289) repeatedly calls native paginate to compute metadata. [convex/lib/indexedScan.ts:64](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/indexedScan.ts:64) can call its native pagination loader repeatedly to fill a page. The admin count fallback repeats the pattern at [convex/adminOrders.ts:151](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminOrders.ts:151).

Convex's own [pagination helper documentation](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md#manual-pagination) says native paginate is limited to one call per query. Catalog metadata needs a second call beyond 50 rows; selective/large result pages need another call after the first 40 scanned rows. An isolated reproduction of the actual helper requested 50 matches and observed two loader calls. No deployed Convex query was run.

Fix: make one native paginated read per endpoint, accepting smaller filtered pages, or use supported manual pagination. Add a backend integration test enforcing the production restriction.

### R5 — P2: Catalog sorting and admin reordering are ignored

[convex/products.ts:522](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/products.ts:522) loads ordinary catalog requests (productIds is undefined) in descending creation order and returns filtered pages without selecting an index for args.sort. The productIds-scoped branch still applies sorting. Price, rating, name, popularity, and default sorting therefore lose their intended ordering. Admin pagination at line 575 likewise ignores sortOrder, so drag reordering does not affect the list. Added sorting indexes are not used.

Fix: choose the appropriate index and direction before pagination, preserve the admin reorder index, and test ordering across multiple pages.

### R6 — P2: Aggregates are initialized incorrectly and miss status transitions

[convex/lib/maintainedAggregates.ts:66](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/lib/maintainedAggregates.ts:66) initializes missing aggregates from an empty object and immediately marks them ready. [convex/adminOrders.ts:139](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminOrders.ts:139) and [convex/products.ts:545](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/products.ts:545) then trust those incomplete values. A first new order makes a historical store's all-orders total equal 1. A first historical product deactivation can produce active=0 and inactive=1 despite many active products. The actual aggregate helper reproduced pending=1/all=1 from a missing aggregate.

Counts are also wrong on a clean database: [convex/orderPaymentRecovery.ts:106](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orderPaymentRecovery.ts:106) changes pending to expired without adjustment, and [convex/orders.ts:969](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/orders.ts:969) changes failed/expired back to pending without adjustment.

Fix: implement a resumable historical builder with a readiness boundary and concurrent-write handling. Maintain counts through every status transition. New activity does not recount history. No suitable backfill was found.

### R7 — P2: COD payment corrections count one sale multiple times

[convex/adminOrders.ts:522](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminOrders.ts:522) increments product sales on each transition to paid without checking salesCountedAt. Paid → pending → paid is permitted; the second paid transition adds the same order again, and reverting to pending does not subtract it.

Fix: track counted contribution explicitly and adjust it once per meaningful transition. Test repeated corrections and refunds.

### R8 — P2: Price-chip removal is undone by synchronization

[apps/web/src/components/products/ProductCatalog.tsx:223](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/components/products/ProductCatalog.tsx:223) clamps the existing slider state but does not apply changed URL values after initialization. The price chip only clears URL fields at line 682; the synchronization effect at line 267 writes the old local range back.

Executing the actual effect callbacks retained [100,200] after clearing URL min/max and wrote those parameters back.

Fix: reset local slider state when clearing the chip and handle external URL navigation without overwriting an active slider draft. Test chip removal, back/forward navigation, direct URLs, and dragging.

### R9 — P2: Wishlist acknowledgements discard a newer offline operation

[apps/mobile/hooks/useWishlist.ts:65](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/mobile/hooks/useWishlist.ts:65) awaits an online toggle then calls dequeueWishlistChange(productId). [apps/mobile/lib/offline/wishlist-queue.ts:104](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/mobile/lib/offline/wishlist-queue.ts:104) removes all queued operations for that product.

The actual queue module reproduced: start online add A, enqueue offline remove A before the add completes, then acknowledge the old add; the remove disappears. The new snapshot drain does not fix this separate direct online path.

Fix: identify and acknowledge the exact operation sent. Ensure the drain regression test waits for the original callback to start; the current test can replace the queued add before drain enters it.

### R10 — P2: Switching searches can permanently disable load-more

[apps/web/src/hooks/use-hybrid-product-search.ts:180](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/apps/web/src/hooks/use-hybrid-product-search.ts:180) starts a new generation without resetting loadingMore. An old page's finally skips resetting that flag once its generation is stale at line 259. The guard at line 232 then blocks all further pages.

The actual hook with controlled React/action dependencies reproduced A page 2 → switch B → resolve B → resolve A: products=[B1], loadingMore=true, hasMore=true, and B loadMore issues no request.

Fix: reset pagination loading state on each generation and invalidate old generations during cleanup. Test the full hook state, not only mergeSearchPage.

### R11 — Conditional P1/P2: Voice ownership remains incomplete

[convex/vapi/voiceCheckout.ts:151](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/vapi/voiceCheckout.ts:151) trusts the first arbitrary token supplied for an unbound call ID. If a caller knows an unbound/in-flight call ID, they can preclaim it before the legitimate webhook. Authorization prioritizes that claim over the webhook's legitimate token. Actual handlers reproduced the attacker receiving checkout data and the legitimate token receiving null. Correctly bound existing calls reject different tokens.

Separately, [convex/vapi/voiceCartSync.ts:16](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/vapi/voiceCartSync.ts:16) accepts only call ID and cart lines; it never validates the new browser capability. A caller knowing another call ID can modify its cart.

Fix: establish trusted ownership from authenticated server/webhook metadata and enforce it on reads, claims, and cart writes. Knowing a call ID is the explicit prerequisite for these remaining attacks; the original global anonymous fallback has been removed.

### R12 — P2: Apple paths exclude root screens

[packages/shared/src/app-links.ts:14](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/packages/shared/src/app-links.ts:14) generates only descendant patterns such as /checkout/* and /promotions/*. These omit exact /checkout and /promotions, whereas Android prefixes cover them. This follows Apple's documented [path wildcard matching](https://developer.apple.com/library/archive/documentation/General/Conceptual/AppSearch/UniversalLinks.html).

Fix: include exact roots alongside descendants and test both. Real signing identities and signed-device verification remain required.

### R13 — P2: Further growing-table reads remain unbounded

The scan still found 174 collect calls. Many are narrow, but whole-table examples remain in [convex/aboutStats.ts:9](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/aboutStats.ts:9), [convex/adminReviews.ts:40](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/adminReviews.ts:40), and [convex/recommendationQueries.ts:416](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/recommendationQueries.ts:416). Removing selected catalog/admin list collects does not make the repository compliant with its no-unbounded-reads rule.

Fix: audit growing-table reads individually and replace full-table list/aggregate loading. Do not replace all history with arbitrary capped totals.

## Additional conditional concerns and rollout requirements

- [convex/auth.ts:17](C:/xampp/htdocs/Ecommerce-website/ecommerce-nextjs/convex/auth.ts:17) scans up to 100 user pages, then returns false if the cap is exhausted. Original first-page-only detection is improved, but exhaustion must fail closed or use a role existence query.
- Vapi browser code supplies token metadata through assistantOverrides, while the webhook reads call.metadata. The installed SDK request shape confirms the different locations; actual server propagation was not tested. Public call-ID binding can mask this after the client gets the ID. Verify integration rather than claiming that metadata binding was exercised.
- Historical normalized phones, product sales, and all maintained aggregate families need a real migration/backfill plan. Do not run production mutations until that plan is reviewed. The summary's finalPrice caveat misidentifies the table: finalPrice is a product field, and current sorting does not use its index anyway.
- App Links env values, native-device QA, and live services remain outside this review. No real payments, seeds, notifications, or migrations were run.
- Existing documentation retains original failed-check tables above its appended resolution table. Make the historical/current distinction explicit and revise “each item is verified fixed” claims in light of this review.

## Recommended completion criteria

Correct R1–R4 first, then sorting, totals, sales accounting, and UI race/state behavior. Add endpoint/job/hook regressions that reproduce the scenarios above. Complete historical-data builders and a safe rollout plan; rerun checks; then perform configured live-service and signed-device QA. The current passing helper suites and lint cleanup do not establish that all 17 findings are complete.



