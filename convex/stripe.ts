"use node";

import Stripe from "stripe";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import {
  cartLineValidator,
  customerInfoValidator,
} from "./lib/checkoutValidation";
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

export const createCheckoutSession = action({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    url: string;
    orderId: Id<"orders">;
    orderNumber: string;
  }> => {
    const { orderId, orderNumber, priced } = await ctx.runMutation(
      internal.orders.createPendingStripeOrder,
      args
    );

    const stripe = getStripe();
    const appUrl = getSiteUrl();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      priced.items.map((item: PricedLineItem) => ({
        price_data: {
          currency: priced.currency.toLowerCase(),
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: {
            name: item.productName,
            description: `Color: ${item.color}`,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
        },
        quantity: item.quantity,
      }));

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
  },
});
