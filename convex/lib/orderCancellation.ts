import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";

export const CANCELLATION_REASONS = [
  "changed_mind",
  "ordered_by_mistake",
  "found_better_option",
  "delivery_too_long",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  changed_mind: "Changed my mind",
  ordered_by_mistake: "Ordered by mistake",
  found_better_option: "Found a better option",
  delivery_too_long: "Delivery taking too long",
  other: "Other",
};

export function formatCancellationReason(reason: CancellationReason): string {
  return CANCELLATION_REASON_LABELS[reason];
}

export function parseCancellationReason(
  value: string | undefined
): CancellationReason | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return CANCELLATION_REASONS.includes(trimmed as CancellationReason)
    ? (trimmed as CancellationReason)
    : undefined;
}

const STOCK_ALREADY_RELEASED_STATUSES: OrderStatus[] = [
  "cancelled",
  "expired",
  "failed",
  "refunded",
];

export function wasOrderStockReleased(
  status: OrderStatus,
  stockReleasedAt?: number
): boolean {
  if (stockReleasedAt != null) {
    return true;
  }
  return STOCK_ALREADY_RELEASED_STATUSES.includes(status);
}

export function shouldReleaseStockOnCancel(order: {
  status: OrderStatus;
  stockReleasedAt?: number;
}): boolean {
  return !wasOrderStockReleased(order.status, order.stockReleasedAt);
}

export function resolveCancellationEligibility(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): { canCancel: boolean; message?: string } {
  if (order.status === "cancelled") {
    return { canCancel: false, message: "This order has already been cancelled." };
  }
  if (order.status === "refunded") {
    return { canCancel: false, message: "This order has already been refunded." };
  }
  if (order.status === "delivered") {
    return {
      canCancel: false,
      message: "Delivered orders cannot be cancelled. Please contact support if you need help.",
    };
  }
  if (order.status === "shipped") {
    return {
      canCancel: false,
      message: "Orders that have shipped cannot be cancelled.",
    };
  }
  if (order.status === "expired") {
    return { canCancel: false, message: "This order has expired and can no longer be cancelled." };
  }
  if (order.status === "failed") {
    return { canCancel: false, message: "This order has failed and can no longer be cancelled." };
  }

  return { canCancel: true };
}

export function shouldInitiateStripeRefund(order: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): boolean {
  return order.paymentMethod === "stripe" && order.paymentStatus === "paid";
}

export function shouldCancelOpenStripePayment(order: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}): boolean {
  return (
    order.paymentMethod === "stripe" &&
    order.paymentStatus === "pending" &&
    order.status === "pending"
  );
}
