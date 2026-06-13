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
npm run dev:sync-url    # sets Convex SITE_URL to http://localhost:3000
npx convex env set BETTER_AUTH_SECRET "<random-32+-char-secret>"
# Optional — OTP emails via Resend (logs OTP to console if unset)
npx convex env set RESEND_API_KEY "re_..."
npx convex env set RESEND_FROM_EMAIL "onboarding@resend.dev"
# Optional — order confirmation SMS via Twilio (toggle in Admin → Settings → SMS Order Confirmation)
npx convex env set TWILIO_ACCOUNT_SID "ACxxxxxxxx"
npx convex env set TWILIO_AUTH_TOKEN "your_auth_token"
npx convex env set TWILIO_PHONE_NUMBER "+1xxxxxxxxxx"
# Trial accounts prepend "Sent from your Twilio trial account" and allow only 1 SMS segment (~160 chars total).
# Optional on paid accounts for longer messages: npx convex env set TWILIO_SMS_MAX_CHARS "320"
# Lets admin Settings → Email From sync RESEND_FROM_EMAIL automatically
npx convex deployment token create local-dev --save-env
npm run seed            # categories, products, super admin
npm run dev             # Next.js + Convex
```

Open http://localhost:3000/home

## Deploy to Vercel

1. Import the repo in Vercel and set **Root Directory** to `ecommerce-nextjs`.
2. In the Convex dashboard, create a **production** deployment and generate a **Production deploy key**.
3. Generate a **Preview deploy key** for PR preview backends.
4. In Vercel → **Environment Variables** (required):
   - `CONVEX_DEPLOY_KEY` = **full** production key (`prod:…|eyJ…`) → **Production** only
   - `CONVEX_DEPLOY_KEY` = preview key → **Preview** only
   - **Remove** if present: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` (dev values from `.env.local` break Vercel builds)
   - Do **not** copy `SITE_URL=http://localhost:3000` from `.env.example` into Vercel
   - Optional: `SITE_URL` = `https://your-custom-domain.com` on **Production** only
5. On Convex **production**, set secrets: `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, optional `TWILIO_*` for SMS, etc.
   - Set **`SITE_URL`** = `https://your-vercel-domain.vercel.app` here too (deploy keys often cannot auto-sync env vars)
6. Deploy. The build runs `npm run build:vercel`, which:
   - Resolves `SITE_URL` (preview: `https://<branch>.vercel.app`, production: production domain)
   - Syncs `SITE_URL` to the target Convex deployment
   - Runs `npx convex deploy` + `next build`
   - Seeds admin + system settings if missing (`seed:seedAdminAndSettings`)

`vercel.json` sets the build command automatically. For a custom domain, set `SITE_URL` in Vercel Production env vars.

### Admin (Better Auth)

- Login: http://localhost:3000/admin/login
- After seed: `yasir.sohail@savari.io` / `12345678` (dev only)
- Routes: `/admin/products`, `/admin/product-categories`, `/admin/users`
- Unverified emails receive an OTP via Resend (or console fallback without `RESEND_API_KEY`)

## Realtime

`useQuery(api.products.list)` subscribes to Convex — catalog updates appear instantly in every browser.

## Routes

- `/home` — featured products
- `/products` — filter, sort, grid/list
- `/product/[id]` — product detail (Convex document `_id`; `/singleproduct/[id]` redirects here)
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

## Vapi review collection calls

Outbound AI calls to collect product reviews after delivery.

```bash
# Convex env (server-only)
npx convex env set VAPI_API_KEY "<private-api-key>"
npx convex env set VAPI_WEBHOOK_SECRET "<random-secret>"
npx convex env set VAPI_PHONE_NUMBER_ID "<phone-number-id>"
npm run vapi:setup-review
npx convex env set VAPI_REVIEW_ASSISTANT_ID "<assistant-id-from-script-output>"
```

- Admin → **Orders** → **Collect review** (delivered orders with phone)
- Admin → **Review Calls** — analytics and call history
- Admin → **Settings** — enable automatic review calls (3/5/7 days after delivery)

### International outbound calls (Pakistan, etc.)

**Free Vapi phone numbers only support domestic (US) outbound calls.** Calling `+92…` or other international numbers returns:

`Couldn't start call. Free Vapi numbers do not support international calls.`

**Fix options:**

1. **Import Twilio** (you already use Twilio for SMS): Vapi dashboard → **Phone Numbers** → add your Twilio number as BYO → assign **Product Review Collector** for outbound → copy the new **Phone Number ID** → `npx convex env set VAPI_PHONE_NUMBER_ID "<id>"`
2. **Buy a paid Vapi number** with international dialing enabled for your target countries.
3. **Dev testing only:** use a test order with a **US** customer phone (`+1…`) matching your caller ID country.

Twilio trial accounts may still only call [verified numbers](https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account).
