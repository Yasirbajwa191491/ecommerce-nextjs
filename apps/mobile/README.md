# Mobile app — Expo + React Native

Native storefront for the Yasir ecommerce monorepo. Shares the Convex backend with the Next.js web app.

**Expo SDK 54** · React Native 0.81 · React 19.1 · compatible with current Expo Go (SDK 54).

## Setup

1. Ensure root `.env.local` has `NEXT_PUBLIC_CONVEX_URL`.
2. Sync env to mobile:

```bash
npm run mobile:env
```

3. Install dependencies (from repo root):

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

## Deep links

Scheme: `ecommerce://` — e.g. `ecommerce://product/[id]`
