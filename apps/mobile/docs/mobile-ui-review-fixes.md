# Mobile recording review — implementation status

Updated 13 October 2026. Changes address the five-minute Android recording and the accompanying source review.

## Implemented

- Consistent light/dark colors, larger touch targets, responsive grids, less crowded headers/cards, accessible secondary product actions, and a dedicated You/help screen.
- Home prioritizes offers/categories, removes duplicate products across shelves, and performs a real refresh with timeout/error handling.
- Image browsing no longer chooses a product color. Selected shades have readable labels; full-screen photos have zoom and navigation controls. Invalid/removed cart variants stay visible and block checkout instead of silently becoming another color.
- Add-to-cart validates stock across variants and rejects mixed currencies before changing the cart. Success messages only follow successful additions.
- Distinct rating filters, a separate sort sheet, stable skeletons, retry behavior, currency-scoped ranges and price sorting, and search constraints that preserve product type, budget and currency. No exchange-rate conversion is implied.
- Structured checkout addresses, first-error focus, inline policy reading, visible payment progress, customer-aware payment retry fingerprints, and clearer COD order/payment states.
- Compact confirmation details, distinct gift value versus price discounts, and a bounded recent-order history stored in the native secure store.
- Contextual notification enrollment, useful customer-facing failures, explicit native push capability, and no automatic first-launch permission prompt.
- Android keyboard resize and splash coordination with local theme/security hydration. The browser preview avoids native Stripe/push APIs and preserves tab layout.
- Audit downloads, extracted video frames and build/test artifacts stay under the ignored root `.artifacts/` directory.

## Verification

- 90 mobile unit tests passed across 18 files, including cart variant integrity, currency/stock guards, payment fingerprints, recent-order storage, reorder and notification identity checks.
- 22 targeted backend tests passed for search parsing, relevance/currency constraints and catalog rating filters.
- Android production JavaScript/Hermes export succeeded. This is a bundle check, not an APK install or native runtime test.
- Browser inspection confirmed Home, You, Settings, product detail, photo zoom and checkout render at phone size, including 320px checkout and a 768px dark tablet layout. Fixed blank web tabs and an unsupported notification API call found during that inspection. No order or payment was submitted.
- Full mobile lint passed with zero errors and 27 warnings. The final Shop fallback change also passed its scoped lint check.
- Rechecked Shop at 390px after stabilizing the optional metadata subscription: products rendered without horizontal overflow or browser console errors.
- Full TypeScript checking still reports the pre-existing missing `readTableCounts` export imported by `convex/vapi/admin.ts:7`. No fake aggregate reader/zero totals were introduced to hide that backend defect.

## Before release

1. Resolve the existing Vapi analytics compile blocker with real maintained aggregates/backfill or an explicitly scoped analytics contract.
2. Validate the Convex changes on a development deployment before releasing the mobile client. The connected backend currently fails the new currency-range query. Shop gracefully keeps browsing available and disables currency/price selection when that optional metadata is unavailable; the new currency-filter/search behavior still requires the matching backend. Backend/schema changes have not been deployed here.
3. Review the dry-run results from `migrations/backfillProductFinalPrice:backfillProductFinalPrice`, paging through all batches. Legacy currency/final-price fields must be normalized before relying on the new currency/price indexes. The migration was prepared but not run.
4. Supply the matching Android `google-services.json` and configure FCM credentials in EAS before claiming remote push works. The capability flag keeps unavailable builds usable without repeatedly prompting shoppers. Validate iOS push credentials separately.
5. Build a new preview APK and test on the Android phone: cold launch, system back, keyboard focus, gallery pinch/drag, offline/reconnect, unavailable variants, mixed currencies, COD, Stripe test payment/cancel/retry, app lock, notifications and order links. No live order/payment was submitted during browser inspection.

Product photos have no explicit variant mapping in the current data model. The app therefore keeps photos and color selection independent. Exact photo-to-color association requires catalog metadata; it cannot be inferred safely from array order.

For lightweight local work use `npm.cmd run mobile -- --max-workers 2` with the phone, or append `--web` for browser layout checks. Native keyboard, biometrics, Stripe PaymentSheet, push and Android system behavior still need the rebuilt APK on a real device.
