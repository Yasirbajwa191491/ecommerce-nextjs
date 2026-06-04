# Yasir Ecommerce — Next.js 16 + Convex

Rebuild of `../client` (React) with **Next.js 16** and **Convex** realtime backend.

**Project folder:** `ecommerce-nextjs` (lowercase, at repo root).

## Convex

| | |
|--|--|
| Cloud URL | https://doting-bat-377.convex.cloud |
| HTTP Actions | https://doting-bat-377.convex.site |

## Quick start

```bash
cd ecommerce-nextjs
npm install
npx convex dev          # link to doting-bat-377 (once)
npm run seed            # demo products
npm run dev             # Next.js + Convex
```

Open http://localhost:3000/home

## Realtime

`useQuery(api.products.list)` subscribes to Convex — catalog updates appear instantly in every browser.

## Routes

- `/home` — featured products
- `/products` — filter, sort, grid/list
- `/singleproduct/[id]` — product detail (`externalId`)
- `/cart` — localStorage cart (same as original)

## shadcn/ui

All shared UI lives in `src/components/ui/` (55+ components). Import from `@/components/ui` or specific files.

```tsx
import { Button, Input, Card, Alert } from "@/components/ui";
import { toast } from "sonner";
```

Add components: `npm run ui:add dialog`

## AI / editor rules

Cursor rules in `.cursor/rules/` cover shadcn usage, Convex backend, pagination (16MB limit), Next.js patterns, and TypeScript strictness. See `AGENTS.md` for a short summary.
