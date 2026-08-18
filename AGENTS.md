# Agent guide — ecommerce-nextjs

## Stack

Next.js 16 (App Router) · Convex · shadcn/ui · Tailwind v4 · TypeScript strict · Expo (mobile)

## Must follow

1. **UI (web):** Use `@/components/ui` (shadcn) for buttons, inputs, alerts, cards, dialogs, toasts (`sonner`).
2. **Convex:** Indexed queries, validated args, pagination for large lists — **never** unbounded `.collect()` (16MB return limit).
3. **Types:** No `any`, no TS errors; use `convex/_generated` types via `@convex/_generated/*`.
4. **Dev:** `npm run dev` · `npx convex dev` (not deploy) for local work.

## Key paths

| Area | Path |
|------|------|
| Web app (Next.js) | `apps/web/` |
| UI components | `apps/web/src/components/ui/` |
| Shop routes | `apps/web/src/app/(shop)/` |
| Mobile app (Expo) | `apps/mobile/` |
| Shared packages | `packages/shared/` |
| Convex schema & functions | `convex/` |
| Rules (detail) | `.cursor/rules/*.mdc` |

## Monorepo

- **Web** — `apps/web` (Next.js). Root scripts (`npm run dev`, `npm run build`) target this workspace.
- **Mobile** — `apps/mobile` (Expo + Convex); `npm run mobile` from root.
- **Shared** — `packages/shared` for platform-agnostic code.
- **Backend** — single `convex/` at repo root; web and mobile use the same deployment URL.
- **Vercel** — Root Directory must be `apps/web` (see `apps/web/vercel.json`).

## Docs

- [shadcn/ui components](https://ui.shadcn.com/docs/components)
- [Convex docs](https://docs.convex.dev)
