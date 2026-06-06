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
import { priceCartLines } from "./lib/orderPricing";
import {
  decrementStock,
  getOrderStockLines,
  restoreStock,
} from "./lib/inventory";

import type { MutationCtx } from "./_generated/server";

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("failed"),
  v.literal("expired")
);

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
  },
  handler: async (ctx, args) => {
    validateCartLines(args.lines);
    return await priceCartLines(ctx, args.lines);
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

    return { order, items };
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

export const createCashOrder = mutation({
  args: {
    lines: v.array(cartLineValidator),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    await assertUniqueIdempotencyKey(ctx, args.idempotencyKey);
    validateCartLines(args.lines);
    validateCustomerFields(args.customer);

    const priced = await priceCartLines(ctx, args.lines);
    await decrementStock(
      ctx,
      priced.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    const now = Date.now();
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
      tax: priced.tax,
      shipping: priced.shipping,
      total: priced.total,
      currency: priced.currency,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of priced.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl,
      });
    }

    await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
      orderId,
    });

    return {
      orderId,
      orderNumber: (await ctx.db.get(orderId))!.orderNumber,
    };
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

    const priced = await priceCartLines(ctx, args.lines);
    await decrementStock(
      ctx,
      priced.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    const now = Date.now();
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
      tax: priced.tax,
      shipping: priced.shipping,
      total: priced.total,
      currency: priced.currency,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of priced.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl,
      });
    }

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
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
      updatedAt: Date.now(),
    });
  },
});

export const markOrderPaid = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripePaymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
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

    await ctx.db.patch(args.orderId, {
      paymentStatus: "paid",
      status: "confirmed",
      total: paidTotal,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? order.stripePaymentIntentId,
      stripeSessionId: args.stripeSessionId ?? order.stripeSessionId,
      paidAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
      orderId: args.orderId,
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

    await ctx.db.patch(args.orderId, {
      status: args.status,
      paymentStatus: "failed",
      updatedAt: Date.now(),
    });

    return { skipped: false as const };
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
