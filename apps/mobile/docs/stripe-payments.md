# Mobile Stripe payments (PaymentSheet)

Native card payments use **Stripe PaymentSheet** via `@stripe/stripe-react-native`. Cash on delivery is unchanged.

## Flow

```text
Checkout (Card selected)
  → api.stripe.createMobilePaymentIntent (Convex action)
  → pending order + inventory reserved (server-side pricing)
  → Stripe PaymentIntent client secret returned
  → initPaymentSheet + presentPaymentSheet (native UI)
  → Stripe confirms PaymentIntent
  → POST /stripe/webhook → markOrderPaid
  → success screen (Convex live query) → clear cart when paymentStatus === "paid"
```

## Backend actions

| Action | Purpose |
|--------|---------|
| `stripe.createMobilePaymentIntent` | Create/reuse pending order + PaymentIntent for checkout |
| `stripe.resumeMobilePaymentIntent` | Retry payment for an existing pending order |

Web continues to use `stripe.createCheckoutSession` and `stripe.resumeCheckoutSession`.

## Idempotency

- Client sends a UUID `idempotencyKey` per checkout attempt.
- `createPendingStripeOrder` reuses an existing pending Stripe order when the key matches.
- Reusable PaymentIntents (`requires_payment_method`, `requires_confirmation`, `requires_action`, `processing`) are returned again instead of creating duplicates.
- Stripe API idempotency keys: `mobile-pi:{idempotencyKey}` (first PI), `mobile-pi:{idempotencyKey}:replace:{piId}` (replacement).

## Dismissing PaymentSheet

Closing PaymentSheet is **not** a payment failure. The pending order remains; cart is kept. Customer can tap Pay again or use Retry on the success screen.

## Environment

**Mobile (`apps/mobile/.env`):**

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` or `pk_live_…`)

**Convex (never in mobile):**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Native build requirement

PaymentSheet requires a **development build** or **EAS build**. It does not work in Expo Go.

```bash
# From repo root
npm run mobile:env
# Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to apps/mobile/.env
npx expo run:android   # or EAS build
```

Plugin: `@stripe/stripe-react-native` in `app.config.ts`.

## Online-only

Checkout and payments are blocked offline (`ensureOnlineNow`). No queued payments.

## Key files

| Area | Path |
|------|------|
| Checkout | `app/checkout/index.tsx` |
| Success / retry | `app/checkout/success.tsx` |
| PaymentSheet hook | `hooks/usePaymentSheetCheckout.ts` |
| Stripe provider | `providers/StripeProvider.tsx` |
| Config | `lib/stripe-config.ts` |
| Backend | `convex/stripe.ts`, `convex/orders.ts` |
| Webhooks | `convex/stripeWebhookNode.ts` |
