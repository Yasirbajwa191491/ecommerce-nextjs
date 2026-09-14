"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  cancellationFeePolicyText,
  cancellationFeeShortLabel,
  parseCancellationRefundFeePercent,
} from "@convex/lib/cancellationFee";

export function CancellationFeeNotice() {
  const map = useQuery(api.settings.listPublic);
  const feePercent = parseCancellationRefundFeePercent(
    map?.cancellation_refund_fee_percent
  );

  return (
    <Alert className="mb-6">
      <AlertTitle>{cancellationFeeShortLabel(feePercent)}</AlertTitle>
      <AlertDescription>{cancellationFeePolicyText(feePercent)}</AlertDescription>
    </Alert>
  );
}
