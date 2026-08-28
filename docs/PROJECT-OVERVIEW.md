# Ecommerce Platform — Project Overview

This document is the **current source of truth** for the Ecommerce monorepo. It describes what is implemented in code today (web storefront, web admin, Expo mobile app, Convex backend, and supporting services). Planned work is isolated in [Roadmap](#17-roadmap--remaining-work).

**Status labels used below**

| Label | Meaning |
|-------|---------|
| **Implemented** | Shipped in code and wired to UI or backend |
| **Partial** | Present but limited, env-gated, or not at feature parity across platforms |
| **Not implemented** | Not in the product today |

---

## Table of contents

1. [Platform overview](#1-platform-overview)
2. [Monorepo structure](#2-monorepo-structure)
3. [Architecture and data flow](#3-architecture-and-data-flow)
4. [Technology stack](#4-technology-stack)
5. [Web storefront](#5-web-storefront)
6. [Web admin](#6-web-admin)
7. [AI features](#7-ai-features)
8. [Mobile app](#8-mobile-app)
9. [Mobile offline architecture](#9-mobile-offline-architecture)
10. [Cross-platform / iOS / Android](#10-cross-platform--ios--android)
11. [Checkout and payments](#11-checkout-and-payments)
12. [Backend / Convex](#12-backend--convex)
13. [Security and reliability](#13-security-and-reliability)
14. [Performance and UX](#14-performance-and-ux)
15. [Accessibility](#15-accessibility)
16. [Feature matrix](#16-feature-matrix)
17. [Roadmap / remaining work](#17-roadmap--remaining-work)

Setup and environment variables: [README.md](../README.md). Mobile UX conventions: [apps/mobile/docs/mobile-ux.md](../apps/mobile/docs/mobile-ux.md).

---

## 1. Platform overview

The repository `ecommerce-nextjs/` is an **npm workspaces monorepo**. One Convex deployment is the shared backend for:

- **Web storefront** — guest shopping on Next.js (`apps/web`)
- **Web admin dashboard** — authenticated operators on Next.js (`apps/web` `/admin`)
- **Mobile storefront** — Expo / React Native (`apps/mobile`)
- **Shared helpers** — currency, images, cart line types (`packages/shared`)
- **Optional AI worker** — local review-AI HTTP service (`services/review-ai-worker`)

```text
ecommerce-nextjs/
├── apps/
│   ├── web/                 # Next.js 16 — storefront + admin
│   └── mobile/              # Expo SDK 54 — customer app
├── packages/
│   └── shared/              # Platform-agnostic helpers
├── convex/                  # Schema, queries, mutations, actions, HTTP
├── services/
│   └── review-ai-worker/    # Optional local Transformers/Ollama worker
├── docs/                    # Architecture and product docs
└── package.json             # Workspace scripts
```

### How web and mobile relate

| Concern | Shared | Separate |
|---------|--------|----------|
| Catalog, orders, payments, search, reviews, promotions, settings | Convex API | UI implementations |
| Cart persistence | Same key (`yasirCart`) and line shape | Web: `localStorage` · Mobile: AsyncStorage |
| Wishlist | Convex wishlist exists | Web uses **browser localStorage only**; mobile uses **Convex + offline queue** — lists are **not synced** across platforms |
| Auth | Better Auth on Convex | **Admin only**. Storefront is guest checkout on web and mobile |
| Voice assistant (Vapi) | Convex tools + webhooks | **Web widget only** (env-gated). Mobile has no Vapi SDK |
| Visual search | Convex action + vector indexes | Image embeddings are computed by the **Next.js** `/api/ai/embed-image` route (SigLIP/CLIP). Convex must reach `SITE_URL` |

**Dev note:** `http://localhost:3000` is the Next.js site. `http://localhost:8081` is Expo (including Expo web). They are not the same app.

---

## 2. Monorepo structure

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js App Router: customer shop `(shop)/` and admin `(admin)/`. Vercel root directory. |
| `apps/mobile` | Expo Router storefront. Same Convex URL via `EXPO_PUBLIC_CONVEX_URL`. |
| `packages/shared` | `APP_NAME` / brand, `formatCurrencyAmount`, product image helpers, `CART_STORAGE_KEY` / `CheckoutCartLine`. |
| `convex` | Single backend: schema, public storefront functions, admin functions, Stripe/Vapi/n8n HTTP, AI actions. |
| `services/review-ai-worker` | Optional Node worker (`@xenova/transformers`, optional Ollama). Selected when `AI_PROVIDER=remote` and `AI_WORKER_URL` is set. |
| `docs` | This overview plus focused architecture notes (visual search, recommendations, review AI, AI QA). |
| `n8n/workflows` | Optional automation. Core catalog, checkout, and search work without n8n. |

### Workspace commands (root `package.json`)

| Command | What it runs |
|---------|----------------|
| `npm run dev` | Next.js (`apps/web`) + `convex dev` in parallel |
| `npm run dev:web` | Next.js only |
| `npm run dev:backend` | `convex dev` |
| `npm run mobile` | Expo (`scripts/mobile-start.mjs`) |
| `npm run mobile:env` | Copy `NEXT_PUBLIC_CONVEX_URL` from root `.env.local` → `apps/mobile/.env` |
| `npm run mobile:tunnel` | Expo with tunnel |
| `npm run seed` | `convex run seed:seedAll` |
| `npm run seed:admin` | Seed admin + system settings |
| `npm run build` / `npm run build:vercel` | Web production build (Vercel also deploys Convex) |
| `npm run typecheck` / `typecheck:mobile` / `typecheck:all` | TypeScript |
| `npm run ui:add` | shadcn add in `apps/web` |
| `npm run vapi:setup` / `vapi:setup-review` / `vapi:setup:prod` | Vapi assistant scripts |
| `npm run dev:ai-worker` | Local review-AI worker |

---

## 3. Architecture and data flow

```text
Next.js storefront ──┐
Next.js admin ───────┼── Convex (queries / mutations / actions)
Expo mobile ─────────┘         │
                               ├── Convex database + file storage + vector indexes
                               ├── Stripe (Checkout Sessions + webhooks)
                               ├── Resend (OTP, order email, campaigns)
                               ├── Twilio (optional order SMS)
                               ├── Vapi (web voice/chat + outbound review calls)
                               ├── LLM providers (Gemini / Groq / OpenRouter / OpenAI / Anthropic)
                               ├── Next.js /api/ai/embed-image (SigLIP / CLIP)
                               └── Optional: n8n workers, review-ai-worker
```

### Checkout (both clients)

```text
Client cart (local storage)
        ↓
Convex validateCartForCheckout / priceCheckoutCart
        ↓  live products, discounts, promotions, delivery, stock
COD → createCashOrder          Stripe → createCheckoutSession
        ↓                                    ↓
Order + line snapshots              Pending order + Stripe hosted page
        ↓                                    ↓
Email / optional SMS                Webhook → paid / failed / cancelled
```

Cached catalog prices on mobile are **not** used as checkout prices. Checkout always re-prices on the server while online.

### Hybrid product search

```text
Query text
  → parse intent (category, price, attributes)
  → keyword rank + vector search (product text embeddings, 384-d)
  → hybrid merge
  → catalog filters (web URL / mobile sheet)
```

### Visual search

```text
Image upload → Convex storage
  → visualProductSearch.searchByImage
  → Next.js /api/ai/embed-image (SigLIP, CLIP fallback)
  → vector search on product image embeddings
  → optional text query + catalog filters
  → last resort: Gemini Vision attributes → hybrid text search
```

---

## 4. Technology stack

Versions are from current workspace `package.json` files.

### Web (`apps/web`)

| Technology | Version (approx.) | Role |
|------------|-------------------|------|
| Next.js | 16.2.7 | App Router, SSR, API routes |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Strict |
| Tailwind CSS | 4.3 | Styling |
| shadcn/ui + Base UI | — | Accessible primitives |
| Convex | 1.40 | Client |
| Better Auth + `@convex-dev/better-auth` | 1.6.9 / 0.12 | Admin auth |
| Stripe | 22.x | Checkout Sessions |
| Resend + React Email | — | Email |
| Twilio | — | Optional SMS |
| Vapi web SDK | 2.5.2 | Storefront voice/chat widget |
| Recharts | 3.x | Admin charts |
| TipTap | 3.x | Email template editor |
| next-themes | 0.4 | Theme provider (storefront is **light-only** today) |
| `@xenova/transformers` | 2.17 | In-process SigLIP/CLIP for `/api/ai/embed-image` |

### Mobile (`apps/mobile`)

| Technology | Version (approx.) | Role |
|------------|-------------------|------|
| Expo | SDK 54 | Toolchain, EAS |
| React Native | 0.81.5 | Native UI |
| React | 19.1.0 | UI |
| Expo Router | 6.x | File-based navigation |
| Convex | 1.40 | Same backend |
| NetInfo | 11.4 | Authoritative network state |
| AsyncStorage | 2.2 | Cart, cache, prefs |
| expo-image / image-picker / manipulator | — | Images and visual search |
| expo-web-browser | — | Stripe Checkout |
| expo-secure-store | — | Contact draft |
| expo-clipboard / haptics | — | Copy order number, feedback |

### Backend and services

| Technology | Role |
|------------|------|
| Convex | Database, reactive queries, actions, cron/scheduler, file storage, vector search, HTTP actions |
| Better Auth (Convex component) | Admin sessions, email OTP |
| Stripe | Hosted checkout, webhooks |
| Gemini / Groq / OpenRouter / OpenAI / Anthropic | Configurable LLM chain |
| Vapi | Storefront assistant webhooks; outbound review calls |
| review-ai-worker | Optional local sentiment/embeddings/LLM |

Hosting: **Vercel** for `apps/web` (see `apps/web/vercel.json`). Mobile: **EAS** profiles in `apps/mobile/eas.json` (dev client, preview APK, production env). Convex URL is per-environment (`NEXT_PUBLIC_CONVEX_URL` / `EXPO_PUBLIC_CONVEX_URL`).

---

## 5. Web storefront

**Implemented.** Guest shopping; no customer login. Shell: header, footer, cart/filter providers, product compare sheet, optional Vapi widget (`apps/web/src/app/(shop)/`).

`/` redirects to `/home`. Theme is **forced light** (`app/layout.tsx`, `ShadcnProviders` `enableSystem={false}`). There is no storefront dark-mode toggle.

### Routes

| Route | What customers can do |
|-------|------------------------|
| `/home` | Hero, category tiles, best sellers, new arrivals, promotions, recommendation bands, AI shopping CTA, testimonials |
| `/products` | Catalog with filters (category, price, brand, color family, promotions, rating, stock), sort, grid/list, URL-synced filters. **Infinite scroll** (12 per page). `?search=` uses **hybrid search** |
| `/products/visual-search` | Upload/capture image, optional text, visually similar products, load-more |
| `/product/[id]` | Gallery, price/discount, stock, shipping, color/qty, add to cart, tabs (description/specs/warranty/shipping), **read** reviews, similar products, recommendation bands. Records recently viewed (localStorage). `/singleproduct/[id]` redirects here |
| `/cart` | Quantities, remove, promotion gifts/discounts, server-priced summary, checkout |
| `/checkout` | Customer details, delivery method, **COD** or **Stripe**, terms/privacy. Empty cart redirects to cart |
| `/checkout/success` · `/checkout/cancel` | Confirmation or cancelled Stripe session |
| `/wishlist` | Guest list in **localStorage**. Not linked from header/footer nav |
| `/promotions` | Active deals |
| `/ai-shopping` | Explains AI search / visual / voice; opens Vapi when configured |
| `/track-order` · `/track-order/[orderNumber]` | Track by **order number** (optional email for full PII) or **email/phone**. Delivered orders: write reviews with images |
| `/contact` | Store info + inquiry form |
| `/about` | Story, FAQ accordion |
| `/privacy` · `/terms` · `/shipping` · `/return` | Policy pages from settings/legal content |
| `/unsubscribe/[token]` | Marketing unsubscribe |

Header search: debounced hybrid typeahead, recent searches, suggestions, camera link to visual search.

### Other storefront behavior

| Feature | Status | Notes |
|---------|--------|--------|
| Recommendations | Implemented | Home, PDP, cart, checkout sections |
| Best sellers / new arrivals | Implemented | Home + catalog sort (`popular`, `newest`) |
| Quick view | Implemented | Dialog from product cards |
| Compare | Implemented | Up to 4 products; **sheet only**, no `/compare` route |
| Newsletter | Implemented | Footer → Convex `subscribers.subscribe` |
| Reviews on PDP | Implemented (read) | Filters, load-more, helpful votes, semantic search, AI summary when available. **Write** after delivery via track-order |
| Vapi widget | Partial | Renders only if `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and assistant ID are set |
| Recently viewed on web home | Not mounted | Component exists; PDP still writes localStorage |
| Customer accounts | Not implemented | Guest checkout only |
| PayPal / Apple Pay | Not implemented | Footer badges are decorative. Pay methods: COD + Stripe Checkout |

---

## 6. Web admin

**Implemented.** Better Auth (email/password + OTP). Roles: `user`, `admin`, `superAdmin`. Dashboard routes require `isAdmin`. First signed-in user can bootstrap super admin if none exists. Enforcement: `convex/lib/requireAdmin.ts`.

Nav (`apps/web/src/components/admin/admin-shell.tsx`):

| Module | Route | What an admin can do |
|--------|-------|----------------------|
| Dashboard | `/admin/home` | Date-range KPIs (revenue, orders, AOV, customers), charts, status/payment mix, top products/categories, recent orders, low stock, review analytics, activity feed |
| Products | `/admin/products`, `/new`, `/[id]/edit` | CRUD, active/inactive, search/filters, reorder, soft-delete/restore, images, stock, SEO, highlights, warranty. **AI content** (description, SEO, highlights, alt text). **AI pricing health**. Review insights on edit. Backfill **text embeddings** |
| Image embeddings | `/admin/image-embeddings` | SigLIP/CLIP index coverage, visual-search log, job queue, retry, backfill/rebuild |
| Promotions | `/admin/promotions` | BOGO / buy-X-get-Y / free gift / cross-product; schedule; performance; deactivate/restore |
| Orders | `/admin/orders`, `/[id]` | Search/filter/sort. Detail: status, COD payment status, Stripe fields (read-only), line items, promotions, transaction log, review invitation email, Vapi **collect review** on delivered orders |
| Reviews | `/admin/reviews`, `/[id]` | Moderate (approve/reject/delete), AI flags, bulk reprocess, reply draft/publish, generation history |
| Review AI | `/admin/review-ai` | Queue health, 30-day metrics, recent jobs |
| Review calls | `/admin/review-calls` | Outbound Vapi call KPIs, transcripts, retry |
| Categories | `/admin/product-categories` | CRUD, slug, active, reorder |
| Email marketing | `/admin/email-marketing/*` | Overview KPIs; TipTap templates; campaigns (segments, send, stats); subscribers (search, export CSV, refresh interests); **AI campaign assistant** and subject-line optimizer |
| Contact | `/admin/contact-messages` | Inbox, read/unread, delete, mailto |
| AI Assistant | `/admin/ai-assistant` | Vapi conversation analytics, transcripts, leads, support tickets, setup checklist |
| AI Business Copilot | `/admin/ai-copilot` | Natural-language Q&A over store data, conversation history, saved insights, structured cards |
| Recommendations | `/admin/recommendations` | Settings snapshot, rebuild frequently-bought-together, impressions/clicks, jobs |
| Settings | `/admin/settings` | Store contact, hours, legal HTML, `email_from` (Resend sync), SMS toggle, review-call auto schedule, recommendation flags, low-stock threshold |
| Users | `/admin/users` | **Staff accounts** (not shoppers): create, role, ban, delete |
| Profile | `/admin/profile` | Name, avatar, password, revoke sessions (account menu, not sidebar) |

**Not present as standalone modules:** customer CRM, inventory warehouse UI, Stripe key UI. Stock lives on products; low-stock on the dashboard; payments via env + order detail.

Login: `/admin/login`, `/admin/login/forgot-password`.

---

## 7. AI features

Provider selection is **environment-driven**, not hardcoded to one vendor.

**LLM selection** (`convex/lib/ai/getProvider.ts`, `providerChain.ts`):

- Explicit `AI_PROVIDER`, or first available key: Gemini → Groq → OpenRouter → OpenAI → Anthropic → remote worker (`AI_WORKER_URL`)
- Fallback chain: `AI_PROVIDER_CHAIN` (default `gemini,groq,openrouter,openai`)
- Remote worker: `services/review-ai-worker` when configured

**Not LLM:** visual embeddings use SigLIP/CLIP on Next.js. Gemini Vision is a visual-search fallback.

### Implemented AI capabilities

| Capability | Where | Behavior |
|------------|-------|----------|
| Hybrid / semantic catalog search | Web header + `/products?search=`; mobile search/shop | Keyword + 384-d product embeddings; query embedding cache; search events |
| Similar products | PDP (web + mobile) | Vector similarity (`getSimilarProducts`) |
| Visual search | Web + mobile | Image → embed API → vector indexes (768 SigLIP / 512 CLIP) |
| Recommendations | Both storefronts | Personalized and merchandising sections; admin analytics; optional n8n jobs |
| Product intelligence | Admin / search quality | Keywords, summaries, use cases on products |
| Review sentiment, tags, moderation flags | After review submit | Queue + providers or n8n |
| Semantic review search | PDP (web + mobile) | Natural language over reviews |
| Review insights / AI summary | PDP | Aggregated when pipeline has completed |
| AI review replies | Admin review detail | Draft, edit, publish |
| Product content generation | Admin product form | Description, SEO, highlights, alt text (Gemini vision for images when used) |
| AI pricing recommendations | Admin product form | Health/suggestions — **does not auto-change storefront prices** |
| Email campaign AI | Admin email marketing | Campaign copy, subject optimizer |
| Vapi shopping assistant | **Web only** | Search, cart, compare, checkout links, tracking — webhook tools on Convex |
| Outbound review calls | Admin orders + review-calls | Vapi after delivery (settings delay); Twilio/Vapi number constraints apply |
| Business copilot | Admin | NL questions; includes **heuristic** inventory/sales insight cards (velocity, coverage), not a separate forecasting product |

### Partial / env-gated

- Vapi storefront widget: unset public key → no widget
- n8n workflows: optional; Convex schedulers cover jobs if n8n is off
- Local AI worker: only if `AI_WORKER_URL` is set
- Mobile **AI tab**: prompt chips that navigate to **hybrid search**, not a conversational assistant

### Not implemented as standalone products

Automatic storefront dynamic pricing, full demand-planning, RFM clustering UI beyond email segments, cohort/CLV funnels. Email **audience segments** (recent buyers, high-value, inactive, category) **are** implemented.

---

## 8. Mobile app

**Implemented** Expo Router app (`apps/mobile`). Shares Convex with web. Cart: AsyncStorage `yasirCart`.

### Tabs (current code)

```text
Home → Shop → AI → Cart → Track
```

`apps/mobile/app/(tabs)/_layout.tsx` + `PremiumTabBar`. Settings gear is in the **Home and Shop headers**, not in the tab bar. Legacy `/orders` redirects to Track.

| Tab | Behavior |
|-----|----------|
| Home | Featured, categories, best sellers, new arrivals, recommendations, recently viewed, footer (newsletter, links) |
| Shop | Catalog: filters sheet, sort, grid/list, hybrid search, infinite-style loading |
| AI | Natural-language **search** entry (online only) → `/search` |
| Cart | Lines, server pricing when online, checkout CTA |
| Track | Order number **or** email/phone |

### Stack screens

| Route | Purpose |
|-------|---------|
| `/product/[id]` | PDP: gallery, variants, cart sheet, wishlist, compare, reviews, similar, share |
| `/category/[slug]` | Category catalog |
| `/search` | Hybrid search, trending/suggestions, recent searches, visual-search entry |
| `/visual-search` | Camera or library; HEIC→JPEG on iOS |
| `/wishlist` | Convex + offline queue |
| `/promotions` | Active promotions |
| `/checkout`, `/checkout/success`, `/checkout/cancel` | COD / Stripe |
| `/order/[id]` | Public order detail; delivered reviews |
| `/settings` | Theme, shopping prefs, data/privacy clears, about |
| `/about`, `/contact`, `/privacy`, `/terms`, `/shipping`, `/return` | Content / forms |
| `+not-found` | Fallback |

### Notable mobile behavior

- **Theme:** light / dark / **system** (default). Persisted `@preferences/v1`
- **Wishlist:** Convex `toggleWishlistItem` + visitor id; offline queue (see §9)
- **Compare:** up to 4 products, AsyncStorage, global sheet
- **Reviews:** PDP read (filters, semantic search, AI summary); write/edit/images on delivered order detail
- **Newsletter / contact:** implemented; **online-only submit**; drafts saved
- **Quick view:** `ProductQuickViewSheet` on catalog cards
- **Vapi:** **not implemented** on mobile
- **Push notifications:** settings toggles stored locally and **disabled** (no push backend)
- **i18n:** English strings in `lib/i18n/strings.ts`; no second locale yet

---

## 9. Mobile offline architecture

**Implemented** for browsing and drafts. **Not** a full offline commerce client.

Authoritative network: **NetInfo** (`NetworkProvider`, `lib/network.ts`). Unknown reachability is **not** treated as offline. Do not use `navigator.onLine` on native.

### Layers

| Layer | Role |
|-------|------|
| `NetworkProvider` / `useOnlineStatus` | Connection + “just reconnected” |
| AsyncStorage `@offline/v1/*` | TTL envelopes (`lib/offline/`) |
| `product-store` | LRU product blobs (max **80**) |
| `OfflineSyncBridge` | On confirmed online: drain wishlist queue |
| `OfflineBanner` | Dismissible offline; auto “Back online” |
| `CachedDataNotice` / `OfflineNotice` | Per-screen |

### Cached (stale-while-revalidate style)

Home feeds, categories, shop/category lists, product details in the LRU store, recently viewed (max **30**), site settings, search trending/suggestions, local text search over cached products, wishlist IDs, last **track-by-order-number** result (30 minutes, same query), contact draft (Secure Store), newsletter email draft.

**Cached prices are display-only.** Checkout re-validates on the server.

### TTLs and limits (`lib/offline/constants.ts`)

| Data | TTL / cap |
|------|-----------|
| Home / shop lists | 6h |
| Categories / settings | 24h |
| Recommendations | 2h |
| Similar products | 6h |
| Search meta | 12h |
| Track-by-order cache | 30m |
| Product LRU | 80 items |
| Category list caches | 8 × 20 products |
| Wishlist queue | 50 ops, 5 attempts then drop |
| Wishlist / drafts | No TTL |

### Online-only (no local order/payment/AI queue)

**Orders, checkout, Stripe, COD, AI requests, visual search, live tracking (email/phone), contact submission, and newsletter subscription require an internet connection.**

Also online-only: review mutations and image upload, semantic review search, hybrid search **load more**, live cart pricing, stock sanitization.

On reconnect: wishlist queue drains; **checkout, payments, forms, and AI are not auto-submitted.**

### Why checkout is not queued

Checkout needs live stock, server-side promotion pricing, and either Stripe or an immediate COD mutation. A queued offline order could charge the wrong amount or oversell. The app blocks checkout when offline (`ensureOnlineNow` + offline notice).

---

## 10. Cross-platform / iOS / Android

**Code-level compatibility is implemented. Physical-device and store-release QA are not documented as complete.**

| Area | Implementation |
|------|----------------|
| Expo Go / simulators | README: QR, `a` / `i`, tunnel |
| Android | `softwareKeyboardLayoutMode: pan`; package `com.yasir.ecommerce`; EAS preview **APK** |
| iOS | Bundle id `com.yasir.ecommerce`; camera/photo usage strings; `associatedDomains` when `EXPO_PUBLIC_SITE_URL` is set |
| Safe areas | `SafeAreaProvider` + insets on tab bar, headers, checkout footer |
| Keyboard | iOS `KeyboardAvoidingView` on checkout, AI, visual search, track |
| Camera / library | `expo-image-picker` plugin; visual search camera + library |
| HEIC/HEIF | Visual search converts to JPEG (`expo-image-manipulator`). Review uploads accept JPEG/PNG/WebP only |
| Stripe | `ecommerce://checkout/success` · `cancel` · return `ecommerce://checkout` via `expo-web-browser` auth session |
| Deep links | Scheme `ecommerce://`; Android intent filters for product, category, track-order, checkout, promotions when site URL is set |
| Accessibility | 44px touch targets, labels, roles, reduce-motion |
| Haptics | Native only; skipped on web |
| New Architecture | `newArchEnabled: true` |
| EAS | `apps/mobile/eas.json`: development client, preview APK, production Convex URL env |

**Not verified in-repo:** TestFlight, App Store, Play Store production listing, or a named physical-device test matrix.

Expo **web** (`react-native-web`) is a development preview of the mobile UI, not the Next.js storefront.

---

## 11. Checkout and payments

**Implemented** on web and mobile. Same Convex mutations/actions.

### Cart

- Client-side only (no server cart table)
- Lines: `productId`, `color`, `quantity` (`packages/shared`)
- Preview totals: `validateCartForCheckout` / cart pricing hooks
- Promotions evaluated **on the server** (gifts, discounts)

### Server-side pricing

`convex/lib/checkoutPricing.ts`: load live products → line prices/discounts → promotion engine → delivery method charges → tax/shipping/total. Rejects mixed currencies and stale prices.

### COD

`orders.createCashOrder`: validate → price → decrement stock → order + item/promotion snapshots → logs → email / optional SMS. Payment status starts pending; admin can mark paid.

### Stripe

`stripe.createCheckoutSession`: pending order (stock held) → Stripe Checkout Session (amount asserted against server total) → customer pays on Stripe → `POST /stripe/webhook` → paid/failed/refunded. Cancel restores stock. Success/cancel pages (web URLs or `ecommerce://` on mobile).

**Idempotency:** unique `idempotencyKey` on orders; duplicate Stripe retries reuse a pending order when allowed.

### Offline

Mobile (and any client) must be **online** to create orders. No queued COD/Stripe.

### Notifications

Order confirmation **email** (Resend). **SMS** if Twilio env + Admin Settings toggle. Review invitations from admin after delivery.

### Security notes

- Card data never hits the app (Stripe hosted)
- Webhook signature verification + `stripeWebhookEvents` idempotency
- Public tracking: order-number lookup returns **masked PII** until email, phone, or access token verifies (`orderTracking.ts`)
- Tracking lookups are **rate-limited**

Voice checkout (Stripe/COD links) exists on **Vapi/web**, not on the Expo app.

---

## 12. Backend / Convex

One deployment serves web admin, web shop, and mobile.

### Major domains

| Domain | Modules (representative) | Shared by |
|--------|--------------------------|-----------|
| Products / categories | `products.ts`, `productCategories.ts` | Web, mobile, admin |
| Promotions | `productPromotions.ts`, `lib/promotions/` | Web, mobile, admin, checkout |
| Orders / checkout | `orders.ts`, `lib/checkoutPricing.ts` | Web, mobile, Vapi |
| Stripe | `stripe.ts`, `stripeWebhooks.ts` | Web, mobile |
| Tracking | `orderTracking.ts` | Web, mobile |
| Reviews | `productReviews.ts`, insights, search | Web, mobile, admin |
| Search | `productSearch.ts` | Web, mobile, Vapi |
| Visual search | `visualProductSearch.ts`, image embedding jobs | Web, mobile, admin |
| Recommendations / wishlist | `recommendations.ts`, `recommendationMutations.ts` | Both apps (web wishlist UI does not call Convex toggle) |
| Settings | `settings.ts` | Public list + admin CRUD |
| Contact / subscribers | `contactMessages.ts`, `subscribers.ts` | Web, mobile, admin |
| Auth / users | `auth.ts`, `adminUsers.ts`, `betterAuth/` | Admin |
| Admin analytics | `adminDashboard.ts`, `adminOrders.ts`, … | Admin |
| Review AI | `reviewAi*.ts`, n8n HTTP | Admin + pipelines |
| Copilot | `aiBusinessCopilot.ts` | Admin |
| Email campaigns | `emailCampaigns.ts`, `emailCampaignAi.ts` | Admin |
| Vapi | `convex/vapi/` | Web widget + review calls |
| SMS / email send | `sms.ts`, `notifications.ts` | Internal after order |
| Storage | Product images, review photos, visual-search uploads, avatars | All |

### HTTP (`convex/http.ts`)

- Better Auth routes
- `POST /stripe/webhook`
- `POST /vapi/webhook`
- `/n8n/review-ai/*`, `/n8n/product-ai/*`, `/n8n/image-embedding/*`, `/n8n/recommendations/*` (secret header)

Public storefront functions are unauthenticated. Admin mutations use `requireAdmin`. Internal functions handle webhooks and job processors.

**Pagination:** list endpoints use indexed queries and cursors. Unbounded `.collect()` is avoided on large tables (project rule).

---

## 13. Security and reliability

**Implemented protections (from code):**

- Server-side cart validation and pricing; client totals are not trusted
- Checkout idempotency keys
- Stripe webhook verification and event de-duplication
- Stock decrement on order create; restore on Stripe cancel / applicable failures
- Admin session + role checks; banned users blocked
- Public order tracking rate limits; masked PII until verification
- Image embed API optional shared secret (`IMAGE_EMBED_API_SECRET`)
- n8n HTTP secret (`lib/n8nAuth.ts`)
- Copilot / some AI admin actions rate-limited
- Storefront error UI; mobile `getFriendlyErrorMessage` (no raw Convex dumps)
- No automatic offline order submission
- Contact drafts in Secure Store on mobile (not payment data)

**Auth scope:** Better Auth is **admin**. There is no shopper account system.

**Do not store** (mobile policy): passwords, cards, Convex admin secrets.

---

## 14. Performance and UX

| Technique | Where |
|-----------|--------|
| Indexed Convex queries + pagination | Catalog, admin lists, reviews |
| Infinite scroll / sentinel | Web `/products`; mobile shop/catalog |
| Load-more | Visual search, PDP reviews |
| Debounced search | Web header (~300ms); mobile search hooks |
| Query embedding cache | Hybrid search |
| Recommendation section cache | Convex + mobile TTL 2h |
| `expo-image` + placeholders | Mobile product images |
| Next.js / Convex storage URLs | Web images |
| Memoized product cards | Mobile |
| Skeletons / loading views | Web catalog; mobile `Skeleton`, `LoadingView` |
| Pull-to-refresh | Mobile home, shop, category, wishlist, promotions |
| Avoid request storms | Mobile offline cache skip when live slice unchanged; skip live queries when offline |
| Responsive shop layout | Web Tailwind breakpoints; mobile `useLayoutMetrics` |

Realtime: Convex `useQuery` updates catalog/admin views without polling.

---

## 15. Accessibility

### Web

- `lang="en"`
- Header search `role="search"`; labeled nav, cart, filters, ratings, swatches
- shadcn Dialog/Sheet for quick view, menus, compare, Vapi
- Form labels on checkout/contact
- `useReducedMotion` on some motion sections

Not a certified WCAG audit. Storefront is light-only (contrast not theme-switchable).

### Mobile

Documented in `apps/mobile/docs/mobile-ux.md` and applied in UI:

- Minimum **44×44** touch targets (`touchTarget`)
- `accessibilityLabel` / `Role` / `State` on controls
- Reduce motion from `AccessibilityInfo`
- Alerts for offline/errors/toasts
- System font scaling; `maxFontSizeMultiplier` on dense layouts when used

---

## 16. Feature matrix

Legend: **Yes** = implemented on that surface · **Partial** = limited or different mechanism · **No** = not on that surface · **N/A** = not applicable.

| Feature | Web shop | Mobile | Convex / services |
|---------|----------|--------|-------------------|
| Product catalog | Yes | Yes | Yes |
| Categories | Yes (filter + home tiles) | Yes (grid + `/category/[slug]`) | Yes |
| Product detail | Yes | Yes | Yes |
| Hybrid / AI text search | Yes | Yes | Yes |
| Visual search | Yes | Yes | Yes (+ Next embed API) |
| Recommendations | Yes | Yes | Yes |
| Best sellers / new arrivals | Yes | Yes | Yes |
| Quick view | Yes | Yes | N/A |
| Compare (4 products) | Yes (sheet) | Yes (sheet) | N/A (client lists) |
| Wishlist | Yes (localStorage) | Yes (Convex + queue) | Yes (mobile path) |
| Promotions | Yes | Yes | Yes |
| Cart | Yes | Yes | Validate/price only |
| Checkout | Yes | Yes | Yes |
| Stripe | Yes | Yes | Yes |
| COD | Yes | Yes | Yes |
| Order tracking | Yes | Yes | Yes |
| Post-delivery reviews | Yes | Yes | Yes |
| PDP review read / AI summary | Yes | Yes | Yes |
| Contact form | Yes | Yes | Yes |
| Newsletter | Yes | Yes | Yes |
| About / legal / shipping / return | Yes | Yes | Settings content |
| AI shopping page / Vapi | Yes (Vapi env-gated) | Partial (search tab only) | Vapi webhooks |
| Dark / light / system theme | No (light only) | Yes | N/A |
| Offline catalog browse | No | Yes | N/A |
| Offline checkout / payments | No | No (blocked) | N/A |
| Customer login | No | No | Admin only |
| Admin dashboard | Yes (`/admin`) | No | Yes |
| Email marketing | Admin | No | Yes |
| Review calls | Admin | No | Yes |
| Business copilot | Admin | No | Yes |

Wishlist **lists are not shared** between web localStorage and mobile Convex.

---

## 17. Roadmap / remaining work

These are **not implemented** or not finished. Do not treat them as shipped.

| Item | Notes |
|------|--------|
| Shopper accounts | No login, profile, or cross-device order history |
| Shared wishlist | Web localStorage vs mobile Convex |
| Vapi on mobile | No `@vapi-ai` native/web SDK in `apps/mobile` |
| Conversational AI tab | Mobile AI tab is hybrid search only |
| Web dark mode | Storefront theme locked to light |
| Header discoverability | Web wishlist/compare not in primary nav |
| Recently viewed on web home | Component unused |
| Push notifications | Mobile toggles are inert |
| Dedicated inventory / CRM admin | Stock on products; customers via orders only |
| Automatic dynamic pricing | Admin suggestions only |
| Full forecasting / cohort analytics | Copilot heuristic cards ≠ dedicated BI product |
| iOS physical-device QA | Not documented |
| App Store / TestFlight | EAS submit config empty of store metadata |
| Play Store production | Preview APK profile exists; store listing not documented |
| Second locale / RTL | i18n file is English-only |
| SMS marketing / SMS OTP | Transactional order SMS only; admin OTP is email |

Optional ops (already coded, need env): Vapi keys, Twilio, Resend, n8n, `AI_WORKER_URL`, image-embed secret, matching Convex URL on web vs mobile.

---

## Related documentation

| Doc | Topic |
|-----|--------|
| [README.md](../README.md) | Setup, Vercel, env, Vapi review-call numbers |
| [AGENTS.md](../AGENTS.md) | Agent/dev conventions |
| [apps/mobile/README.md](../apps/mobile/README.md) | Expo runbook |
| [apps/mobile/docs/mobile-ux.md](../apps/mobile/docs/mobile-ux.md) | Mobile UX, theme, offline rules |
| [docs/visual-search-architecture.md](visual-search-architecture.md) | SigLIP/CLIP / n8n |
| [docs/recommendation-platform.md](recommendation-platform.md) | Recommendation engine |
| [docs/review-ai-architecture.md](review-ai-architecture.md) | Review AI pipeline |
| [docs/AI_FEATURE_QA_CHECKLIST.md](AI_FEATURE_QA_CHECKLIST.md) | AI QA before release |
| [convex/vapi/VOICE_ASSISTANT_GUIDE.md](../convex/vapi/VOICE_ASSISTANT_GUIDE.md) | Vapi tools |

---

*This overview reflects the monorepo as implemented. For commands and secrets, use the README; for Convex function names, use `convex/`.*
