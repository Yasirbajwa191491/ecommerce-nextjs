import type { OrderNotificationEvent } from "./notificationTypes";

export type NotificationCopy = {
  title: string;
  body: string;
};

export function buildOrderNotificationCopy(
  event: OrderNotificationEvent,
  orderNumber: string,
  options?: {
    cancellationReason?: string;
    trackingInfo?: string;
  }
): NotificationCopy {
  switch (event) {
    case "order.created":
      return {
        title: "Order placed",
        body: `Your order #${orderNumber} has been placed successfully.`,
      };
    case "payment.succeeded":
      return {
        title: "Payment confirmed",
        body: `Payment for order #${orderNumber} was successful. Your order is confirmed.`,
      };
    case "payment.failed":
      return {
        title: "Payment failed",
        body: `We couldn't complete payment for order #${orderNumber}. You can try again.`,
      };
    case "order.confirmed":
      return {
        title: "Order confirmed",
        body: `Your order #${orderNumber} has been confirmed.`,
      };
    case "order.processing":
      return {
        title: "Order is being prepared",
        body: `Your order #${orderNumber} is now being prepared.`,
      };
    case "order.shipped": {
      const trackingSuffix = options?.trackingInfo?.trim()
        ? ` ${options.trackingInfo.trim()}`
        : "";
      return {
        title: "Order shipped",
        body: `Your order #${orderNumber} is on its way.${trackingSuffix}`,
      };
    }
    case "order.delivered":
      return {
        title: "Order delivered",
        body: `Your order #${orderNumber} has been delivered.`,
      };
    case "order.cancelled": {
      const reason = options?.cancellationReason?.trim();
      return {
        title: "Order cancelled",
        body: reason
          ? `Your order #${orderNumber} has been cancelled. ${reason}`
          : `Your order #${orderNumber} has been cancelled.`,
      };
    }
    case "order.refunded":
      return {
        title: "Refund processed",
        body: `Your refund for order #${orderNumber} has been processed.`,
      };
    case "payment.received":
      return {
        title: "Payment received",
        body: `Payment for order #${orderNumber} has been recorded.`,
      };
    case "order.recovery.reminder":
      return {
        title: "Complete your order",
        body: `Your order #${orderNumber} is waiting for payment. Complete your payment before your reserved items are released.`,
      };
    case "order.expired":
      return {
        title: "Order expired",
        body: `Your order #${orderNumber} expired because payment was not completed. Reserved items have been released.`,
      };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function buildOrderDeepLinkPath(
  orderNumber: string,
  event: OrderNotificationEvent
): string {
  const encodedOrderNumber = encodeURIComponent(orderNumber);
  if (event === "payment.failed" || event === "order.recovery.reminder") {
    return `/checkout/success?orderNumber=${encodedOrderNumber}&pendingPayment=1`;
  }
  // Mobile order detail reads `orderNumber` from search params, not only the [id] segment.
  return `/order/${encodedOrderNumber}?orderNumber=${encodedOrderNumber}`;
}
