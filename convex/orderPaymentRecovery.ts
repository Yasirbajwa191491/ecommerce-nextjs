import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { releaseHeldStockIfNeeded } from "./lib/inventory";
import { insertOrderStatusLog, insertPaymentLog } from "./lib/orderLogs";
import {
  buildNotificationEventKey,
  isPendingStripeOrder,
} from "./lib/orderNotificationLogic";
import {
  getStripePendingOrderExpiryMinutes,
  getStripePendingOrderReminderMinutes,
} from "./lib/settingsHelpers";
import { revokeQrsForOrderType } from "./lib/qrCodes";

export const schedulePendingStripeOrderRecovery = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reminderMinutes = await getStripePendingOrderReminderMinutes(ctx);
    const expiryMinutes = await getStripePendingOrderExpiryMinutes(ctx);

    const reminderDelayMs = reminderMinutes * 60 * 1000;
    const expiryDelayMs = expiryMinutes * 60 * 1000;

    await ctx.scheduler.runAfter(
      reminderDelayMs,
      internal.orderPaymentRecovery.processRecoveryReminder,
      { orderId: args.orderId }
    );

    await ctx.scheduler.runAfter(
      expiryDelayMs,
      internal.orderPaymentRecovery.expirePendingStripeOrder,
      { orderId: args.orderId }
    );

    console.info(
      `[notifications] scheduled recovery orderId=${args.orderId} reminderMin=${reminderMinutes} expiryMin=${expiryMinutes}`
    );

    return null;
  },
});

export const processRecoveryReminder = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    if (
      !isPendingStripeOrder({
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })
    ) {
      return null;
    }

    await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
      orderId: args.orderId,
      event: "order.recovery.reminder",
      eventKey: buildNotificationEventKey(args.orderId, "order.recovery.reminder"),
    });

    return null;
  },
});

export const expirePendingStripeOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    if (
      !isPendingStripeOrder({
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })
    ) {
      return null;
    }

    await releaseHeldStockIfNeeded(ctx, order);

    const now = Date.now();
    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentStatus;

    await ctx.db.patch(args.orderId, {
      status: "expired",
      paymentStatus: "failed",
      updatedAt: now,
    });

    await insertPaymentLog(ctx, {
      orderId: args.orderId,
      event: "payment_failed",
      description: "Pending Stripe order expired without collecting payment",
      previousPaymentStatus,
      newPaymentStatus: "failed",
      actorType: "system",
      createdAt: now,
    });

    if (previousStatus !== "expired") {
      await insertOrderStatusLog(ctx, {
        orderId: args.orderId,
        event: "order_status_updated",
        description: "Order expired after unpaid Stripe checkout grace period",
        previousStatus,
        newStatus: "expired",
        actorType: "system",
        createdAt: now,
      });
    }

    await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
      orderId: args.orderId,
      event: "order.expired",
      eventKey: buildNotificationEventKey(args.orderId, "order.expired"),
    });

    if (order.stripePaymentIntentId || order.stripeSessionId) {
      await ctx.scheduler.runAfter(0, internal.stripe.cancelOpenStripePayment, {
        paymentIntentId: order.stripePaymentIntentId,
        checkoutSessionId: order.stripeSessionId,
      });
    }

    console.info(`[notifications] expired pending stripe orderId=${args.orderId}`);

    await revokeQrsForOrderType(ctx, args.orderId, "payment");

    return null;
  },
});
