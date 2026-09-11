import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/order-display";

export type OrderActionContext = {
  status: OrderStatus;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus | string;
  hasVerifiedAccess: boolean;
};

export function canShowReceiptActions(ctx: OrderActionContext): boolean {
  if (!ctx.hasVerifiedAccess) return false;

  const isPendingStripe =
    ctx.paymentMethod === "stripe" &&
    ctx.paymentStatus === "pending" &&
    ctx.status === "pending";

  if (isPendingStripe) {
    return true;
  }

  const blocked = new Set<OrderStatus>(["failed", "expired"]);
  return !blocked.has(ctx.status);
}

export function canShowCancelAction(args: {
  hasVerifiedAccess: boolean;
  canCancel?: boolean;
}): boolean {
  return args.hasVerifiedAccess && args.canCancel === true;
}

export function canShowReorderAction(args: {
  hasVerifiedAccess: boolean;
  canReorder?: boolean;
}): boolean {
  return args.hasVerifiedAccess && args.canReorder === true;
}
