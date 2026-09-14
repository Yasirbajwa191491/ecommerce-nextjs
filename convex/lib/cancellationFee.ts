import { roundMoney } from "./pricing";

export const CANCELLATION_REFUND_FEE_SETTING_KEY =
  "cancellation_refund_fee_percent" as const;

export const DEFAULT_CANCELLATION_REFUND_FEE_PERCENT = 10;

export type CancellationRefundBreakdown = {
  feePercent: number;
  feeAmount: number;
  refundAmount: number;
  refundAmountCents: number;
};

export function parseCancellationRefundFeePercent(
  raw: string | undefined
): number {
  const parsed = Number.parseFloat((raw ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CANCELLATION_REFUND_FEE_PERCENT;
  }
  return Math.min(100, parsed);
}

export function calculateCancellationRefundBreakdown(args: {
  orderTotal: number;
  feePercent: number;
}): CancellationRefundBreakdown {
  const feePercent = parseCancellationRefundFeePercent(String(args.feePercent));
  const total = Number.isFinite(args.orderTotal) ? Math.max(0, args.orderTotal) : 0;
  const feeAmount = roundMoney((total * feePercent) / 100);
  const refundAmount = roundMoney(Math.max(0, total - feeAmount));
  return {
    feePercent,
    feeAmount,
    refundAmount,
    refundAmountCents: Math.round(refundAmount * 100),
  };
}

export function cancellationFeePolicyText(feePercent: number): string {
  const percent = parseCancellationRefundFeePercent(String(feePercent));
  if (percent <= 0) {
    return "No cancellation or refund fee is currently charged. Eligible card refunds are returned in full to the original payment method. Cash on delivery refunds are handled manually.";
  }
  return `If you cancel or we refund a paid order, a ${percent}% cancellation/refund fee is deducted from the order total. Card payments are refunded to the original payment method minus this fee. Cash on delivery refunds are handled manually using the same fee.`;
}

export function cancellationFeeShortLabel(feePercent: number): string {
  const percent = parseCancellationRefundFeePercent(String(feePercent));
  if (percent <= 0) return "No cancellation fee";
  return `${percent}% cancellation/refund fee`;
}

export type CancellationFeeSnapshot = CancellationRefundBreakdown & {
  paymentCollected: boolean;
  willRefundStripe: boolean;
};

export function buildCancellationFeeSnapshot(args: {
  orderTotal: number;
  feePercent: number;
  paymentMethod: "cod" | "stripe";
  paymentStatus: string;
}): CancellationFeeSnapshot {
  const breakdown = calculateCancellationRefundBreakdown({
    orderTotal: args.orderTotal,
    feePercent: args.feePercent,
  });
  const paymentCollected = args.paymentStatus === "paid";
  return {
    ...breakdown,
    paymentCollected,
    willRefundStripe:
      paymentCollected && args.paymentMethod === "stripe",
  };
}
