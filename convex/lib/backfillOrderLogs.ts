import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { insertOrderStatusLog, insertPaymentLog } from "./orderLogs";

async function hasAnyLogs(ctx: MutationCtx, orderId: Id<"orders">) {
  const statusLog = await ctx.db
    .query("orderStatusLogs")
    .withIndex("by_order_id_created", (q) => q.eq("orderId", orderId))
    .first();
  if (statusLog) return true;

  const paymentLog = await ctx.db
    .query("paymentLogs")
    .withIndex("by_order_id_created", (q) => q.eq("orderId", orderId))
    .first();
  return paymentLog !== null;
}

function webhookEventToLogs(
  order: Doc<"orders">,
  event: Doc<"stripeWebhookEvents">
) {
  const at = event.processedAt;
  switch (event.type) {
    case "checkout.session.completed":
      return {
        payment: {
          event: "payment_completed",
          description: "Payment completed via Stripe (webhook backfill)",
          previousPaymentStatus: "pending" as const,
          newPaymentStatus: "paid" as const,
          actorType: "webhook" as const,
          stripeSessionId: order.stripeSessionId,
          stripePaymentIntentId: order.stripePaymentIntentId,
          stripeTransactionId: order.stripeTransactionId,
          amount: order.total,
          currency: order.currency,
          createdAt: at,
        },
        status: {
          event: "order_status_updated",
          description: "Order status updated to confirmed after payment (webhook backfill)",
          previousStatus: "pending" as const,
          newStatus: "confirmed" as const,
          actorType: "system" as const,
          createdAt: at + 1,
        },
      };
    case "payment_intent.succeeded":
      return {
        payment: {
          event: "payment_completed",
          description: "Payment completed via Stripe (webhook backfill)",
          previousPaymentStatus: "pending" as const,
          newPaymentStatus: "paid" as const,
          actorType: "webhook" as const,
          stripePaymentIntentId: order.stripePaymentIntentId,
          stripeTransactionId: order.stripeTransactionId,
          amount: order.total,
          currency: order.currency,
          createdAt: at,
        },
        status:
          order.status === "confirmed"
            ? {
                event: "order_status_updated",
                description:
                  "Order status updated to confirmed after payment (webhook backfill)",
                previousStatus: "pending" as const,
                newStatus: "confirmed" as const,
                actorType: "system" as const,
                createdAt: at + 1,
              }
            : undefined,
      };
    case "payment_intent.payment_failed":
      return {
        payment: {
          event: "payment_failed",
          description: "Payment failed (webhook backfill)",
          previousPaymentStatus: "pending" as const,
          newPaymentStatus: "failed" as const,
          actorType: "webhook" as const,
          createdAt: at,
        },
        status: {
          event: "order_status_updated",
          description: "Order status updated to failed (webhook backfill)",
          previousStatus: "pending" as const,
          newStatus: "failed" as const,
          actorType: "system" as const,
          createdAt: at + 1,
        },
      };
    case "checkout.session.expired":
      return {
        payment: {
          event: "payment_failed",
          description: "Checkout session expired (webhook backfill)",
          previousPaymentStatus: "pending" as const,
          newPaymentStatus: "failed" as const,
          actorType: "webhook" as const,
          createdAt: at,
        },
        status: {
          event: "order_status_updated",
          description: "Order status updated to expired (webhook backfill)",
          previousStatus: "pending" as const,
          newStatus: "expired" as const,
          actorType: "system" as const,
          createdAt: at + 1,
        },
      };
    case "charge.refunded":
      return {
        payment: {
          event: "payment_refunded",
          description: "Payment refunded via Stripe (webhook backfill)",
          previousPaymentStatus: "paid" as const,
          newPaymentStatus: "refunded" as const,
          actorType: "webhook" as const,
          stripeTransactionId: order.stripeTransactionId,
          amount: order.total,
          currency: order.currency,
          createdAt: at,
        },
        status: {
          event: "order_status_updated",
          description: "Order status updated to refunded (webhook backfill)",
          previousStatus: order.status === "refunded" ? "confirmed" : order.status,
          newStatus: "refunded" as const,
          actorType: "system" as const,
          createdAt: at + 1,
        },
      };
    default:
      return null;
  }
}

/**
 * Reconstructs immutable audit logs for orders created before logging was enabled.
 * Only runs when no logs exist yet for the order.
 */
export async function backfillOrderLogsIfEmpty(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<{ backfilled: boolean }> {
  if (await hasAnyLogs(ctx, orderId)) {
    return { backfilled: false };
  }

  const order = await ctx.db.get(orderId);
  if (!order) {
    return { backfilled: false };
  }

  let sequence = order.createdAt;

  await insertOrderStatusLog(ctx, {
    orderId,
    event: "order_created",
    description: "Order created (historical backfill)",
    newStatus: "pending",
    actorType: "system",
    createdAt: sequence,
  });

  await insertPaymentLog(ctx, {
    orderId,
    event: "payment_pending",
    description:
      order.paymentMethod === "cod"
        ? "Cash on delivery payment pending (historical backfill)"
        : "Stripe payment pending (historical backfill)",
    newPaymentStatus: "pending",
    actorType: "system",
    createdAt: sequence + 1,
  });

  if (order.paymentMethod === "stripe" && order.stripeSessionId) {
    sequence += 2;
    await insertPaymentLog(ctx, {
      orderId,
      event: "checkout_session_created",
      description: "Stripe checkout session created (historical backfill)",
      previousPaymentStatus: "pending",
      newPaymentStatus: "pending",
      actorType: "system",
      stripeSessionId: order.stripeSessionId,
      createdAt: sequence,
    });
  }

  const webhookEvents = await ctx.db
    .query("stripeWebhookEvents")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();

  webhookEvents.sort((a, b) => a.processedAt - b.processedAt);

  let paymentCompletedLogged = false;

  for (const webhookEvent of webhookEvents) {
    const mapped = webhookEventToLogs(order, webhookEvent);
    if (!mapped) continue;

    await insertPaymentLog(ctx, { orderId, ...mapped.payment });
    if (mapped.payment.event === "payment_completed") {
      paymentCompletedLogged = true;
    }
    if (mapped.status) {
      await insertOrderStatusLog(ctx, { orderId, ...mapped.status });
    }
  }

  if (order.paymentStatus === "paid" && order.paidAt && !paymentCompletedLogged) {
    await insertPaymentLog(ctx, {
      orderId,
      event: "payment_completed",
      description: "Payment completed (historical backfill)",
      previousPaymentStatus: "pending",
      newPaymentStatus: "paid",
      actorType: "webhook",
      stripeSessionId: order.stripeSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeTransactionId: order.stripeTransactionId,
      amount: order.total,
      currency: order.currency,
      createdAt: order.paidAt,
    });

    if (order.status === "confirmed") {
      await insertOrderStatusLog(ctx, {
        orderId,
        event: "order_status_updated",
        description:
          "Order status updated to confirmed after payment (historical backfill)",
        previousStatus: "pending",
        newStatus: "confirmed",
        actorType: "system",
        createdAt: order.paidAt + 1,
      });
    }
  }

  if (order.paymentStatus === "failed" && !paymentCompletedLogged) {
    const failedStatus = order.status === "expired" ? "expired" : "failed";
    await insertPaymentLog(ctx, {
      orderId,
      event: "payment_failed",
      description: "Payment failed (historical backfill)",
      previousPaymentStatus: "pending",
      newPaymentStatus: "failed",
      actorType: "system",
      createdAt: order.updatedAt,
    });
    await insertOrderStatusLog(ctx, {
      orderId,
      event: "order_status_updated",
      description: `Order status updated to ${failedStatus} (historical backfill)`,
      previousStatus: "pending",
      newStatus: failedStatus,
      actorType: "system",
      createdAt: order.updatedAt + 1,
    });
  }

  if (order.paymentStatus === "refunded") {
    const hasRefundLog = webhookEvents.some((e) => e.type === "charge.refunded");
    if (!hasRefundLog) {
      await insertPaymentLog(ctx, {
        orderId,
        event: "payment_refunded",
        description: "Payment refunded (historical backfill)",
        previousPaymentStatus: "paid",
        newPaymentStatus: "refunded",
        actorType: "webhook",
        stripeTransactionId: order.stripeTransactionId,
        amount: order.total,
        currency: order.currency,
        createdAt: order.updatedAt,
      });
      await insertOrderStatusLog(ctx, {
        orderId,
        event: "order_status_updated",
        description: "Order status updated to refunded (historical backfill)",
        previousStatus: "confirmed",
        newStatus: "refunded",
        actorType: "system",
        createdAt: order.updatedAt + 1,
      });
    }
  }

  return { backfilled: true };
}
