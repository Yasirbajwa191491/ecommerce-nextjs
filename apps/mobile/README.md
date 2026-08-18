# Mobile app (Expo)

Expo + React Native client for the shared Convex backend.

## Setup

From the **repo root**:

```bash
npm install
npm run mobile:env    # sync EXPO_PUBLIC_CONVEX_URL from root .env.local
npm run mobile        # start Expo — scan QR with Expo Go on your phone
```

If `npm install` is slow, ensure you have network access to registry.npmjs.org (Expo pulls many packages on first install).

## Structure

- `app/` — Expo Router screens
- `components/` — mobile UI
- `lib/convex.ts` — Convex client (`EXPO_PUBLIC_CONVEX_URL`)
- `providers/` — Convex provider wrapper
- `../../convex/` — shared backend (import via `@convex/_generated/api`)

## Scripts (from repo root)

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start Expo dev server |
| `npm run mobile:env` | Copy Convex URL to `apps/mobile/.env` |
| `npm run typecheck:mobile` | TypeScript check |

Web app is `apps/web`. From repo root: `npm run dev`.
