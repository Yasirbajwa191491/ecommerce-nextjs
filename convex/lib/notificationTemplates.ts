import type { OrderNotificationEvent } from "./notificationTypes";

export type NotificationCopy = {
  title: string;
  body: string;
};

export type NotificationOrderItem = {
  productName: string;
  quantity: number;
  color?: string;
  isPromotionGift?: boolean;
};

/** Compact item summary for push/in-app copy (no order number required). */
export function formatNotificationItemSummary(
  items: NotificationOrderItem[],
  options?: { maxNames?: number; maxNameLength?: number }
): string {
  const maxNames = options?.maxNames ?? 2;
  const maxNameLength = options?.maxNameLength ?? 28;

  const paidItems = items.filter((item) => !item.isPromotionGift);
  const source = paidItems.length > 0 ? paidItems : items;

  if (source.length === 0) {
    return "your reserved items";
  }

  const formatName = (item: NotificationOrderItem) => {
    const raw = item.productName.trim() || "Item";
    const truncated =
      raw.length > maxNameLength ? `${raw.slice(0, maxNameLength - 1).trimEnd()}…` : raw;
    const qty = item.quantity > 1 ? `${item.quantity}× ` : "";
    const color = item.color?.trim() ? ` (${item.color.trim()})` : "";
    return `${qty}${truncated}${color}`;
  };

  if (source.length === 1) {
    return formatName(source[0]!);
  }

  const shown = source.slice(0, maxNames).map(formatName);
  const remaining = source.length - shown.length;
  if (remaining <= 0) {
    if (shown.length === 2) {
      return `${shown[0]} and ${shown[1]}`;
    }
    return shown.join(", ");
  }

  return `${shown.join(", ")} +${remaining} more`;
}

export function buildOrderNotificationCopy(
  event: OrderNotificationEvent,
  orderNumber: string,
  options?: {
    cancellationReason?: string;
    trackingInfo?: string;
    items?: NotificationOrderItem[];
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
    case "order.recovery.reminder": {
      const itemSummary = formatNotificationItemSummary(options?.items ?? []);
      return {
        title: "Complete your order",
        body: `Still waiting: ${itemSummary}. Complete payment before reserved items are released.`,
      };
    }
    case "order.expired": {
      const itemSummary = formatNotificationItemSummary(options?.items ?? []);
      return {
        title: "Order expired",
        body: `Payment was not completed for ${itemSummary}, so reserved stock was released.`,
      };
    }
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
