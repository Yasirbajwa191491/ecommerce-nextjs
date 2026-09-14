import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";
import { isHeldStockReleased } from "./inventory";

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

export function wasOrderStockReleased(stockReleasedAt?: number): boolean {
  return isHeldStockReleased(stockReleasedAt);
}

export function shouldReleaseStockOnCancel(order: {
  stockReleasedAt?: number;
}): boolean {
  return !wasOrderStockReleased(order.stockReleasedAt);
}

export function resolveCancellationEligibility(
  order: {
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
  },
  options?: { audience?: "customer" | "admin" }
): { canCancel: boolean; message?: string } {
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

  const audience = options?.audience ?? "admin";
  if (audience === "customer") {
    if (order.paymentMethod === "cod") {
      if (order.status === "pending" || order.status === "confirmed") {
        return { canCancel: true };
      }
      return {
        canCancel: false,
        message:
          "Cash on delivery orders can only be cancelled while they are pending or confirmed.",
      };
    }

    if (order.status === "pending" && order.paymentStatus !== "paid") {
      return { canCancel: true };
    }
    if (order.status === "confirmed") {
      return { canCancel: true };
    }
    return {
      canCancel: false,
      message:
        "Card orders can only be cancelled while confirmed, or while payment is still pending.",
    };
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
}): boolean {
  return order.paymentMethod === "stripe" && order.paymentStatus === "pending";
}

export type OrderCancellationPlan = {
  allowed: boolean;
  isRepair: boolean;
  message?: string;
  nextStatus: "cancelled";
  nextPaymentStatus: PaymentStatus;
  releaseStock: boolean;
  cancelOpenPayment: boolean;
  initiateRefund: boolean;
};

export function planOrderCancellation(
  order: {
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    stockReleasedAt?: number;
    stripePaymentIntentId?: string;
    stripeSessionId?: string;
  },
  options?: {
    audience?: "customer" | "admin";
    initiateRefund?: boolean;
  }
): OrderCancellationPlan {
  const initiateRefund =
    options?.initiateRefund ?? shouldInitiateStripeRefund(order);
  const cancelOpenPayment = shouldCancelOpenStripePayment(order);
  const releaseStock = shouldReleaseStockOnCancel(order);
  const nextPaymentStatus: PaymentStatus = cancelOpenPayment
    ? "failed"
    : order.paymentStatus;

  if (order.status === "cancelled") {
    return {
      allowed: true,
      isRepair: true,
      nextStatus: "cancelled",
      nextPaymentStatus,
      releaseStock,
      cancelOpenPayment,
      initiateRefund,
    };
  }

  const eligibility = resolveCancellationEligibility(order, {
    audience: options?.audience ?? "admin",
  });
  if (!eligibility.canCancel) {
    return {
      allowed: false,
      isRepair: false,
      message: eligibility.message,
      nextStatus: "cancelled",
      nextPaymentStatus: order.paymentStatus,
      releaseStock: false,
      cancelOpenPayment: false,
      initiateRefund: false,
    };
  }

  return {
    allowed: true,
    isRepair: false,
    nextStatus: "cancelled",
    nextPaymentStatus,
    releaseStock,
    cancelOpenPayment,
    initiateRefund,
  };
}
