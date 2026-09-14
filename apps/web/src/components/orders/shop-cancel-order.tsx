"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { CancellationFeeBreakdown } from "@/components/orders/cancellation-fee-breakdown";
import {
  CANCELLATION_REASONS,
  formatCancellationReason,
} from "@convex/lib/orderCancellation";
import { calculateCancellationRefundBreakdown } from "@convex/lib/cancellationFee";

type ShopCancelOrderProps = {
  orderNumber: string;
  customerEmail?: string;
  accessToken?: string;
  onCancelled: () => void;
};

export function ShopCancelOrder({
  orderNumber,
  customerEmail,
  accessToken,
  onCancelled,
}: ShopCancelOrderProps) {
  const eligibility = useQuery(
    api.orders.getOrderCancellationEligibility,
    customerEmail || accessToken
      ? { orderNumber, customerEmail, accessToken }
      : "skip"
  );
  const cancelOrder = useMutation(api.orders.cancelOrder);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [loading, setLoading] = useState(false);

  const breakdown = useMemo(() => {
    if (!eligibility?.found) return null;
    return calculateCancellationRefundBreakdown({
      orderTotal: eligibility.orderTotal,
      feePercent: eligibility.feePercent,
    });
  }, [eligibility]);

  if (!eligibility?.found || !eligibility.canCancel || !breakdown) {
    return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await cancelOrder({
        orderNumber,
        customerEmail,
        accessToken,
        cancellationReason: reason,
      });
      if (!result.success) {
        toastError(
          "message" in result && result.message
            ? result.message
            : "Unable to cancel this order."
        );
        return;
      }
      setOpen(false);
      if ("refundPending" in result && result.refundPending) {
        toastSuccess(
          "Order cancelled. Your refund minus the cancellation fee is being processed."
        );
      } else {
        toastSuccess("Your order has been cancelled.");
      }
      onCancelled();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Unable to cancel this order."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:p-5">
        <p className="text-sm font-semibold">Need to cancel?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {eligibility.willRefundStripe
            ? `A ${eligibility.feePercent}% fee is deducted from card refunds.`
            : eligibility.paymentCollected
              ? `Cash refunds are handled manually. A ${eligibility.feePercent}% fee still applies.`
              : `A ${eligibility.feePercent}% cancellation fee applies to paid orders.`}
        </p>
        <Button
          variant="destructive"
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          Cancel this order
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Reserved items will be released. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <CancellationFeeBreakdown
            breakdown={breakdown}
            currency={eligibility.currency}
            paymentMethod={eligibility.paymentMethod}
            paymentCollected={eligibility.paymentCollected}
          />

          <div className="space-y-2">
            <Label htmlFor="shop-cancel-reason">Why are you cancelling?</Label>
            <Select
              value={reason}
              onValueChange={(value) => {
                if (value) setReason(value);
              }}
            >
              <SelectTrigger id="shop-cancel-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatCancellationReason(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {loading ? "Cancelling…" : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
