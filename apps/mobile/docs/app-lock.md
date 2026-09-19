# App Lock (biometric)

Optional **local device privacy** for the Expo mobile app. It is **not** customer login, order authorization, or payment authorization.

For the full guide (App Lock **plus** QR codes, receipt download/share, and order tracking via receipt QR), see:

**[mobile-security-qr-receipts.md](./mobile-security-qr-receipts.md)**

---

## What it is

- Settings → Privacy & Security → App Lock
- Uses the OS biometric prompt via `expo-local-authentication` (Face ID / Touch ID / fingerprint)
- Stores only a small App Lock config in `expo-secure-store` (enabled flag, timeout, enrollment level snapshot)
- Gates the app UI on cold start and after background timeouts
- Notification and QR deep links wait for unlock before navigation completes

## What it is not

- Not an account / customer authentication system
- Does not replace Convex order QR token validation
- Does not authorize Stripe payments
- Does not store fingerprint / Face ID templates (the OS never shares them with the app)
- Does not put cart, catalog, orders, or images in SecureStore

## Security boundaries

```text
Biometric unlock  →  access to the local app UI
Order QR token    →  backend validation → which order data may load
Stripe            →  backend / Stripe authorization
```

## Timeouts

- Immediately
- After 1 minute
- After 5 minutes
- After 15 minutes

Timeout is measured from when the app goes to **background**. Returning before the timeout does not re-prompt.

## Packages

- `expo-local-authentication` (SDK-aligned via `npx expo install`)
- `expo-secure-store` (already used elsewhere; App Lock uses SecureStore **only**, with no AsyncStorage fallback)

## Expo configuration

`app.config.ts` includes:

- `expo-local-authentication` config plugin with Face ID permission copy
- `ios.infoPlist.NSFaceIDUsageDescription` (production-ready, non-misleading)

A **development or production native build** is required for reliable biometric testing. Expo Go may not fully support SecureStore biometric options / Face ID usage strings.

## Offline

App Lock works offline. Unlock does not call Convex. Existing online-only features (checkout, Stripe, live tracking, etc.) are unchanged.

## Deep links & notifications

`whenAppUnlocked()` (module gate) is awaited before notification-driven `router.push`. While locked, the App Lock overlay covers the tree (including toasts) so order/customer UI is not visible. Expo Router may still resolve the route underneath; content is not shown until unlock.

## App switcher privacy

When App Lock is enabled and the app leaves the foreground, a solid privacy overlay is shown. The lock UI is a native full-screen `Modal` so it sits above other React Native modals. Open compare sheets are dismissed when the lock engages.

**Limitation:** iOS may still briefly snapshot a frame before JS paints the privacy overlay.

## Enable / disable

- Enable: capability check → biometric success → SecureStore write
- Disable: biometric success → SecureStore write
- Cancel / failure leaves the previous state unchanged
- Relaxing the lock timeout (making it longer) requires biometric success; tightening does not

## Lockout countdown

After too many failed biometric attempts, the lock screen shows a live timer (typical temporary window: 30 seconds) and disables unlock until it ends.

## Recovery

- No hardware / not enrolled: clear customer message + open device settings
- Biometrics removed while enabled: fail closed (stay locked) until biometrics work again
- SecureStore read failure: fail closed; Unlock → successful biometrics resets App Lock config (disabled) so the app is usable again

## Manual device QA (required before production)

Not automated — run on real devices:

1. iPhone Face ID — enable, disable, restart, background timeouts, notification tap, QR link, offline unlock, cancel/fail auth
2. iPhone Touch ID (if available) — same
3. Android fingerprint — same
4. Android with no enrolled biometrics — confirm enable is blocked with the enrolled message

Also verify: changing device biometric enrollment while App Lock is on, then returning to the app.
