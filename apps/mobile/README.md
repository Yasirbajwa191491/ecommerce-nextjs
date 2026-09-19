# Mobile app — Expo + React Native

Native storefront for the Yasir ecommerce monorepo. Shares the Convex backend with the Next.js web app.

**Expo SDK 54** · React Native 0.81 · React 19.1 · compatible with current Expo Go (SDK 54).

## Setup

The mobile app uses the **same production Convex** as the live website.

`apps/mobile/.env` should contain:

```
EXPO_PUBLIC_CONVEX_URL=https://hip-salamander-864.convex.cloud
EXPO_PUBLIC_SITE_URL=https://your-production-domain.com
```

`EXPO_PUBLIC_SITE_URL` must match the public HTTPS storefront (same host as Convex `SITE_URL`). It enables App Link intent filters in `app.config.ts`. Without it, QR codes still work as **HTTPS web links**; they will not auto-open the app until App Links / Universal Links are configured and a native build is installed.

Do **not** run `npm run mobile:env` for production — that copies the local/dev Convex URL from `.env.local`.

Install dependencies from the repo root:

```bash
npm install
```

## Run

```bash
npm run mobile
```

Then scan the QR code with Expo Go, or press `a` / `i` for Android / iOS simulator.

### Phone not connecting?

1. **Same Wi-Fi** — Phone and PC must be on the same network (not mobile data).
2. **Manual URL** — In Expo Go, enter: `exp://192.168.100.5:8081` (use your PC Wi-Fi IP from `ipconfig`).
3. **Windows Firewall** — Allow Node.js on private networks, or run in an elevated PowerShell:
   ```powershell
   New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081
   ```
4. **Tunnel fallback** (slower, works through firewalls):
   ```bash
   npm run mobile:tunnel
   ```

If `expo start` fails with `TypeError: fetch failed`, dev scripts use `--offline` to skip Expo’s remote version check.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run mobile` | Start Expo dev server |
| `npm run mobile:env` | Sync Convex URL to `apps/mobile/.env` |
| `npm run typecheck:mobile` | TypeScript check |
| `npm run lint --workspace @ecommerce/mobile` | ESLint via Expo |

## Architecture

- **Navigation:** Expo Router — 5 tabs (Home, Shop, AI, Orders, Cart) + stack routes
- **Backend:** Same Convex deployment as web (`EXPO_PUBLIC_CONVEX_URL`)
- **Shared code:** `@ecommerce/shared` for currency, images, cart types
- **Cart:** Client-side with AsyncStorage (matches web localStorage pattern)
- **App Lock:** Optional biometric privacy gate (`docs/app-lock.md`) — local only; not customer auth

## Deep links

- Custom scheme: `ecommerce://qr/<type>/<token>` (and existing product/order paths)
- Canonical QR: `https://<EXPO_PUBLIC_SITE_URL>/qr/<type>/<token>` — **HTTPS web-compatible**
- App Links / Universal Links: configured in `app.config.ts` when `EXPO_PUBLIC_SITE_URL` is set; requires hosted `.well-known` files + native rebuild + device verification before claiming they work
