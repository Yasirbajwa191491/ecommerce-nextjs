# Agent guide — ecommerce-nextjs

## Stack

Next.js 16 (App Router) · Convex · shadcn/ui · Tailwind v4 · TypeScript strict

## Must follow

1. **UI:** Use `@/components/ui` (shadcn) for buttons, inputs, alerts, cards, dialogs, toasts (`sonner`).
2. **Convex:** Indexed queries, validated args, pagination for large lists — **never** unbounded `.collect()` (16MB return limit).
3. **Types:** No `any`, no TS errors; use `convex/_generated` types.
4. **Dev:** `npm run dev` · `npx convex dev` (not deploy) for local work.

## Key paths

| Area | Path |
|------|------|
| UI components | `src/components/ui/` |
| Convex schema & functions | `convex/` |
| Shop routes | `src/app/(shop)/` |
| Rules (detail) | `.cursor/rules/*.mdc` |

## Docs

- [shadcn/ui components](https://ui.shadcn.com/docs/components)
- [Convex docs](https://docs.convex.dev)
