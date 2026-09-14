"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrencyAmount } from "@/lib/currencies";
import {
  cancellationFeeShortLabel,
  type CancellationRefundBreakdown,
} from "@convex/lib/cancellationFee";

type CancellationFeeBreakdownProps = {
  breakdown: CancellationRefundBreakdown;
  currency: string;
  paymentMethod: "cod" | "stripe";
  paymentCollected: boolean;
  withPayment?: boolean;
};

export function CancellationFeeBreakdown({
  breakdown,
  currency,
  paymentMethod,
  paymentCollected,
  withPayment = true,
}: CancellationFeeBreakdownProps) {
  const feeLabel = cancellationFeeShortLabel(breakdown.feePercent);

  if (!withPayment) {
    return (
      <Alert>
        <AlertTitle>{feeLabel}</AlertTitle>
        <AlertDescription>
          This will mark the order without returning money. No Stripe refund is
          created. The {breakdown.feePercent}% fee is not deducted because
          payment is not returned.
        </AlertDescription>
      </Alert>
    );
  }

  if (!paymentCollected) {
    return (
      <Alert>
        <AlertTitle>{feeLabel}</AlertTitle>
        <AlertDescription>
          {paymentMethod === "stripe"
            ? `A ${breakdown.feePercent}% fee applies to paid card orders. This unpaid payment will be cancelled and nothing is charged.`
            : `A ${breakdown.feePercent}% fee applies if cash was already collected. Cash on delivery refunds are handled manually.`}
        </AlertDescription>
      </Alert>
    );
  }

  if (paymentMethod === "cod") {
    return (
      <Alert>
        <AlertTitle>{feeLabel}</AlertTitle>
        <AlertDescription>
          Refund the customer manually. Deduct{" "}
          {formatCurrencyAmount(breakdown.feeAmount, currency)} (
          {breakdown.feePercent}%) and return{" "}
          {formatCurrencyAmount(breakdown.refundAmount, currency)}. This app
          does not move cash.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertTitle>{feeLabel}</AlertTitle>
      <AlertDescription>
        {breakdown.feePercent > 0
          ? `${formatCurrencyAmount(breakdown.feeAmount, currency)} (${breakdown.feePercent}%) is deducted. ${formatCurrencyAmount(breakdown.refundAmount, currency)} is refunded to the original card.`
          : `${formatCurrencyAmount(breakdown.refundAmount, currency)} is refunded in full to the original card.`}
      </AlertDescription>
    </Alert>
  );
}
