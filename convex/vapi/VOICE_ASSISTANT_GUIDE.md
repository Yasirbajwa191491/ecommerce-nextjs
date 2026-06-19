# Vapi voice assistant — delivery, warranty & checkout

Single source of truth for prompts and tools: `convex/vapi/assistantConfig.ts`.

Pricing uses the same backend as the website: `priceCheckoutCart` in `convex/lib/checkoutPricing.ts`.

## Delivery charges (matches website)

| Method | Charge source | Order field | Stripe line |
|--------|---------------|-------------|-------------|
| `standard` | Product `shippingCharges` (once per product) | `shipping` | Standard delivery shipping |
| `express`, `same_day`, `next_day`, `pickup` | Sum of each product's `deliveryOptions[].charge` | `deliveryCharge` | Named delivery line |

Rules:

- A method is available only if **enabled on every product** in the cart.
- Mixed carts use the **intersection** of enabled methods.
- Voice checkout must pass `deliveryMethod` to `createCashOrder` or `createCheckoutSession`.

## Tools (shopping)

| Tool | Purpose |
|------|---------|
| `getProductDetails` | Warranty + per-product delivery options |
| `getDeliveryOptions` | Cart-level available methods, charges, estimates |
| `getCart` | Optional `deliveryMethod` — returns `deliverySummary`, totals |
| `createCashOrder` | Required `deliveryMethod` |
| `createCheckoutSession` | Required `deliveryMethod` |

## Warranty

- `getProductDetails` → `warrantyAvailable`, `warrantySummary`
- Orders snapshot warranty on line items automatically (voice + web)
- `trackOrder` includes `warrantySummary` per item when present

## Assistant checkout flow

1. `getCart` — items + default delivery
2. `getDeliveryOptions` — read options to customer
3. Confirm delivery method
4. `getCart({ deliveryMethod })` — final total
5. Confirm payment (COD or Stripe)
6. Collect name, email, phone, address
7. `createCashOrder` or `createCheckoutSession` **with `deliveryMethod`**

## Deploy assistant config (local vs production)

Both environments use the **same tool definitions** from `assistantConfig.ts`. The webhook URL points at your Convex site.

### Prerequisites (Convex)

```bash
npx convex env set VAPI_WEBHOOK_SECRET your-secret
npx convex env set VAPI_API_KEY your-vapi-api-key
```

`VAPI_WEBHOOK_SECRET` must match the header Vapi sends to `{CONVEX_SITE_URL}/vapi/webhook`.

### Local development

1. Run `npm run dev` (Next.js + `npx convex dev`).
2. Note your dev Convex site URL (`.env.local` → `NEXT_PUBLIC_CONVEX_SITE_URL`).
3. Provision or update the assistant:

```bash
npm run vapi:setup
```

Optional: set `VAPI_ASSISTANT_ID` in `.env.local` to update an existing assistant instead of creating a new one.

4. Set in `.env.local`:

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
NEXT_PUBLIC_VAPI_ASSISTANT_ID=...
VAPI_API_KEY=...
```

5. Text chat uses `/api/vapi/chat` with the same assistant ID.

### Production

1. Deploy Convex + Next.js to production.
2. Set Convex **production** env vars (`VAPI_WEBHOOK_SECRET`, `VAPI_API_KEY`, Stripe, etc.).
3. Update the production assistant:

```bash
npm run vapi:setup:prod
```

Or with explicit prod assistant ID:

```bash
VAPI_PROD_ASSISTANT_ID=your-prod-assistant-id npm run vapi:setup -- --prod
```

4. Set production Next.js env: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.

### After changing `assistantConfig.ts`

Always re-run `npm run vapi:setup` (local) and/or `npm run vapi:setup:prod` (production) so Vapi receives updated tools and system prompt.

## Testing voice checkout

1. Open the shop widget (bottom-right on shop pages).
2. Add a product via voice/chat (`addToCart`).
3. Ask for delivery options — assistant should call `getDeliveryOptions`.
4. Choose express (or standard) and confirm total matches website checkout for the same cart.
5. Place COD or Stripe order — verify order in admin has `deliveryMethod`, `deliveryCharge` / `shipping`, and warranty on items.

## Files

| Area | Path |
|------|------|
| Prompt + tool schemas | `convex/vapi/assistantConfig.ts` |
| Webhook router | `convex/vapi/webhook.ts` |
| Cart + delivery queries | `convex/vapi/shoppingTools.ts` |
| Stripe voice checkout | `convex/vapi/shoppingCheckoutActions.ts` |
| Delivery helpers | `convex/vapi/voiceDeliveryHelpers.ts` |
| Product DTOs | `convex/vapi/dtos.ts` |
| Widget UI | `src/components/vapi/` |
| Setup scripts | `scripts/setup-vapi-assistant.mjs`, `scripts/setup-vapi-production.mjs` |
