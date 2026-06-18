import { v, ConvexError } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  cartLineValidator,
  customerInfoValidator,
  validateCartLines,
  validateCustomerFields,
} from "./lib/checkoutValidation";
import { generateOrderNumber } from "./lib/orderNumbers";
import { priceCheckoutCart } from "./lib/checkoutPricing";
import type { PricedLineItem } from "./lib/orderPricing";
import {
  decrementStock,
  getOrderStockLines,
  restoreStock,
} from "./lib/inventory";
import { insertOrderStatusLog, insertPaymentLog, getOrderStatusLogsForPublic } from "./lib/orderLogs";
import { orderStatusValidator } from "./lib/orderValidators";
import { checkAndIncrementRateLimit } from "./lib/rateLimit";
import { normalizeEmail, phonesMatch } from "./lib/publicOrderDto";

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function assertUniqueIdempotencyKey(
  ctx: MutationCtx,
  idempotencyKey: string
) {
  const existing = await ctx.db
    .query("orders")
    .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
    .unique();
  if (existing) {
    throw new ConvexError("This checkout was already submitted. Please refresh and try again.");
  }
}

async function insertOrderLineItems(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  items: PricedLineItem[]
) {
  for (const item of items) {
    await ctx.db.insert("orderItems", {
      orderId,
      productId: item.productId,
      productName: item.productName,
      color: item.color,
      sku: item.sku,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.finalUnitPrice,
      lineTotal: item.lineTotal,
      imageUrl: item.imageUrl,
      originalUnitPrice: item.originalUnitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      lineDiscountTotal: item.lineDiscountTotal,
      finalUnitPrice: item.finalUnitPrice,
      shippingCharge: item.shippingCharge,
      lineShippingTotal: item.lineShippingTotal,
      isPromotionGift: item.isPromotionGift,
      promotionId: item.promotionId,
    });
  }
}

async function insertOrderPromotions(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  summaries: Array<{
    promotionId: Id<"productPromotions">;
    promotionType: "bogo" | "buy_x_get_y" | "free_gift" | "cross_product";
    promotionName: string;
    promotionDescription?: string;
    buyProductId: Id<"products">;
    getProductId?: Id<"products">;
    freeQuantity: number;
    savingsAmount: number;
  }>,
  appliedAt: number
) {
  for (const summary of summaries) {
    await ctx.db.insert("orderPromotions", {
      orderId,
      promotionId: summary.promotionId,
      promotionType: summary.promotionType,
      promotionName: summary.promotionName,
      promotionDescription: summary.promotionDescription,
      buyProductId: summary.buyProductId,
      getProductId: summary.getProductId,
      freeQuantity: summary.freeQuantity,
      savingsAmount: summary.savingsAmount,
      appliedAt,
    });
  }
}

async function logOrderCreated(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  paymentMethod: "cod" | "stripe",
  now: number
) {
  await insertOrderStatusLog(ctx, {
    orderId,
    event: "order_created",
    description: "Order created",
    newStatus: "pending",
    actorType: "system",
    createdAt: now,
  });
  await insertPaymentLog(ctx, {
    orderId,
    event: "payment_pending",
    description:
      paymentMethod === "cod"
        ? "Cash on delivery payment pending"
        : "Stripe payment pending",
    newPaymentStatus: "pending",
    actorType: "system",
    createdAt: now,
  });
}

export const getOrderForEmail = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .collect();

    return { order, items };
  },
});

export const validateCartForCheckout = query({
  args: {
    lines: v.array(cartLineValidator),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    validateCartLines(args.lines);
    try {
      const priced = await priceCheckoutCart(ctx, args.lines, args.now);
      return { status: "ok" as const, ...priced };
    } catch (error) {
      return {
        status: "error" as const,
        message:
          error instanceof Error ? error.message : "Unable to validate your cart",
      };
    }
  },
});

export const getOrderByNumber = query({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
    if (!order) return null;

    if (
      args.customerEmail &&
      order.customerEmail.toLowerCase() !== args.customerEmail.trim().toLowerCase()
    ) {
      return null;
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();

    const promotions = await ctx.db
      .query("orderPromotions")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();

    return { order, items, promotions };
  },
});

export const getOrderByStripeSession = internalQuery({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId)
      )
      .unique();
  },
});

export const getOrderByPaymentIntent = internalQuery({
  args: { stripePaymentIntentId: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("orders").collect();
    return (
      orders.find(
        (order) => order.stripePaymentIntentId === args.stripePaymentIntentId
      ) ?? null
    );
  },
});

/** Validate an untrusted ID string is a real orders document (e.g. Stripe metadata). */
export const tryGetOrderByIdString = internalQuery({
  args: { id: v.optional(v.string()) },
  returns: v.union(v.id("orders"), v.null()),
  handler: async (ctx, args) => {
    const raw = args.id?.trim();
    if (!raw) return null;
    try {
      const order = await ctx.db.get(raw as Id<"orders">);
      if (!order || !("orderNumber" in order)) return null;
      return order._id;
    } catch {
      return null;
    }
  },
});

export const createCashOrder = mutation({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await createCashOrderHandler(ctx, args);
  },
});

export const createCashOrderInternal = internalMutation({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await createCashOrderHandler(ctx, args);
  },
});

async function createCashOrderHandler(
  ctx: MutationCtx,
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
  }
) {
    await assertUniqueIdempotencyKey(ctx, args.idempotencyKey);
    validateCartLines(args.lines);
    validateCustomerFields(args.customer);

    const now = Date.now();
    const priced = await priceCheckoutCart(ctx, args.lines, now);
    await decrementStock(
      ctx,
      priced.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    const orderId = await ctx.db.insert("orders", {
      orderNumber: generateOrderNumber(now),
      customerEmail: args.customer.email.trim().toLowerCase(),
      customerName: args.customer.fullName.trim(),
      customerPhone: args.customer.phone.trim(),
      customerAddress: args.customer.address.trim(),
      customerNotes: args.customer.notes?.trim() || undefined,
      termsAccepted: args.customer.termsAccepted,
      privacyAccepted: args.customer.privacyAccepted,
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      subtotal: priced.subtotal,
      discountTotal: priced.discountTotal,
      tax: priced.tax,
      shipping: priced.shipping,
      total: priced.total,
      currency: priced.currency,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    await insertOrderLineItems(ctx, orderId, priced.items);
    await insertOrderPromotions(ctx, orderId, priced.promotionSummaries, now);
    if (priced.promotionSummaries.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.productPromotions.incrementOrderAnalytics,
        {
          summaries: priced.promotionSummaries.map((s) => ({
            promotionId: s.promotionId,
            freeQuantity: s.freeQuantity,
            savingsAmount: s.savingsAmount,
            orderRevenue: priced.subtotal,
          })),
        }
      );
    }
    await logOrderCreated(ctx, orderId, "cod", now);

    await ctx.scheduler.runAfter(0, internal.notifications.sendOrderConfirmationNotifications, {
      orderId,
    });

    return {
      orderId,
      orderNumber: (await ctx.db.get(orderId))!.orderNumber,
    };
}

export const getOrderTotalsInternal = internalQuery({
  args: { orderId: v.id("orders") },
  returns: v.object({
    total: v.number(),
    currency: v.string(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError("Order not found");
    }
    return { total: order.total, currency: order.currency };
  },
});

export const createPendingStripeOrder = internalMutation({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    await assertUniqueIdempotencyKey(ctx, args.idempotencyKey);
    validateCartLines(args.lines);
    validateCustomerFields(args.customer);

    const now = Date.now();
    const priced = await priceCheckoutCart(ctx, args.lines, now);
    await decrementStock(
      ctx,
      priced.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    const orderId = await ctx.db.insert("orders", {
      orderNumber: generateOrderNumber(now),
      customerEmail: args.customer.email.trim().toLowerCase(),
      customerName: args.customer.fullName.trim(),
      customerPhone: args.customer.phone.trim(),
      customerAddress: args.customer.address.trim(),
      customerNotes: args.customer.notes?.trim() || undefined,
      termsAccepted: args.customer.termsAccepted,
      privacyAccepted: args.customer.privacyAccepted,
      status: "pending",
      paymentMethod: "stripe",
      paymentStatus: "pending",
      subtotal: priced.subtotal,
      discountTotal: priced.discountTotal,
      tax: priced.tax,
      shipping: priced.shipping,
      total: priced.total,
      currency: priced.currency,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    await insertOrderLineItems(ctx, orderId, priced.items);
    await insertOrderPromotions(ctx, orderId, priced.promotionSummaries, now);
    if (priced.promotionSummaries.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.productPromotions.incrementOrderAnalytics,
        {
          summaries: priced.promotionSummaries.map((s) => ({
            promotionId: s.promotionId,
            freeQuantity: s.freeQuantity,
            savingsAmount: s.savingsAmount,
            orderRevenue: priced.subtotal,
          })),
        }
      );
    }
    await logOrderCreated(ctx, orderId, "stripe", now);

    const order = await ctx.db.get(orderId);
    return {
      orderId,
      orderNumber: order!.orderNumber,
      priced,
    };
  },
});

export const attachStripeSession = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    if (order.stripeSessionId) {
      throw new ConvexError("Stripe session already exists for this order");
    }
    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
      updatedAt: now,
    });
    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "checkout_session_created",
      description: "Stripe checkout session created",
      previousPaymentStatus: order.paymentStatus,
      newPaymentStatus: order.paymentStatus,
      actorType: "system",
      stripeSessionId: args.stripeSessionId,
      createdAt: now,
    });
  },
});

export const markOrderPaid = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripePaymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    stripeTransactionId: v.optional(v.string()),
    paidTotalCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    if (order.paymentStatus === "paid") {
      return { alreadyPaid: true as const };
    }

    const now = Date.now();
    const paidTotal =
      args.paidTotalCents !== undefined
        ? Math.round(args.paidTotalCents) / 100
        : order.total;

    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentStatus;

    await ctx.db.patch(args.orderId, {
      paymentStatus: "paid",
      status: "confirmed",
      total: paidTotal,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? order.stripePaymentIntentId,
      stripeSessionId: args.stripeSessionId ?? order.stripeSessionId,
      stripeTransactionId:
        args.stripeTransactionId ?? order.stripeTransactionId,
      paidAt: now,
      updatedAt: now,
    });

    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "payment_completed",
      description: "Payment completed via Stripe",
      previousPaymentStatus,
      newPaymentStatus: "paid",
      actorType: "webhook",
      stripeSessionId: args.stripeSessionId ?? order.stripeSessionId,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? order.stripePaymentIntentId,
      stripeTransactionId: args.stripeTransactionId,
      amount: paidTotal,
      currency: order.currency,
      createdAt: now,
    });

    if (previousStatus !== "confirmed") {
      await insertOrderStatusLog(ctx, {
        orderId: args.orderId,
        event: "order_status_updated",
        description: "Order status updated to confirmed after payment",
        previousStatus,
        newStatus: "confirmed",
        actorType: "system",
        createdAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.notifications.sendOrderConfirmationNotifications, {
      orderId: args.orderId,
    });

    await ctx.scheduler.runAfter(0, internal.subscriberInterests.recomputeForEmail, {
      email: order.customerEmail,
    });

    return { alreadyPaid: false as const };
  },
});

export const markOrderFailed = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
    restoreInventory: v.boolean(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    if (order.paymentStatus === "paid") {
      return { skipped: true as const };
    }

    if (args.restoreInventory && order.status === "pending") {
      const stockLines = await getOrderStockLines(ctx, args.orderId);
      await restoreStock(ctx, stockLines);
    }

    const now = Date.now();
    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentStatus;

    await ctx.db.patch(args.orderId, {
      status: args.status,
      paymentStatus: "failed",
      updatedAt: now,
    });

    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "payment_failed",
      description: "Payment failed or checkout expired",
      previousPaymentStatus,
      newPaymentStatus: "failed",
      actorType: "webhook",
      createdAt: now,
    });

    if (previousStatus !== args.status) {
      await insertOrderStatusLog(ctx, {
        orderId: args.orderId,
        event: "order_status_updated",
        description: `Order status updated to ${args.status}`,
        previousStatus,
        newStatus: args.status,
        actorType: "system",
        createdAt: now,
      });
    }

    return { skipped: false as const };
  },
});

export const markOrderRefunded = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripeTransactionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    const now = Date.now();
    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentStatus;

    await ctx.db.patch(args.orderId, {
      status: "refunded",
      paymentStatus: "refunded",
      stripeTransactionId:
        args.stripeTransactionId ?? order.stripeTransactionId,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? order.stripePaymentIntentId,
      updatedAt: now,
    });

    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "payment_refunded",
      description: "Payment refunded via Stripe",
      previousPaymentStatus,
      newPaymentStatus: "refunded",
      actorType: "webhook",
      stripeTransactionId: args.stripeTransactionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amount: order.total,
      currency: order.currency,
      createdAt: now,
    });

    if (previousStatus !== "refunded") {
      await insertOrderStatusLog(ctx, {
        orderId: args.orderId,
        event: "order_status_updated",
        description: "Order status updated to refunded",
        previousStatus,
        newStatus: "refunded",
        actorType: "system",
        createdAt: now,
      });
    }

    return { success: true as const };
  },
});

export const recordWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    orderId: v.optional(v.id("orders")),
    payloadSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) return { duplicate: true as const };

    await ctx.db.insert("stripeWebhookEvents", {
      eventId: args.eventId,
      type: args.type,
      orderId: args.orderId,
      payloadSummary: args.payloadSummary,
      processedAt: Date.now(),
    });
    return { duplicate: false as const };
  },
});

export const saveCustomerProfile = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("customerProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const profile = {
      email,
      fullName: args.fullName.trim(),
      phone: args.phone.trim(),
      address: args.address.trim(),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, profile);
      return existing._id;
    }

    return await ctx.db.insert("customerProfiles", profile);
  },
});

export const getCustomerProfileByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerProfiles")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.trim().toLowerCase())
      )
      .unique();
  },
});

export const applyTrackingRateLimit = internalMutation({
  args: { bucketKey: v.string() },
  handler: async (ctx, args) => {
    return await checkAndIncrementRateLimit(ctx, args.bucketKey);
  },
});

export const markReviewInvitationSent = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      reviewInvitationSentAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const lookupOrderForTracking = internalQuery({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();
    const promotions = await ctx.db
      .query("orderPromotions")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();
    const statusHistory = await getOrderStatusLogsForPublic(ctx, order._id);
    return { order, items, promotions, statusHistory };
  },
});

export const lookupOrdersByCustomer = internalQuery({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.email?.trim()) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_customer_email", (q) =>
          q.eq("customerEmail", normalizeEmail(args.email!))
        )
        .collect();
    } else if (args.phone?.trim()) {
      const allOrders = await ctx.db.query("orders").collect();
      orders = allOrders.filter((order) =>
        phonesMatch(order.customerPhone, args.phone!)
      );
    } else {
      return [];
    }

    orders.sort((a, b) => b.createdAt - a.createdAt);
    return orders.slice(0, 50);
  },
});

export const lookupPublicOrderDetail = internalQuery({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();
    const promotions = await ctx.db
      .query("orderPromotions")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();
    const statusHistory = await getOrderStatusLogsForPublic(ctx, order._id);
    return { order, items, promotions, statusHistory };
  },
});
