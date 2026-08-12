# AI Feature QA Checklist

Internal checklist for validating AI-powered storefront features before production releases.
Each feature should work in all five states: **Success**, **Empty**, **API failure**, **Loading**, and **Fallback**.

Architecture note: several features chain **Gemini → Grok/OpenRouter/OpenAI → n8n**. Failures at any layer must degrade gracefully — the storefront must remain usable.

## How to use

1. Run manual checks in **incognito** (no cached session/cart bias where noted).
2. Test on **production** (`SITE_URL` + Convex env) for embed/API features.
3. Mark each cell: pass · partial · fail · not applicable
4. Log failures with browser console, Convex logs, and network tab screenshots.

---

## Feature matrix

| Feature | Success | Empty | API failure | Loading | Fallback |
| --- | --- | --- | --- | --- | --- |
| **AI Search** (header + catalog hybrid) | Natural-language query returns relevant products; sort/filter still work | Query with no matches shows empty state, not an error | LLM/embed failure falls back to substring/keyword search | Spinner/skeleton during search; no layout jump | Catalog browse + header text search remain usable |
| **Visual Search** (`/products/visual-search`) | Upload → preview → similar products with scores | No matches message; suggest browse catalog CTA | Clear error when embed API unavailable; localhost hint only in dev | Upload + search buttons disabled while processing | Link to text search / products catalog |
| **Recommendations** (home, PDP, cart) | Sections show when enough signal exists | Empty sections hidden (no blank carousels) | Convex/query errors don't break page shell | Skeleton cards while loading | Static Best Sellers / New Arrivals still visible |
| **Voice Assistant** (Vapi) | Voice/text commands open products, cart, track order | Unknown intent gets helpful prompt | Mic/API unavailable shows retry + text alternatives | Connecting state on FAB/panel | All non-voice shopping paths work |
| **Review AI** (admin) | Suggested reply matches tone + policy | No reviews → empty admin state | Provider timeout shows error toast, draft preserved | Generate button loading state | Admin can still reply manually |
| **Email AI** (campaigns) | Generated subject/body usable | Empty product set handled | Provider failure → manual edit still available | Streaming/loading indicator | Send without AI content |

---

## Production catalog (`/products`)

| Check | Steps | Expected |
| --- | --- | --- |
| Products load | Incognito → `/products` | Product grid populates; no perpetual skeleton |
| Price range | Open filters sidebar | Real min–max (not `$0.00 – $0.00` flash) |
| In stock | Toggle **In stock only** | Out-of-stock items hidden; facet counts update |
| Category | Select category | URL + results update |
| Price filter | Drag slider | URL `minPrice`/`maxPrice`; results match **sale** prices |
| Sort | Relevance, Newest, Price ↑↓, Popular, Rating | Order changes correctly |
| Search + sort | Header search + catalog sort | Combined behavior stable |
| Pagination | Scroll / load more | Next page appends; no duplicates |
| Mobile filters | 375px drawer | All filters usable; apply/clear works |

---

## Promotions

| Step | Expected |
| --- | --- |
| Admin creates promotion, status **active**, valid date window | Saved in Convex |
| `/promotions` | Cards render (SSR snapshot + client hydrate) |
| Promotion detail / product badge | Buy product shows offer |
| Add buy product to cart | `validateCartForCheckout` applies discount/gift |
| Checkout summary | Promotion line items + correct total |

---

## Visual search production config

| Env var | Purpose |
| --- | --- |
| `SITE_URL` | Public URL Convex uses to call `/api/ai/embed-image` |
| `IMAGE_EMBED_API_SECRET` | Must match Next.js + Convex |
| `GEMINI_API_KEY` (or configured provider) | Embedding generation |

| Check | Expected |
| --- | --- |
| Admin → Image embeddings backfill | Product vectors populated |
| Upload image on production | Preview → results or empty state |
| Break embed API (wrong secret) | User-friendly error, not white screen |

---

## Store information (Admin → Settings)

| Key | Used on |
| --- | --- |
| `store_name` | Header logo, footer, contact copy, order emails |
| `address`, `phone`, `email`, `business_hours` | Contact, footer, about, emails, AI context |

After changing settings, verify: Contact page, Footer, order confirmation email (test order), review AI context.

---

## Responsive breakpoints

Test at **375px**, **768px**, **1024px**, **1440px**:

- Product cards (actions visible on touch)
- Catalog filter drawer
- Cart + checkout columns
- AI assistant FAB/panel
- Visual search upload + preview
- Recommendation carousels
- Order tracking timeline (vertical mobile / horizontal desktop)
- Contact form + subject dropdown

---

## Release gate

Before marking storefront **feature-complete**:

- [ ] All matrix rows reviewed for current release
- [ ] Catalog + promotions verified on production incognito
- [ ] Visual search works with production `SITE_URL`
- [ ] Store settings edited once and reflected sitewide
- [ ] No blocking console errors on primary flows (home → PDP → cart → checkout → track order)
