import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import {
  getMergedTransactionLogs,
  insertOrderStatusLog,
  insertPaymentLog,
} from "./lib/orderLogs";
import { backfillOrderLogsIfEmpty } from "./lib/backfillOrderLogs";
import {
  ADMIN_ORDER_TAB_STATUSES,
  orderSortValidator,
  orderStatusValidator,
  paymentMethodValidator,
  paymentStatusValidator,
  type OrderStatus,
} from "./lib/orderValidators";
import type { Doc } from "./_generated/dataModel";
import {
  buildOrderStatusEventKey,
  buildPaymentStatusEventKey,
  resolveOrderStatusTransitionEvent,
} from "./lib/orderNotificationLogic";
import {
  applyOrderRefunded,
  executeOrderCancellation,
} from "./lib/orderLifecycle";
import {
  assertAdminRefundModeAllowed,
  resolveAdminRefundPlan,
  resolveAdminStatusAction,
} from "./lib/adminOrderTransitions";

const TRACKING_NOT_FOUND = "We couldn't find any orders matching your details.";

function filterOrders(
  orders: Doc<"orders">[],
  args: {
    status?: OrderStatus;
    orderNumber?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    paymentStatus?: Doc<"orders">["paymentStatus"];
    paymentMethod?: Doc<"orders">["paymentMethod"];
    dateFrom?: number;
    dateTo?: number;
    search?: string;
  }
) {
  let filtered = orders;

  if (args.status) {
    filtered = filtered.filter((order) => order.status === args.status);
  }

  if (args.orderNumber?.trim()) {
    const term = args.orderNumber.trim().toLowerCase();
    filtered = filtered.filter((order) =>
      order.orderNumber.toLowerCase().includes(term)
    );
  }

  if (args.customerName?.trim()) {
    const term = args.customerName.trim().toLowerCase();
    filtered = filtered.filter((order) =>
      order.customerName.toLowerCase().includes(term)
    );
  }

  if (args.customerEmail?.trim()) {
    const term = args.customerEmail.trim().toLowerCase();
    filtered = filtered.filter((order) =>
      order.customerEmail.toLowerCase().includes(term)
    );
  }

  if (args.customerPhone?.trim()) {
    const term = args.customerPhone.replace(/\D/g, "");
    filtered = filtered.filter((order) =>
      order.customerPhone.replace(/\D/g, "").includes(term)
    );
  }

  if (args.paymentStatus) {
    filtered = filtered.filter(
      (order) => order.paymentStatus === args.paymentStatus
    );
  }

  if (args.paymentMethod) {
    filtered = filtered.filter(
      (order) => order.paymentMethod === args.paymentMethod
    );
  }

  if (args.dateFrom !== undefined) {
    filtered = filtered.filter((order) => order.createdAt >= args.dateFrom!);
  }

  if (args.dateTo !== undefined) {
    filtered = filtered.filter((order) => order.createdAt <= args.dateTo!);
  }

  if (args.search?.trim()) {
    const term = args.search.trim().toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term) ||
        order.customerPhone.replace(/\D/g, "").includes(term.replace(/\D/g, ""))
    );
  }

  return filtered;
}

function sortOrders(
  orders: Doc<"orders">[],
  sort: "newest" | "oldest" | "highest_amount" | "lowest_amount"
) {
  const sorted = [...orders];
  switch (sort) {
    case "oldest":
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "highest_amount":
      sorted.sort((a, b) => b.total - a.total);
      break;
    case "lowest_amount":
      sorted.sort((a, b) => a.total - b.total);
      break;
    case "newest":
    default:
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }
  return sorted;
}

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("orders").collect();
    const counts: Record<string, number> = { all: orders.length };
    for (const status of ADMIN_ORDER_TAB_STATUSES) {
      counts[status] = orders.filter((order) => order.status === status).length;
    }
    return counts;
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(orderStatusValidator),
    search: v.optional(v.string()),
    orderNumber: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    paymentStatus: v.optional(paymentStatusValidator),
    paymentMethod: v.optional(paymentMethodValidator),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    sort: v.optional(orderSortValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("orders").collect();
    const filtered = filterOrders(orders, args);
    const sorted = sortOrders(filtered, args.sort ?? "newest");
    const { page, isDone, continueCursor } = paginateArray(
      sorted,
      args.paginationOpts
    );
    return { page, isDone, continueCursor };
  },
});

export const getDetail = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .collect();

    const promotions = await ctx.db
      .query("orderPromotions")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .collect();

    const transactionLogs = await getMergedTransactionLogs(ctx, args.orderId);

    return { order, items, promotions, transactionLogs };
  },
});

export const backfillTransactionLogs = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    return await backfillOrderLogsIfEmpty(ctx, args.orderId);
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
    refundMode: v.optional(
      v.union(v.literal("stripe_original"), v.literal("cod_manual"))
    ),
  },
  returns: v.object({
    success: v.boolean(),
    refundPending: v.optional(v.boolean()),
    alreadyCancelled: v.optional(v.boolean()),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    const action = resolveAdminStatusAction(order.status, args.status);
    if (action.type === "noop") {
      return { success: true };
    }
    if (action.type === "reject") {
      throw new ConvexError(action.message);
    }
    if (action.type === "cancel") {
      const result = await executeOrderCancellation(ctx, {
        order,
        actor: {
          actorType: "admin",
          actorUserId: admin._id,
          actorName: admin.name || admin.email,
        },
        description: `Order cancelled by admin`,
      });
      return {
        success: true,
        alreadyCancelled: result.alreadyCancelled,
        refundPending: result.refundPending,
        message: result.refundPending
          ? "Order cancelled. A Stripe refund to the original payment method is being processed."
          : "Order cancelled and held inventory was released.",
      };
    }
    if (action.type === "refund") {
      return await initiateAdminRefund(ctx, {
        order,
        admin,
        mode: args.refundMode,
      });
    }

    const now = Date.now();
    const previousStatus = order.status;

    await ctx.db.patch(args.orderId, {
      status: action.nextStatus,
      updatedAt: now,
    });

    await insertOrderStatusLog(ctx, {
      orderId: args.orderId,
      event: "order_status_updated",
      description: `Order status updated from ${previousStatus} to ${action.nextStatus}`,
      previousStatus,
      newStatus: action.nextStatus,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name || admin.email,
      createdAt: now,
    });

    const statusEvent = resolveOrderStatusTransitionEvent(
      previousStatus,
      action.nextStatus
    );
    if (statusEvent) {
      await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
        orderId: args.orderId,
        event: statusEvent,
        eventKey: buildOrderStatusEventKey(args.orderId, action.nextStatus),
      });
    }

    if (action.nextStatus === "delivered" && previousStatus !== "delivered") {
      const delayDays = await ctx.runQuery(
        internal.settings.getReviewCallAutoDelayDays,
        {}
      );
      const enabledRow = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "review_call_auto_enabled"))
        .unique();
      const autoEnabled =
        (enabledRow?.value ?? "false").trim().toLowerCase() === "true";

      if (autoEnabled) {
        await ctx.scheduler.runAfter(
          delayDays * 24 * 60 * 60 * 1000,
          internal.reviewCalls.scheduleAutoReviewCall,
          { orderId: args.orderId }
        );
      }
    }

    return { success: true };
  },
});

export const cancelOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.object({
    success: v.boolean(),
    alreadyCancelled: v.optional(v.boolean()),
    refundPending: v.optional(v.boolean()),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    const result = await executeOrderCancellation(ctx, {
      order,
      actor: {
        actorType: "admin",
        actorUserId: admin._id,
        actorName: admin.name || admin.email,
      },
      description: "Order cancelled by admin",
    });
    return result;
  },
});

export const initiateRefund = mutation({
  args: {
    orderId: v.id("orders"),
    mode: v.union(v.literal("stripe_original"), v.literal("cod_manual")),
  },
  returns: v.object({
    success: v.boolean(),
    refundPending: v.optional(v.boolean()),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    return await initiateAdminRefund(ctx, { order, admin, mode: args.mode });
  },
});

async function initiateAdminRefund(
  ctx: import("./_generated/server").MutationCtx,
  args: {
    order: Doc<"orders">;
    admin: { _id: string; name: string; email: string };
    mode?: "stripe_original" | "cod_manual";
  }
): Promise<{
  success: true;
  refundPending?: boolean;
  message?: string;
}> {
  const plan = resolveAdminRefundPlan(args.order);
  const mode = args.mode ?? (plan.kind === "cod_paid" ? "cod_manual" : "stripe_original");
  const allowed = assertAdminRefundModeAllowed(plan, mode);
  if (!allowed.ok) {
    throw new ConvexError(allowed.message);
  }

  if (mode === "stripe_original") {
    if (!args.order.stripePaymentIntentId) {
      throw new ConvexError(
        "Cannot create a Stripe refund because this order has no payment intent."
      );
    }
    await ctx.scheduler.runAfter(0, internal.stripe.refundUnfulfillablePayment, {
      orderId: args.order._id,
      paymentIntentId: args.order.stripePaymentIntentId,
      reason: "admin_refund",
    });
    return {
      success: true,
      refundPending: true,
      message:
        "Stripe refund started. Money returns to the customer's original card from web Checkout or mobile PaymentSheet.",
    };
  }

  await applyOrderRefunded(ctx, {
    order: args.order,
    actorType: "admin",
    actorUserId: args.admin._id,
    actorName: args.admin.name || args.admin.email,
    description: "Cash on delivery payment recorded as refunded by admin",
  });
  return {
    success: true,
    message: "COD refund recorded. Held inventory was released.",
  };
}

export const updateCodPaymentStatus = mutation({
  args: {
    orderId: v.id("orders"),
    paymentStatus: paymentStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    if (order.paymentMethod !== "cod") {
      throw new ConvexError(
        "Payment status can only be updated manually for Cash On Delivery orders"
      );
    }

    if (order.paymentStatus === args.paymentStatus) {
      return { success: true as const };
    }

    if (args.paymentStatus === "failed") {
      throw new ConvexError(
        "Do not mark unpaid COD as failed. Cancel the order to stop fulfillment and release inventory."
      );
    }

    if (args.paymentStatus === "refunded") {
      return await initiateAdminRefund(ctx, {
        order,
        admin,
        mode: "cod_manual",
      });
    }

    const now = Date.now();
    const previousPaymentStatus = order.paymentStatus;

    const patch: Partial<Doc<"orders">> = {
      paymentStatus: args.paymentStatus,
      updatedAt: now,
    };

    if (args.paymentStatus === "paid" && !order.paidAt) {
      patch.paidAt = now;
    }

    await ctx.db.patch(args.orderId, patch);

    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "payment_status_updated",
      description: `Payment status updated from ${previousPaymentStatus} to ${args.paymentStatus} by admin`,
      previousPaymentStatus,
      newPaymentStatus: args.paymentStatus,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name || admin.email,
      amount: order.total,
      currency: order.currency,
      createdAt: now,
    });

    if (args.paymentStatus === "paid") {
      await ctx.scheduler.runAfter(0, internal.subscriberInterests.recomputeForEmail, {
        email: order.customerEmail,
      });

      if (previousPaymentStatus !== "paid") {
        await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
          orderId: args.orderId,
          event: "payment.received",
          eventKey: buildPaymentStatusEventKey(args.orderId, "paid"),
        });
      }
    }

    return { success: true as const };
  },
});

export const sendReviewInvitation = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    if (order.status !== "delivered") {
      throw new ConvexError(
        "Review invitations can only be sent for delivered orders"
      );
    }

    await ctx.scheduler.runAfter(0, internal.email.sendReviewInvitation, {
      orderId: args.orderId,
    });

    return { success: true as const };
  },
});

export { TRACKING_NOT_FOUND };
