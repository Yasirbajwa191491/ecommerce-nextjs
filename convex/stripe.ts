"use node";

import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import {
  cartLineValidator,
  customerInfoValidator,
} from "./lib/checkoutValidation";
import { deliveryMethodTypeValidator } from "./lib/checkoutPricing";
import type { Id } from "./_generated/dataModel";
import type { PricedLineItem } from "./lib/orderPricing";
import { getSiteUrl } from "./lib/siteUrl";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConvexError(
      "STRIPE_SECRET_KEY is not configured. Set it with: npx convex env set STRIPE_SECRET_KEY sk_..."
    );
  }
  return new Stripe(key);
}

function buildStripeLineItems(
  priced: {
    currency: string;
    shipping: number;
    deliveryCharge?: number;
    deliveryMethod?: string;
    deliveryMethodLabel?: string;
    items: PricedLineItem[];
  }
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    priced.items.map((item: PricedLineItem) => {
      const discountNote =
        item.discountPercent > 0 ? ` · ${item.discountPercent}% off` : "";
      return {
        price_data: {
          currency: priced.currency.toLowerCase(),
          unit_amount: Math.round(item.finalUnitPrice * 100),
          product_data: {
            name: item.productName,
            description: `Color: ${item.color}${discountNote}`,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
        },
        quantity: item.quantity,
      };
    });

  const isStandardDelivery =
    !priced.deliveryMethod || priced.deliveryMethod === "standard";

  if (isStandardDelivery && priced.shipping > 0) {
    lineItems.push({
      price_data: {
        currency: priced.currency.toLowerCase(),
        unit_amount: Math.round(priced.shipping * 100),
        product_data: {
          name: priced.deliveryMethodLabel ?? "Standard Delivery",
          description: "Standard delivery shipping charges",
        },
      },
      quantity: 1,
    });
  }

  if (!isStandardDelivery && (priced.deliveryCharge ?? 0) > 0) {
    lineItems.push({
      price_data: {
        currency: priced.currency.toLowerCase(),
        unit_amount: Math.round((priced.deliveryCharge ?? 0) * 100),
        product_data: {
          name: priced.deliveryMethodLabel ?? "Delivery",
          description: "Delivery charges",
        },
      },
      quantity: 1,
    });
  }

  return lineItems;
}

function assertStripeAmountMatchesOrder(
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  expectedTotal: number
): void {
  const centsTotal = lineItems.reduce((sum, item) => {
    const unitAmount = item.price_data?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    return sum + unitAmount * quantity;
  }, 0);
  const expectedCents = Math.round(expectedTotal * 100);
  if (centsTotal !== expectedCents) {
    throw new ConvexError(
      `Stripe line items total (${centsTotal}) does not match order total (${expectedCents})`
    );
  }
}

export const createCheckoutSession = action({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
  },
  handler: async (ctx, args): Promise<{
    url: string;
    orderId: Id<"orders">;
    orderNumber: string;
  }> => {
    return await createCheckoutSessionHandler(ctx, args);
  },
});

export const createCheckoutSessionForVoice = internalAction({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
  },
  returns: v.object({
    url: v.string(),
    orderId: v.id("orders"),
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
    shipping: v.number(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
    deliveryMethodLabel: v.optional(v.string()),
    deliveryCharge: v.optional(v.number()),
    deliveryEstimate: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    url: string;
    orderId: Id<"orders">;
    orderNumber: string;
    total: number;
    currency: string;
    shipping: number;
    deliveryMethod?: import("./lib/productValidators").DeliveryMethodType;
    deliveryMethodLabel?: string;
    deliveryCharge?: number;
    deliveryEstimate?: string;
  }> => {
    const session = await createCheckoutSessionHandler(ctx, args);
    const order = await ctx.runQuery(internal.orders.getOrderTotalsInternal, {
      orderId: session.orderId,
    });
    return {
      ...session,
      ...order,
    };
  },
});

async function createCheckoutSessionHandler(
  ctx: ActionCtx,
  args: {
    lines: Array<{ productId: Id<"products">; color: string; quantity: number }>;
    customer: {
      fullName: string;
      email: string;
      phone: string;
      address: string;
      notes?: string;
      termsAccepted: boolean;
      privacyAccepted: boolean;
    };
    idempotencyKey: string;
    deliveryMethod?: import("./lib/productValidators").DeliveryMethodType;
  }
): Promise<{ url: string; orderId: Id<"orders">; orderNumber: string }> {
    const { orderId, orderNumber, priced } = await ctx.runMutation(
      internal.orders.createPendingStripeOrder,
      args
    );

    const stripe = getStripe();
    const appUrl = getSiteUrl();

    const lineItems = buildStripeLineItems(priced);
    assertStripeAmountMatchesOrder(lineItems, priced.total);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      customer_email: args.customer.email.trim(),
      line_items: lineItems,
      metadata: {
        orderId,
        orderNumber,
        idempotencyKey: args.idempotencyKey,
      },
      success_url: `${appUrl}/checkout/success?orderNumber=${encodeURIComponent(orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel?orderNumber=${encodeURIComponent(orderNumber)}`,
    });

    if (!session.url) {
      throw new ConvexError("Failed to create Stripe checkout session");
    }

    await ctx.runMutation(internal.orders.attachStripeSession, {
      orderId,
      stripeSessionId: session.id,
    });

    return {
      url: session.url,
      orderId,
      orderNumber,
    };
}
