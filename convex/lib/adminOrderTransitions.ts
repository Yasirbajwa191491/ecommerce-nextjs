import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";
import { resolveCancellationEligibility, shouldInitiateStripeRefund } from "./orderCancellation";

const FULFILLMENT_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
];

const TERMINAL_STATUSES: OrderStatus[] = [
  "cancelled",
  "refunded",
  "failed",
  "expired",
];

const ALLOWED_FULFILLMENT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "confirmed"],
  processing: ["confirmed", "shipped"],
  confirmed: ["processing", "shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
  failed: [],
  expired: [],
};

export type AdminStatusAction =
  | { type: "noop" }
  | { type: "fulfill"; nextStatus: OrderStatus }
  | { type: "cancel" }
  | { type: "refund" }
  | { type: "reject"; message: string };

export function canTransitionFulfillmentStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_FULFILLMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getSelectableAdminOrderStatuses(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): OrderStatus[] {
  const statuses = new Set<OrderStatus>([order.status]);
  for (const next of ALLOWED_FULFILLMENT_TRANSITIONS[order.status]) {
    statuses.add(next);
  }
  const cancelAllowed = isAdminCancellationAllowed(order);
  if (cancelAllowed.allowed) {
    statuses.add("cancelled");
  }
  const refundPlan = resolveAdminRefundPlan(order);
  if (refundPlan.kind === "stripe_paid" || refundPlan.kind === "cod_paid") {
    statuses.add("refunded");
  }
  return Array.from(statuses);
}

export function resolveAdminStatusAction(
  from: OrderStatus,
  to: OrderStatus
): AdminStatusAction {
  if (from === to) {
    return { type: "noop" };
  }

  if (TERMINAL_STATUSES.includes(from) && FULFILLMENT_STATUSES.includes(to)) {
    return {
      type: "reject",
      message: `A ${from} order cannot be moved to ${to}.`,
    };
  }

  if (to === "cancelled") {
    return { type: "cancel" };
  }

  if (to === "refunded") {
    return { type: "refund" };
  }

  if (to === "failed" || to === "expired") {
    return {
      type: "reject",
      message: "Failed and expired statuses are set by the payment system, not manually.",
    };
  }

  if (FULFILLMENT_STATUSES.includes(to)) {
    if (!canTransitionFulfillmentStatus(from, to)) {
      return {
        type: "reject",
        message: `Cannot change order status from ${from} to ${to}.`,
      };
    }
    return { type: "fulfill", nextStatus: to };
  }

  return {
    type: "reject",
    message: `Cannot change order status from ${from} to ${to}.`,
  };
}

export type AdminRefundMode = "stripe_original" | "cod_manual";

export type AdminRefundPlan =
  | {
      kind: "stripe_paid";
      allowedModes: AdminRefundMode[];
      defaultMode: AdminRefundMode;
      requiresStripePaymentIntent: true;
    }
  | {
      kind: "cod_paid";
      allowedModes: AdminRefundMode[];
      defaultMode: AdminRefundMode;
      requiresStripePaymentIntent: false;
    }
  | {
      kind: "unpaid_use_cancel";
      message: string;
    }
  | {
      kind: "already_refunded";
      message: string;
    }
  | {
      kind: "cannot_refund";
      message: string;
    };

export function resolveAdminRefundPlan(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
}): AdminRefundPlan {
  if (order.paymentStatus === "refunded" || order.status === "refunded") {
    return {
      kind: "already_refunded",
      message: "This order has already been refunded.",
    };
  }

  if (order.paymentStatus !== "paid") {
    return {
      kind: "unpaid_use_cancel",
      message:
        "This order has no collected payment to refund. Cancel the order instead to stop fulfillment and release inventory.",
    };
  }

  if (order.paymentMethod === "stripe") {
    if (!order.stripePaymentIntentId) {
      return {
        kind: "cannot_refund",
        message:
          "This Stripe order is marked paid but has no payment intent, so an automatic refund cannot be created. Check Stripe for this charge before recording anything locally.",
      };
    }
    return {
      kind: "stripe_paid",
      allowedModes: ["stripe_original"],
      defaultMode: "stripe_original",
      requiresStripePaymentIntent: true,
    };
  }

  return {
    kind: "cod_paid",
    allowedModes: ["cod_manual"],
    defaultMode: "cod_manual",
    requiresStripePaymentIntent: false,
  };
}

export function assertAdminRefundModeAllowed(
  plan: AdminRefundPlan,
  mode: AdminRefundMode
): { ok: true } | { ok: false; message: string } {
  if (plan.kind === "stripe_paid" || plan.kind === "cod_paid") {
    if (!plan.allowedModes.includes(mode)) {
      return {
        ok: false,
        message:
          mode === "cod_manual"
            ? "Paid Stripe orders cannot be marked refunded without a real Stripe refund."
            : "Cash on delivery refunds are recorded without Stripe. Do not create a Stripe refund for COD.",
      };
    }
    return { ok: true };
  }
  return { ok: false, message: plan.message };
}

export function isAdminCancellationAllowed(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): { allowed: boolean; message?: string } {
  if (order.status === "cancelled") {
    return { allowed: true };
  }
  const eligibility = resolveCancellationEligibility(order);
  return { allowed: eligibility.canCancel, message: eligibility.message };
}

export function shouldRetryStripeRefund(order: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): boolean {
  return shouldInitiateStripeRefund(order);
}
