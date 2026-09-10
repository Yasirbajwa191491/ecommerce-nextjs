import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";
import type { OrderNotificationEvent } from "./notificationTypes";

export function buildNotificationEventKey(
  orderId: string,
  event: OrderNotificationEvent
): string {
  return `order:${orderId}:${event}`;
}

export function buildOrderStatusEventKey(
  orderId: string,
  newStatus: OrderStatus
): string {
  return `order:${orderId}:status:${newStatus}`;
}

export function buildPaymentStatusEventKey(
  orderId: string,
  newPaymentStatus: PaymentStatus
): string {
  return `order:${orderId}:payment:${newPaymentStatus}`;
}

export function resolveOrderStatusTransitionEvent(
  previousStatus: OrderStatus,
  newStatus: OrderStatus
): OrderNotificationEvent | null {
  if (previousStatus === newStatus) {
    return null;
  }

  switch (newStatus) {
    case "confirmed":
      return previousStatus === "pending" || previousStatus === "processing"
        ? "order.confirmed"
        : "order.confirmed";
    case "processing":
      return "order.processing";
    case "shipped":
      return "order.shipped";
    case "delivered":
      return "order.delivered";
    case "cancelled":
      return "order.cancelled";
    case "refunded":
      return "order.refunded";
    case "failed":
      return "payment.failed";
    case "expired":
      return "order.expired";
    default:
      return null;
  }
}

export function resolvePaymentTransitionEvent(args: {
  previousPaymentStatus: PaymentStatus;
  newPaymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  previousOrderStatus: OrderStatus;
  newOrderStatus: OrderStatus;
}): OrderNotificationEvent | null {
  if (args.previousPaymentStatus === args.newPaymentStatus) {
    return null;
  }

  if (
    args.newPaymentStatus === "paid" &&
    args.paymentMethod === "stripe" &&
    args.previousPaymentStatus !== "paid"
  ) {
    return "payment.succeeded";
  }

  if (
    args.newPaymentStatus === "paid" &&
    args.paymentMethod === "cod" &&
    args.previousPaymentStatus !== "paid"
  ) {
    return "payment.received";
  }

  if (args.newPaymentStatus === "failed" && args.previousPaymentStatus !== "failed") {
    return "payment.failed";
  }

  if (
    args.newPaymentStatus === "refunded" &&
    args.previousPaymentStatus !== "refunded"
  ) {
    return "order.refunded";
  }

  return null;
}

export function shouldSkipConfirmedAfterPaymentSucceeded(args: {
  event: OrderNotificationEvent;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): boolean {
  return (
    args.event === "order.confirmed" &&
    args.paymentMethod === "stripe" &&
    args.paymentStatus === "paid"
  );
}

export function isPendingStripeOrder(args: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}): boolean {
  return (
    args.paymentMethod === "stripe" &&
    args.paymentStatus === "pending" &&
    args.status === "pending"
  );
}
