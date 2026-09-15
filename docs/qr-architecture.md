# QR architecture

Canonical QR URLs are HTTPS paths on the storefront. The payload is only a random token — never an order number, email, phone, access token, Stripe secret, or full order body.

## Types

| Type | Who scans | Resolves to |
|------|-----------|-------------|
| `order` | Customer | Public order tracking (PII still masked unless email/phone/accessToken proof exists) |
| `product` | Customer | Existing product page |
| `package` | Admin | Staff fulfillment view + existing `adminOrders.updateOrderStatus` |
| `delivery` | Admin | Same staff order view, delivered action when allowed |
| `payment` | Customer | Web Stripe Checkout or mobile PaymentSheet |

There is no warehouse/rider role in this codebase. Staff QR actions use the existing `admin` / `superAdmin` checks.

## Token security

- 32 random bytes, base64url encoded
- SHA-256 hash stored and used for lookup (`tokenHash`)
- Raw token is stored so receipts and admin print/preview can reuse the same URL (same pattern as order `accessToken`)
- Order `accessToken` is unchanged and is never encoded in a QR

## Resolution

`api.qr.resolve` validates the token, status, expiry, and target, then returns the minimum payload for that type.

Invalid / expired / revoked tokens share customer-safe messages and do not reveal whether another customer’s order exists.

Scan attempts are rate-limited and written to `qrScans` without Stripe secrets or credentials.

## Web fallback and mobile deep links

Canonical URL:

`https://<SITE_URL>/qr/<type>/<token>`

- Web route: `apps/web/src/app/(shop)/qr/[type]/[token]/page.tsx`
- Mobile route: `apps/mobile/app/qr/[type]/[token].tsx`
- App Links / intent filter prefix: `/qr`
- Custom scheme fallback: `ecommerce://qr/<type>/<token>`

Legacy receipt links `/track-order/<orderNumber>` still work. On mobile they are rewritten to `/order/<orderNumber>?source=track` so they do not hit a missing Expo route.

## Product QR

Admin product edit → Generate QR. Scanning opens the existing product page (add to cart, wishlist, variants unchanged). Inactive products resolve as not found for customers.

## Order QR

Created automatically when an order is placed. Receipt images encode this URL. Scanning reuses the existing tracking UI.

## Package / delivery QR

Generated from the admin order page. `/admin/scan` is the staff scanner. Status changes always go through `api.adminOrders.updateOrderStatus` (packed → `processing`, shipped → `shipped`, delivered → `delivered`).

## Payment QR

- Short-lived: 30 minutes (aligned with the pending-Stripe reminder window)
- Identifies a pending Stripe order only
- Does **not** prove payment
- Mobile: `api.stripe.startPaymentFromQr` → existing PaymentSheet
- Web: same action → existing Stripe Checkout Session helper
- Reuses an open PaymentIntent / Checkout Session when safe
- Revoked when the order is paid, cancelled, or expired

## Stripe

Payment confirmation remains webhook-authoritative (`markOrderPaid`). QR payment does not change COD, inventory reservation, or existing checkout.

## Authorization

| QR | Public resolve | Staff fields / mutations |
|----|----------------|--------------------------|
| product / order / payment | Anyone with the token | No |
| package / delivery | Admin session required | Yes |

A customer order QR never grants admin permissions.

## Expiration

- Payment QR: 30 minutes, plus order eligibility (paid / cancelled / not Stripe)
- Other types: until revoked
- Expired active rows are marked `expired` on scan

## Scan history

`qrScans` stores time, source, platform, success, optional `event`, and a failure code. It does not store client secrets, access tokens, or passwords.

Payment QR lifecycle events:

| Event | When |
|-------|------|
| `resolved` | Token validated via `qr.resolve` |
| `payment_initiated` | Checkout / PaymentSheet started (`startPaymentFromQr`) — **not** paid |
| `payment_succeeded` | Stripe webhook → `markOrderPaid` (then payment QRs are revoked) |

`success: true` on `payment_initiated` only means the start action worked, not that money was captured.

## Offline

Scanning, payment, and status changes require internet. The mobile scanner shows the existing offline notice and does not mutate orders locally.

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `SITE_URL` | Convex | Canonical QR origin from `getSiteUrl()` — **must be HTTPS on `prod:` deployments** |
| `NEXT_PUBLIC_SITE_URL` / `SITE_URL` | Web | Storefront origin |
| `EXPO_PUBLIC_SITE_URL` | Mobile | App Links host; `npm run mobile:env` copies it from root `.env.local` |
| `REQUIRE_HTTPS_SITE_URL=1` | Convex | Force HTTPS rules on non-`prod:` deployments (preview/staging) |

`getSiteUrl()` throws on production if `SITE_URL` is missing, non-HTTPS, or localhost — so misconfigured deploys cannot silently emit `http://localhost` QR URLs.

## Deep links (status)

QR payloads are **HTTPS web-compatible** today:

`https://<SITE_URL>/qr/<type>/<token>`

Opening that URL in a browser resolves on the web app. Opening it in the installed native app (Universal Links / App Links) requires:

1. `EXPO_PUBLIC_SITE_URL` set to the same HTTPS origin for the mobile build
2. Hosted `/.well-known/assetlinks.json` (Android) and `/.well-known/apple-app-site-association` (iOS)
3. A native rebuild with those associated domains / intent filters
4. Real-device verification

Until those steps are done and tested, do **not** claim App Links are complete — describe QR as HTTPS web-compatible with optional app open when linking is configured.

Template files live under `apps/web/public/.well-known/` (fill in package name / SHA-256 / team ID before relying on them).
