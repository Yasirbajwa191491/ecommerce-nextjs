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
import { isRetryablePaymentIntentStatus } from "./lib/stripePaymentIntent";
import { shouldRetryAutomaticStripeRefund } from "./lib/stripeRefund";
import { isQrTokenShape, parseQrPayload } from "./lib/qrTokens";
import { isPendingStripeOrder } from "./lib/orderNotificationLogic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConvexError(
      "STRIPE_SECRET_KEY is not configured. Set it with: npx convex env set STRIPE_SECRET_KEY sk_..."
    );
  }
  return new Stripe(key);
}

const mobilePaymentIntentResultValidator = v.object({
  clientSecret: v.string(),
  orderId: v.id("orders"),
  orderNumber: v.string(),
  accessToken: v.optional(v.string()),
  alreadyPaid: v.optional(v.boolean()),
});

function buildStripeLineItems(
  priced: {
    currency: string;
    shipping: number;
    deliveryCharge?: number;
    deliveryMethod?: string;
    deliveryMethodLabel?: string;
    tax?: number;
    items: PricedLineItem[];
  }
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    priced.items.map((item: PricedLineItem) => {
      const discountNote =
        item.discountPercent > 0 ? ` · ${item.discountPercent}% off` : "";
      const promotionNote = item.isPromotionGift ? " · Promotion gift" : "";
      return {
        price_data: {
          currency: priced.currency.toLowerCase(),
          unit_amount: Math.round(item.finalUnitPrice * 100),
          product_data: {
            name: item.productName,
            description: `Color: ${item.color}${discountNote}${promotionNote}`,
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

  if ((priced.tax ?? 0) > 0) {
    lineItems.push({
      price_data: {
        currency: priced.currency.toLowerCase(),
        unit_amount: Math.round((priced.tax ?? 0) * 100),
        product_data: {
          name: "Tax",
          description: "Order tax",
        },
      },
      quantity: 1,
    });
  }

  return lineItems;
}

function sumStripeLineItemsCents(
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
): number {
  return lineItems.reduce((sum, item) => {
    const unitAmount = item.price_data?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    return sum + unitAmount * quantity;
  }, 0);
}

function assertStripeAmountMatchesOrder(
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  expectedTotal: number
): void {
  const centsTotal = sumStripeLineItemsCents(lineItems);
  const expectedCents = Math.round(expectedTotal * 100);
  if (centsTotal !== expectedCents) {
    throw new ConvexError(
      `Stripe line items total (${centsTotal}) does not match order total (${expectedCents})`
    );
  }
}

function appendCheckoutRedirectParams(
  url: string,
  params: Record<string, string>
): string {
  const filtered = Object.entries(params).filter(([, value]) => value.length > 0);
  if (filtered.length === 0) return url;

  const existingKeys = new Set<string>();
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    const query = url.slice(queryIndex + 1);
    for (const part of query.split("&")) {
      const key = part.split("=")[0];
      if (key) existingKeys.add(decodeURIComponent(key));
    }
  }

  const additions = filtered.filter(([key]) => !existingKeys.has(key));
  if (additions.length === 0) return url;

  const encoded = additions
    .map(([key, value]) => {
      const encodedValue =
        key === "session_id" && value === "{CHECKOUT_SESSION_ID}"
          ? value
          : encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${encodedValue}`;
    })
    .join("&");
  const separator = queryIndex >= 0 ? "&" : "?";
  return `${url}${separator}${encoded}`;
}

export const createMobilePaymentIntent = action({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
  },
  returns: mobilePaymentIntentResultValidator,
  handler: async (ctx, args) => {
    return await createMobilePaymentIntentHandler(ctx, args);
  },
});

export const resumeMobilePaymentIntent = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: mobilePaymentIntentResultValidator,
  handler: async (ctx, args): Promise<{
    clientSecret: string;
    orderId: Id<"orders">;
    orderNumber: string;
    accessToken?: string;
    alreadyPaid?: boolean;
  }> => {
    const pending = await ctx.runQuery(internal.orders.getPendingStripeOrderForResume, {
      orderNumber: args.orderNumber,
      customerEmail: args.customerEmail,
      accessToken: args.accessToken,
    });
    if (!pending) {
      throw new ConvexError("We couldn't find a pending payment for this order.");
    }
    if (pending.order.paymentStatus === "paid") {
      return {
        clientSecret: "",
        orderId: pending.order._id,
        orderNumber: pending.order.orderNumber,
        accessToken: pending.order.accessToken,
        alreadyPaid: true,
      };
    }

    let priced = await ctx.runQuery(internal.orders.getPricedSnapshotForOrder, {
      orderId: pending.order._id,
    });
    let existingPaymentIntentId = pending.order.stripePaymentIntentId;

    if (!pending.resumable) {
      if (!pending.retryable) {
        throw new ConvexError("This order is no longer awaiting payment.");
      }

      const revived = await ctx.runMutation(internal.orders.reviveStripeOrderForRetry, {
        orderId: pending.order._id,
      });
      if (revived.alreadyPaid) {
        return {
          clientSecret: "",
          orderId: pending.order._id,
          orderNumber: pending.order.orderNumber,
          accessToken: pending.order.accessToken,
          alreadyPaid: true,
        };
      }
      if (!revived.priced) {
        throw new ConvexError("Unable to reopen this payment. Please try again.");
      }
      priced = revived.priced;
      existingPaymentIntentId = revived.stripePaymentIntentId;
    }

    return await createPaymentIntentForOrder(ctx, {
      orderId: pending.order._id,
      orderNumber: pending.order.orderNumber,
      accessToken: pending.order.accessToken,
      customerEmail: pending.order.customerEmail,
      idempotencyKey: pending.order.idempotencyKey,
      priced,
      existingPaymentIntentId,
      rollbackOnFailure: false,
    });
  },
});

export const createCheckoutSession = action({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
    successUrl: v.optional(v.string()),
    cancelUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createCheckoutSessionHandler(ctx, args);
  },
});

export const resumeCheckoutSession = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    successUrl: v.optional(v.string()),
    cancelUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    url: string;
    orderId: Id<"orders">;
    orderNumber: string;
    accessToken?: string;
    alreadyPaid?: boolean;
  }> => {
    const pending = await ctx.runQuery(internal.orders.getPendingStripeOrderForResume, {
      orderNumber: args.orderNumber,
      customerEmail: args.customerEmail,
      accessToken: args.accessToken,
    });
    if (!pending) {
      throw new ConvexError("We couldn't find a pending payment for this order.");
    }
    if (!pending.resumable) {
      if (pending.order.paymentStatus === "paid") {
        return {
          url: "",
          orderId: pending.order._id,
          orderNumber: pending.order.orderNumber,
          accessToken: pending.order.accessToken,
          alreadyPaid: true,
        };
      }
      throw new ConvexError("This order is no longer awaiting payment.");
    }

    const priced = await ctx.runQuery(internal.orders.getPricedSnapshotForOrder, {
      orderId: pending.order._id,
    });

    return await createStripeSessionForOrder(ctx, {
      orderId: pending.order._id,
      orderNumber: pending.order.orderNumber,
      accessToken: pending.order.accessToken,
      customerEmail: pending.order.customerEmail,
      idempotencyKey: pending.order.idempotencyKey,
      priced,
      existingSessionId: pending.order.stripeSessionId,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      rollbackOnFailure: false,
    });
  },
});

export const startPaymentFromQr = action({
  args: {
    tokenOrUrl: v.string(),
    platform: v.union(v.literal("mobile"), v.literal("web")),
  },
  returns: v.object({
    orderNumber: v.string(),
    amount: v.number(),
    currency: v.string(),
    alreadyPaid: v.optional(v.boolean()),
    clientSecret: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    orderNumber: string;
    amount: number;
    currency: string;
    alreadyPaid?: boolean;
    clientSecret?: string;
    checkoutUrl?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
  }> => {
    const parsed = parseQrPayload(args.tokenOrUrl);
    const token = parsed?.token ?? args.tokenOrUrl.trim();
    if (!isQrTokenShape(token)) {
      throw new ConvexError("This QR code is not valid.");
    }

    const lookup = (await ctx.runQuery(internal.qr.lookupPaymentOrderFromQr, {
      token,
    })) as {
      code: string;
      order?: {
        _id: Id<"orders">;
        orderNumber: string;
        total: number;
        currency: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        customerAddress: string;
        paymentMethod: "cod" | "stripe";
        paymentStatus: "pending" | "paid" | "failed" | "refunded";
        status: string;
        idempotencyKey: string;
        stripePaymentIntentId?: string;
        stripeSessionId?: string;
      };
    };
    if (lookup.code === "already_paid" && "order" in lookup && lookup.order) {
      return {
        orderNumber: lookup.order.orderNumber,
        amount: lookup.order.total,
        currency: lookup.order.currency,
        alreadyPaid: true,
      };
    }
    if (lookup.code !== "ok" || !("order" in lookup) || !lookup.order) {
      const message =
        lookup.code === "expired"
          ? "This payment QR code has expired."
          : lookup.code === "cancelled"
            ? "This order is no longer available for payment."
            : "This payment link is no longer available.";
      throw new ConvexError(message);
    }

    const order = lookup.order;
    let priced: {
      currency: string;
      total: number;
      shipping: number;
      deliveryCharge?: number;
      deliveryMethod?: string;
      deliveryMethodLabel?: string;
      tax?: number;
      items: PricedLineItem[];
    } = await ctx.runQuery(internal.orders.getPricedSnapshotForOrder, {
      orderId: order._id,
    });
    let existingPaymentIntentId: string | undefined = order.stripePaymentIntentId;
    let existingSessionId: string | undefined = order.stripeSessionId;

    const pending = isPendingStripeOrder({
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status as
        | "pending"
        | "processing"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "failed"
        | "expired",
    });

    if (!pending) {
      const revived = await ctx.runMutation(internal.orders.reviveStripeOrderForRetry, {
        orderId: order._id,
      });
      if (revived.alreadyPaid) {
        return {
          orderNumber: order.orderNumber,
          amount: order.total,
          currency: order.currency,
          alreadyPaid: true,
        };
      }
      if (!revived.priced) {
        throw new ConvexError("This payment link is no longer available.");
      }
      priced = revived.priced;
      existingPaymentIntentId = revived.stripePaymentIntentId;
      existingSessionId = undefined;
    }

    // Payment is not confirmed here — Stripe webhook records payment_succeeded.
    await ctx.runMutation(internal.qr.recordScanInternal, {
      token,
      source: args.platform === "mobile" ? "mobile" : "web",
      platform: args.platform,
      success: true,
      event: "payment_initiated",
    });

    const customer = {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
    };

    if (args.platform === "mobile") {
      const result = await createPaymentIntentForOrder(ctx, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        idempotencyKey: order.idempotencyKey,
        priced,
        existingPaymentIntentId,
        rollbackOnFailure: false,
      });
      return {
        orderNumber: result.orderNumber,
        amount: priced.total,
        currency: priced.currency,
        alreadyPaid: result.alreadyPaid,
        clientSecret: result.clientSecret || undefined,
        ...customer,
      };
    }

    const appUrl = getSiteUrl().replace(/\/$/, "");
    const session = await createStripeSessionForOrder(ctx, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      idempotencyKey: order.idempotencyKey,
      priced,
      existingSessionId,
      successUrl: `${appUrl}/checkout/success`,
      cancelUrl: `${appUrl}/qr/payment/${encodeURIComponent(token)}`,
      rollbackOnFailure: false,
    });
    return {
      orderNumber: session.orderNumber,
      amount: priced.total,
      currency: priced.currency,
      checkoutUrl: session.url,
      ...customer,
    };
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
    accessToken: v.optional(v.string()),
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
    accessToken?: string;
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

async function createMobilePaymentIntentHandler(
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
): Promise<{
  clientSecret: string;
  orderId: Id<"orders">;
  orderNumber: string;
  accessToken?: string;
  alreadyPaid?: boolean;
}> {
  const pending = await ctx.runMutation(
    internal.orders.createPendingStripeOrder,
    args
  );

  return await createPaymentIntentForOrder(ctx, {
    orderId: pending.orderId,
    orderNumber: pending.orderNumber,
    accessToken: pending.accessToken,
    customerEmail: args.customer.email,
    idempotencyKey: args.idempotencyKey,
    priced: pending.priced,
    existingPaymentIntentId: pending.stripePaymentIntentId,
    rollbackOnFailure: !pending.reused,
  });
}

async function createPaymentIntentForOrder(
  ctx: ActionCtx,
  args: {
    orderId: Id<"orders">;
    orderNumber: string;
    accessToken?: string;
    customerEmail: string;
    idempotencyKey: string;
    priced: {
      currency: string;
      total: number;
    };
    existingPaymentIntentId?: string;
    rollbackOnFailure: boolean;
  }
): Promise<{
  clientSecret: string;
  orderId: Id<"orders">;
  orderNumber: string;
  accessToken?: string;
  alreadyPaid?: boolean;
}> {
  const stripe = getStripe();
  const expectedCents = Math.round(args.priced.total * 100);

  if (args.existingPaymentIntentId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(
        args.existingPaymentIntentId
      );
      if (existing.status === "succeeded") {
        return {
          clientSecret: "",
          orderId: args.orderId,
          orderNumber: args.orderNumber,
          accessToken: args.accessToken,
          alreadyPaid: true,
        };
      }
      if (
        isRetryablePaymentIntentStatus(existing.status) &&
        existing.client_secret &&
        existing.amount === expectedCents
      ) {
        return {
          clientSecret: existing.client_secret,
          orderId: args.orderId,
          orderNumber: args.orderNumber,
          accessToken: args.accessToken,
        };
      }
    } catch {
      // Create a replacement payment intent below.
    }
  }

  const stripeIdempotencyKey = args.existingPaymentIntentId
    ? `mobile-pi:${args.idempotencyKey}:replace:${args.existingPaymentIntentId}`
    : `mobile-pi:${args.idempotencyKey}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: expectedCents,
        currency: args.priced.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: args.customerEmail.trim(),
        metadata: {
          orderId: args.orderId,
          orderNumber: args.orderNumber,
          idempotencyKey: args.idempotencyKey,
        },
      },
      { idempotencyKey: stripeIdempotencyKey }
    );

    if (!paymentIntent.client_secret) {
      throw new ConvexError("Failed to create Stripe payment intent");
    }

    await ctx.runMutation(internal.orders.attachPaymentIntent, {
      orderId: args.orderId,
      stripePaymentIntentId: paymentIntent.id,
      replaceExisting: Boolean(args.existingPaymentIntentId),
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: args.orderId,
      orderNumber: args.orderNumber,
      accessToken: args.accessToken,
    };
  } catch (error) {
    if (args.rollbackOnFailure) {
      await ctx.runMutation(internal.orders.rollbackPendingStripeOrder, {
        orderId: args.orderId,
      });
    }
    throw error;
  }
}

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
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<{
    url: string;
    orderId: Id<"orders">;
    orderNumber: string;
    accessToken?: string;
  }> {
    const { successUrl, cancelUrl, ...orderArgs } = args;
    const pending = await ctx.runMutation(
      internal.orders.createPendingStripeOrder,
      orderArgs
    );

    return await createStripeSessionForOrder(ctx, {
      orderId: pending.orderId,
      orderNumber: pending.orderNumber,
      accessToken: pending.accessToken,
      customerEmail: args.customer.email,
      idempotencyKey: args.idempotencyKey,
      priced: pending.priced,
      existingSessionId: pending.stripeSessionId,
      successUrl,
      cancelUrl,
      rollbackOnFailure: !pending.reused,
    });
}

async function createStripeSessionForOrder(
  ctx: ActionCtx,
  args: {
    orderId: Id<"orders">;
    orderNumber: string;
    accessToken?: string;
    customerEmail: string;
    idempotencyKey: string;
    priced: {
      currency: string;
      shipping: number;
      deliveryCharge?: number;
      deliveryMethod?: string;
      deliveryMethodLabel?: string;
      tax?: number;
      total: number;
      items: PricedLineItem[];
    };
    existingSessionId?: string;
    successUrl?: string;
    cancelUrl?: string;
    rollbackOnFailure: boolean;
  }
): Promise<{
  url: string;
  orderId: Id<"orders">;
  orderNumber: string;
  accessToken?: string;
}> {
    const stripe = getStripe();
    const appUrl = getSiteUrl();

    if (args.existingSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(args.existingSessionId);
        if (existing.status === "open" && existing.url) {
          return {
            url: existing.url,
            orderId: args.orderId,
            orderNumber: args.orderNumber,
            accessToken: args.accessToken,
          };
        }
      } catch {
        // Create a replacement session below.
      }
    }

    const lineItems = buildStripeLineItems(args.priced);
    assertStripeAmountMatchesOrder(lineItems, args.priced.total);

    const successBase =
      args.successUrl ?? `${appUrl}/checkout/success`;
    const cancelBase = args.cancelUrl ?? `${appUrl}/checkout/cancel`;

    const successUrlResolved = appendCheckoutRedirectParams(successBase, {
      orderNumber: args.orderNumber,
      accessToken: args.accessToken ?? "",
      session_id: "{CHECKOUT_SESSION_ID}",
    });
    const cancelUrlResolved = appendCheckoutRedirectParams(cancelBase, {
      orderNumber: args.orderNumber,
      accessToken: args.accessToken ?? "",
    });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        allow_promotion_codes: false,
        customer_email: args.customerEmail.trim(),
        line_items: lineItems,
        metadata: {
          orderId: args.orderId,
          orderNumber: args.orderNumber,
          idempotencyKey: args.idempotencyKey,
        },
        success_url: successUrlResolved,
        cancel_url: cancelUrlResolved,
      });

      if (!session.url) {
        throw new ConvexError("Failed to create Stripe checkout session");
      }

      await ctx.runMutation(internal.orders.attachStripeSession, {
        orderId: args.orderId,
        stripeSessionId: session.id,
        replaceExisting: Boolean(args.existingSessionId),
      });

      return {
        url: session.url,
        orderId: args.orderId,
        orderNumber: args.orderNumber,
        accessToken: args.accessToken,
      };
    } catch (error) {
      if (args.rollbackOnFailure) {
        await ctx.runMutation(internal.orders.rollbackPendingStripeOrder, {
          orderId: args.orderId,
        });
      }
      throw error;
    }
}

const CANCELABLE_PAYMENT_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
]);

export const cancelOpenStripePayment = internalAction({
  args: {
    paymentIntentId: v.optional(v.string()),
    checkoutSessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    if (args.checkoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(args.checkoutSessionId);
        if (session.status === "open") {
          await stripe.checkout.sessions.expire(args.checkoutSessionId);
        }
      } catch (error) {
        console.warn("[stripe] failed to expire checkout session", error);
      }
    }

    if (args.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(args.paymentIntentId);
        if (CANCELABLE_PAYMENT_INTENT_STATUSES.has(paymentIntent.status)) {
          await stripe.paymentIntents.cancel(args.paymentIntentId);
        }
      } catch (error) {
        console.warn("[stripe] failed to cancel payment intent", error);
      }
    }

    return null;
  },
});

export const refundUnfulfillablePayment = internalAction({
  args: {
    orderId: v.id("orders"),
    paymentIntentId: v.string(),
    reason: v.string(),
    amountCents: v.optional(v.number()),
    feePercent: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const refundAmountCents =
      args.amountCents != null && Number.isFinite(args.amountCents)
        ? Math.max(0, Math.round(args.amountCents))
        : undefined;

    const attemptId = await ctx.runMutation(
      internal.stripeRefundAttempts.enqueueStripeRefundAttempt,
      {
        orderId: args.orderId,
        paymentIntentId: args.paymentIntentId,
        reason: args.reason,
        amountCents: refundAmountCents,
        feePercent: args.feePercent,
      }
    );
    const claimed = await ctx.runMutation(
      internal.stripeRefundAttempts.claimStripeRefundAttempt,
      { attemptId }
    );
    if (!claimed) return null;

    try {
      if (claimed.stripeRefundedAt == null) {
        let stripeRefundId: string | undefined;
        let refunded = claimed.amountCents === 0;
        if (claimed.amountCents !== 0) {
          const stripe = getStripe();
          let stripeRefund: Stripe.Refund | undefined;
          if (claimed.stripeRefundId) {
            stripeRefund = await stripe.refunds.retrieve(claimed.stripeRefundId);
          }
          // A previous worker may have stopped after Stripe accepted the refund.
          // Metadata recovery also works after Stripe's idempotency cache expires.
          if (!stripeRefund && claimed.leaseVersion > 1) {
            const refunds = await stripe.refunds.list({
              payment_intent: claimed.paymentIntentId,
              limit: 100,
            });
            const existing = refunds.data.find(
              (refund) => refund.metadata?.refundAttemptKey === claimed.idempotencyKey
            );
            if (existing) {
              stripeRefund = existing;
            } else if (refunds.has_more) {
              throw new Error("Refund history needs reconciliation before another refund can be created.");
            }
          }
          if (!stripeRefund) {
            try {
              stripeRefund = await stripe.refunds.create(
                {
                  payment_intent: claimed.paymentIntentId,
                  ...(claimed.amountCents != null ? { amount: claimed.amountCents } : {}),
                  metadata: {
                    orderId: claimed.orderId,
                    reason: claimed.reason,
                    refundAttemptKey: claimed.idempotencyKey,
                    ...(claimed.feePercent != null ? { feePercent: String(claimed.feePercent) } : {}),
                  },
                },
                { idempotencyKey: claimed.idempotencyKey }
              );
            } catch (error) {
              if (shouldRetryAutomaticStripeRefund(error)) throw error;
              // Stripe confirms the charge was already fully refunded.
              refunded = true;
            }
          }
          if (stripeRefund) {
            stripeRefundId = stripeRefund.id;
            refunded = stripeRefund.status === "succeeded";
          }
        }
        const recorded = await ctx.runMutation(
          internal.stripeRefundAttempts.recordStripeRefundResult,
          { attemptId, leaseVersion: claimed.leaseVersion, stripeRefundId, refunded }
        );
        if (!recorded) return null;
        if (!refunded) {
          throw new Error("Stripe refund has not completed. Its status will be checked again.");
        }
      }
      await ctx.runMutation(internal.stripeRefundAttempts.completeStripeRefundAttempt, {
        attemptId,
        leaseVersion: claimed.leaseVersion,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const deferred = await ctx.runMutation(internal.stripeRefundAttempts.deferStripeRefundAttempt, {
        attemptId,
        leaseVersion: claimed.leaseVersion,
        message,
      });
      if (!deferred) return null;
      try {
        await ctx.runMutation(internal.orders.recordStripeRefundFailure, {
          orderId: claimed.orderId,
          paymentIntentId: claimed.paymentIntentId,
          message,
        });
      } catch (logError) {
        console.error(
          `[stripe] could not record refund failure orderId=${claimed.orderId}`,
          logError
        );
      }
      console.error(
        `[stripe] automatic refund failed orderId=${claimed.orderId} pi=${claimed.paymentIntentId}`,
        error
      );
    }
    return null;
  },
});

export const retryDueStripeRefunds = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const due = await ctx.runQuery(internal.stripeRefundAttempts.listDueStripeRefunds, {
      now: Date.now(),
    });
    for (const attemptId of due) {
      try {
        const attempt = await ctx.runQuery(internal.stripeRefundAttempts.getStripeRefundAttempt, {
          attemptId,
        });
        if (!attempt) continue;
        await ctx.runAction(internal.stripe.refundUnfulfillablePayment, attempt);
      } catch (error) {
        // One unavailable worker must not prevent other due refunds from running.
        console.error(`[stripe] refund worker failed attemptId=${attemptId}`, error);
      }
    }
    return null;
  },
});
