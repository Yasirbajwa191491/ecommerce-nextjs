# Mobile: Biometric App Lock, QR Codes & Receipt Tracking

Guide for the Expo mobile app covering:

1. Optional biometric **App Lock**
2. **QR code** deep links (order / product / payment / package / delivery)
3. **Download & share receipt** (image with embedded tracking QR)
4. **Order tracking** via scanned receipt QR

Related shorter notes:

- [App Lock only](./app-lock.md)
- [Stripe PaymentSheet](./stripe-payments.md)

---

## Security model (read first)

These features use **different** authorization layers. Do not mix them up.

```text
Biometric App Lock
  → Local device privacy only
  → Unlocks the mobile UI on this phone
  → Does NOT authenticate a customer to the backend
  → Does NOT authorize an order or payment

Order / payment QR token
  → Opaque token issued by Convex
  → Validated by api.qr.resolve (and related watch APIs)
  → Determines which order/product/payment data may load

Stripe / checkout
  → Backend + Stripe authorization
  → Independent of App Lock and of QR display
```

The app never stores fingerprint or Face ID templates. The OS performs biometric verification.

---

# Part 1 — Biometric App Lock

## Purpose

Optional local privacy gate so someone who picks up an unlocked phone cannot casually open the storefront and see cart, orders, or saved customer details.

**Not** customer login. Guest checkout remains unchanged.

## Where it lives in the UI

**Settings → Privacy & Security → App Lock**

- Toggle on/off (biometric required for both enable and disable)
- When enabled: require authentication
  - Immediately
  - After 1 minute
  - After 5 minutes
  - After 15 minutes  
  Lengthening the timeout requires biometrics again; shortening does not.

## Packages

| Package | Role |
|---------|------|
| `expo-local-authentication` | OS Face ID / Touch ID / fingerprint prompt |
| `expo-secure-store` | Persist App Lock config only |

Install (Expo SDK–aligned):

```bash
npx expo install expo-local-authentication expo-secure-store
```

## Expo configuration

In `apps/mobile/app.config.ts`:

- Plugin `expo-local-authentication` with Face ID usage text
- `ios.infoPlist.NSFaceIDUsageDescription` (same meaning: unlock the app when App Lock is enabled; biometrics stay on device)

A **native development or production build** (EAS / prebuild) is required for reliable Face ID and SecureStore behavior. Expo Go is not sufficient for production verification.

## Architecture

```text
ThemeProvider
  → AppLockProvider   (single AppState listener, lock Modal, gate)
    → rest of the app (Convex, push, Stripe, cart, routes)
```

### Key files

| Path | Role |
|------|------|
| `lib/app-lock/*` | Policy, SecureStore, biometrics, lockout countdown, module gate |
| `providers/AppLockProvider.tsx` | State, AppState timeout, lock Modal |
| `components/app-lock/*` | Lock screen, bootstrap cover, privacy overlay, compare dismiss |
| `components/settings/AppLockSettingsSection.tsx` | Settings UI |
| `providers/PushNotificationProvider.tsx` | `await whenAppUnlocked()` before `router.push` |

### SecureStore

- Key: `app_lock_config_v1`
- Value (JSON): `{ enabled, timeoutId, enrolledLevelAtEnable }`
- **No** AsyncStorage fallback for App Lock
- **Not** used for cart, catalog, orders, images, or Stripe/Convex secrets

### Flows

**Enable**

```text
Capability check → biometric success → write SecureStore → enabled
```

**Disable**

```text
Biometric success → write SecureStore → disabled
```

**Unlock (cold start or after timeout)**

```text
Show lock Modal → biometric success → unlock UI
Failure / cancel → remain locked
```

**Background timeout**

```text
App → background → timer starts (from timeout setting)
Return before timeout → no prompt
Return after timeout → lock Modal → biometric
```

Timeout is based on true `background` AppState (not Control Center / Face ID `inactive` churn). Auth-in-flight and a one-shot post-unlock suppress prevent re-lock flashes.

**Lockout (too many wrong attempts)**

- OS returns `lockout` from `authenticateAsync`
- UI shows a live countdown (typical temporary window: **30 seconds**; OS does not expose exact remaining time)
- Unlock button disabled until countdown ends

### Deep links & notifications while locked

- Push navigation waits on `whenAppUnlocked()` before `router.push`
- Lock UI is a native full-screen `Modal` (above other RN modals)
- Compare sheet is dismissed when locked
- Expo Router may resolve a route underneath; content is not shown until unlock
- QR **backend** validation is unchanged and still required after unlock

### Offline

App Lock works offline. Unlock does not call Convex.

### Manual QA checklist

- Enable / disable with Face ID, Touch ID, Android fingerprint
- Device with no enrolled biometrics → cannot enable (clear message + open settings)
- Cold start with App Lock off → no “App Locked” screen
- Cold start with App Lock on → lock before protected UI
- Timeouts: immediate / 1m / 5m / 15m
- Notification tap and QR deep link while locked
- Offline unlock
- Failed / cancelled auth; lockout countdown
- Change device biometric enrollment while App Lock is on

---

# Part 2 — QR code implementation

## Purpose

Opaque QR tokens let customers open **product**, **order tracking**, **payment**, **package**, or **delivery** flows without putting order numbers alone in the code as the sole secret. The backend validates the token.

## Canonical URL shapes

Prefer HTTPS (works in browser and app):

```text
https://<EXPO_PUBLIC_SITE_URL>/qr/<type>/<token>
```

Custom scheme (app):

```text
ecommerce://qr/<type>/<token>
```

**Types** (`convex/lib/qrValidators` / `qrTokens`):

| Type | Typical use |
|------|-------------|
| `order` | Secure order tracking from receipt / email |
| `product` | Deep link to a product |
| `payment` | Pay remaining balance / Stripe sheet from QR |
| `package` | Package-related scan |
| `delivery` | Delivery-related scan |

Tokens are random base64url values (not order numbers). Backend stores a **hash**; the raw token appears only in the URL/QR.

## Mobile entry points

| Entry | Behavior |
|-------|----------|
| Camera **Scan QR** (`app/scan.tsx`) | Parses payload → `/qr/[type]/[token]` |
| App Link / Universal Link | Intent filters in `app.config.ts` when `EXPO_PUBLIC_SITE_URL` is set |
| Custom scheme | `ecommerce://…` |
| Legacy `/track-order/:orderNumber` | Rewritten via `rewriteLegacyTrackOrderPath` to `/order/[id]?…` |

### Key files

| Path | Role |
|------|------|
| `convex/lib/qrTokens.ts` | Token generate/hash, `buildQrUrl`, `parseQrPayload` |
| `apps/mobile/lib/qr-links.ts` | Re-exports parse helpers for the app |
| `apps/mobile/lib/qr-deep-links.ts` | Legacy track-order path rewrite |
| `apps/mobile/app/qr/[type]/[token].tsx` | Resolve QR via `api.qr.resolve`, show order / pay / product redirect |
| `apps/mobile/app/scan.tsx` | Camera scanner |

### Resolve flow

```text
Scan or open link
  → parse type + token
  → navigate to /qr/[type]/[token]
  → api.qr.resolve({ tokenOrUrl, source, platform })  [requires network]
  → order: live tracking UI (api.qr.watchOrderFromQr)
  → product: router.replace to /product/[id]
  → payment: optional PaymentSheet via startPaymentFromQr
```

QR resolution is **online-only**. Offline scan shows a clear offline notice.

### App Lock interaction

If App Lock is enabled, the app may open from a QR link while locked. The lock Modal stays up until biometric success; then the already-resolved route is usable. Biometric unlock never replaces `api.qr.resolve` authorization.

### Environment

```env
EXPO_PUBLIC_SITE_URL=https://your-production-domain.com
EXPO_PUBLIC_CONVEX_URL=https://….convex.cloud
```

`EXPO_PUBLIC_SITE_URL` must match the public storefront host used for App Links and for QR HTTPS URLs. Without App Links verification + a native build, HTTPS QRs still work as **web** links.

---

# Part 3 — Download & share receipt (with QR)

## Purpose

After an order is available on the order screen (with verified access), the customer can **download** or **share** a receipt image that includes a **secure tracking QR**.

## UI

On the order details / actions area:

- **Download** — saves a PNG to the photo library (`expo-media-library`)
- **Share** — system share sheet with the PNG (`expo-sharing`)

Pending Stripe orders may label actions as “Summary” instead of “Receipt”.

## Implementation flow

```text
Tap Download or Share
  → ensure online
  → Convex getOrderReceipt({ orderNumber, customerEmail, accessToken })
  → receipt includes qrUrl (secure /qr/order/<token> URL from backend)
  → render off-screen OrderReceiptImage (includes ReceiptQrCode)
  → captureRef → PNG
  → download: MediaLibrary.createAssetAsync
  → share: Sharing.shareAsync (image/png)
```

### Key files

| Path | Role |
|------|------|
| `components/orders/OrderActions.tsx` | Orchestrates fetch → capture → save/share |
| `components/orders/ReceiptActionsRow.tsx` | Download / Share buttons |
| `components/orders/OrderReceiptImage.tsx` | Receipt layout + QR block |
| `components/orders/ReceiptQrCode.tsx` | Pure RN QR rendering from matrix |
| `lib/order-receipt-qr.ts` | `buildQrMatrix` via `qrcode` core (no canvas) |
| `lib/order-receipt-image.ts` | `captureReceiptImage`, `saveReceiptImageToGallery`, `shareReceiptImage` |
| `lib/order-receipt-format.ts` | Receipt data shape + HTML helper (includes `qrUrl` text) |
| `lib/order-receipt-url.ts` | Legacy track URL helper (prefer backend `qrUrl` on receipts) |

### What is encoded in the receipt QR

Prefer the backend-provided **`receipt.qrUrl`** (secure `/qr/order/<token>`).

Caption on the image: “Scan to track your order” / “Open in app or browser”.

Legacy helper `buildReceiptTrackUrl(orderNumber)` exists for older `/track-order/…` links; new receipts should use the secure token URL from Convex.

### Permissions

- Photo library add access — configured in `app.config.ts` (`expo-media-library`) for saving receipts
- Camera — for Scan QR (separate from receipt download)

---

# Part 4 — Order tracking via receipt QR

## Customer journey

```text
Place order → open order screen → Download / Share receipt
  → receipt image contains tracking QR
Someone scans the QR (or opens the HTTPS link)
  → /qr/order/<token> (or web equivalent)
  → backend validates token
  → order tracking UI (status, items, timeline, etc.)
```

## In-app scan path

```text
Scan QR tab/screen
  → parseQrPayload
  → /qr/order/<token>
  → api.qr.resolve
  → live tracking (watchOrderFromQr) when type is order
```

## Legacy links

Older receipts/emails using `/track-order/<orderNumber>` are rewritten on scan to:

```text
/order/<orderNumber>?orderNumber=…&source=track
```

Prefer migrating to secure `/qr/order/<token>` links.

## Important boundaries

| Check | Owner |
|-------|--------|
| Who can see the receipt Download/Share buttons | Verified order access on the order screen |
| What the QR grants | Backend QR token validation |
| Whether the app UI is visible on this phone | Optional App Lock (local only) |

Scanning a receipt QR does **not** bypass App Lock on a phone that has App Lock enabled.

---

## Quick reference — env & builds

| Concern | Requirement |
|---------|-------------|
| Convex | `EXPO_PUBLIC_CONVEX_URL` |
| HTTPS QR + App Links host | `EXPO_PUBLIC_SITE_URL` |
| App Lock / Face ID | Native rebuild after plugin / Info.plist changes |
| Receipt save to photos | Media library permission at runtime |
| QR camera scan | Camera permission at runtime |

## Tests (mobile unit)

```bash
npm run test:mobile-unit -- apps/mobile/lib/app-lock/app-lock.test.ts
npm run test:qr
```

Covers App Lock policy/gate/lockout helpers, QR parse/deep-link helpers, and receipt QR matrix helpers (with mocks — no real biometric sensor required).

---

## Production readiness note

Code and unit tests for App Lock and QR helpers can pass without a device. Before calling these flows production-ready on phones:

1. EAS / native build with current `app.config.ts` plugins  
2. Real-device App Lock QA (Face ID / fingerprint / lockout countdown)  
3. Real-device: download receipt → scan QR → order tracking  
4. Confirm App Links / Universal Links if you rely on HTTPS opening the app directly  

Do not treat biometric unlock as backend identity. Do not treat a scanned QR as a substitute for Stripe authorization.
