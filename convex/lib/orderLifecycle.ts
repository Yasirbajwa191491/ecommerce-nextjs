import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { releaseHeldStockIfNeeded } from "./inventory";
import { insertOrderStatusLog, insertPaymentLog } from "./orderLogs";
import { buildNotificationEventKey } from "./orderNotificationLogic";
import { planOrderCancellation } from "./orderCancellation";
import type { PaymentStatus } from "./orderValidators";

export type CancellationActor = {
  actorType: "customer" | "admin" | "system";
  actorUserId?: string;
  actorName?: string;
};

export type ExecuteOrderCancellationResult = {
  success: true;
  alreadyCancelled?: boolean;
  refundPending?: boolean;
};

export async function executeOrderCancellation(
  ctx: MutationCtx,
  args: {
    order: Doc<"orders">;
    actor: CancellationActor;
    reasonLabel?: string;
    description?: string;
  }
): Promise<ExecuteOrderCancellationResult> {
  const plan = planOrderCancellation(args.order);
  if (!plan.allowed) {
    throw new ConvexError(plan.message ?? "This order cannot be cancelled.");
  }

  const now = Date.now();
  const previousStatus = args.order.status;
  const previousPaymentStatus = args.order.paymentStatus;

  if (plan.releaseStock) {
    await releaseHeldStockIfNeeded(ctx, args.order);
  }

  const nextPaymentStatus: PaymentStatus = plan.nextPaymentStatus;
  const alreadyCancelled = plan.isRepair && previousStatus === "cancelled";

  if (previousStatus !== "cancelled" || previousPaymentStatus !== nextPaymentStatus) {
    await ctx.db.patch(args.order._id, {
      status: "cancelled",
      paymentStatus: nextPaymentStatus,
      updatedAt: now,
    });
  }

  if (plan.cancelOpenPayment && previousPaymentStatus !== "failed") {
    await insertPaymentLog(ctx, {
      orderId: args.order._id,
      event: "payment_failed",
      description:
        args.actor.actorType === "customer"
          ? "Payment cancelled by customer"
          : args.description ?? "Open Stripe payment cancelled with the order",
      previousPaymentStatus,
      newPaymentStatus: "failed",
      actorType: args.actor.actorType === "customer" ? "system" : args.actor.actorType,
      actorUserId: args.actor.actorUserId,
      actorName: args.actor.actorName,
      createdAt: now,
    });
  }

  if (previousStatus !== "cancelled") {
    const actorLabel =
      args.actor.actorType === "admin"
        ? "admin"
        : args.actor.actorType === "customer"
          ? "customer"
          : "system";
    await insertOrderStatusLog(ctx, {
      orderId: args.order._id,
      event: "order_status_updated",
      description: args.description
        ? args.description
        : args.reasonLabel
          ? `Order cancelled by ${actorLabel} (${args.reasonLabel})`
          : `Order cancelled by ${actorLabel}`,
      previousStatus,
      newStatus: "cancelled",
      actorType: args.actor.actorType,
      actorUserId: args.actor.actorUserId,
      actorName: args.actor.actorName,
      createdAt: now,
    });

    await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
      orderId: args.order._id,
      event: "order.cancelled",
      eventKey: buildNotificationEventKey(args.order._id, "order.cancelled"),
      cancellationReason: args.reasonLabel,
    });
  }

  if (
    plan.cancelOpenPayment &&
    (args.order.stripePaymentIntentId || args.order.stripeSessionId)
  ) {
    await ctx.scheduler.runAfter(0, internal.stripe.cancelOpenStripePayment, {
      paymentIntentId: args.order.stripePaymentIntentId,
      checkoutSessionId: args.order.stripeSessionId,
    });
  }

  if (plan.initiateRefund && args.order.stripePaymentIntentId) {
    await ctx.scheduler.runAfter(0, internal.stripe.refundUnfulfillablePayment, {
      orderId: args.order._id,
      paymentIntentId: args.order.stripePaymentIntentId,
      reason:
        args.actor.actorType === "admin" ? "admin_cancelled" : "customer_cancelled",
    });
    return {
      success: true,
      alreadyCancelled: alreadyCancelled || undefined,
      refundPending: true,
    };
  }

  return {
    success: true,
    alreadyCancelled: alreadyCancelled || undefined,
  };
}

export async function applyOrderRefunded(
  ctx: MutationCtx,
  args: {
    order: Doc<"orders">;
    stripeTransactionId?: string;
    stripePaymentIntentId?: string;
    actorType: "webhook" | "admin" | "system";
    actorUserId?: string;
    actorName?: string;
    description?: string;
  }
): Promise<{ alreadyRefunded: boolean }> {
  const alreadyRefunded =
    args.order.paymentStatus === "refunded" && args.order.status === "refunded";

  await releaseHeldStockIfNeeded(ctx, args.order);

  if (alreadyRefunded) {
    return { alreadyRefunded: true };
  }

  const now = Date.now();
  const previousStatus = args.order.status;
  const previousPaymentStatus = args.order.paymentStatus;

  await ctx.db.patch(args.order._id, {
    status: "refunded",
    paymentStatus: "refunded",
    stripeTransactionId: args.stripeTransactionId ?? args.order.stripeTransactionId,
    stripePaymentIntentId:
      args.stripePaymentIntentId ?? args.order.stripePaymentIntentId,
    updatedAt: now,
  });

  if (previousPaymentStatus !== "refunded") {
    await insertPaymentLog(ctx, {
      orderId: args.order._id,
      event: "payment_refunded",
      description:
        args.description ??
        (args.order.paymentMethod === "cod"
          ? "Cash on delivery payment recorded as refunded"
          : "Payment refunded via Stripe"),
      previousPaymentStatus,
      newPaymentStatus: "refunded",
      actorType: args.actorType,
      actorUserId: args.actorUserId,
      actorName: args.actorName,
      stripeTransactionId: args.stripeTransactionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amount: args.order.total,
      currency: args.order.currency,
      createdAt: now,
    });
  }

  if (previousStatus !== "refunded") {
    await insertOrderStatusLog(ctx, {
      orderId: args.order._id,
      event: "order_status_updated",
      description: "Order status updated to refunded",
      previousStatus,
      newStatus: "refunded",
      actorType: args.actorType === "webhook" ? "system" : args.actorType,
      actorUserId: args.actorUserId,
      actorName: args.actorName,
      createdAt: now,
    });
  }

  await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
    orderId: args.order._id,
    event: "order.refunded",
    eventKey: buildNotificationEventKey(args.order._id, "order.refunded"),
  });

  return { alreadyRefunded: false };
}
