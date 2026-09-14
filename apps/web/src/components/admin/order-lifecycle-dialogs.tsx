"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CancellationFeeBreakdown } from "@/components/orders/cancellation-fee-breakdown";
import type {
  AdminPaymentHandling,
  AdminRefundMode,
  AdminRefundPlan,
} from "@convex/lib/adminOrderTransitions";
import type { CancellationRefundBreakdown } from "@convex/lib/cancellationFee";

export type OrderRefundConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: AdminRefundPlan | null;
  mode: AdminRefundMode;
  onModeChange: (mode: AdminRefundMode) => void;
  loading?: boolean;
  onConfirm: () => void;
  feeBreakdown?: CancellationRefundBreakdown | null;
  currency?: string;
};

export function OrderRefundConfirmDialog({
  open,
  onOpenChange,
  plan,
  mode,
  onModeChange,
  loading,
  onConfirm,
  feeBreakdown,
  currency = "USD",
}: OrderRefundConfirmDialogProps) {
  const canConfirm =
    plan?.kind === "stripe_paid" || plan?.kind === "cod_paid";
  const withPayment = mode !== "without_payment";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Refund this order?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose whether money is returned. Inventory is released once either
            way.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {plan?.kind === "unpaid_use_cancel" ||
        plan?.kind === "already_refunded" ||
        plan?.kind === "cannot_refund" ? (
          <Alert>
            <AlertTitle>Refund is not available</AlertTitle>
            <AlertDescription>{plan.message}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {feeBreakdown ? (
              <CancellationFeeBreakdown
                breakdown={feeBreakdown}
                currency={currency}
                paymentMethod={plan?.kind === "cod_paid" ? "cod" : "stripe"}
                paymentCollected
                withPayment={plan?.kind === "cod_paid" ? true : withPayment}
              />
            ) : null}
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                if (
                  value === "stripe_original" ||
                  value === "without_payment" ||
                  value === "cod_manual"
                ) {
                  onModeChange(value);
                }
              }}
              className="grid gap-2"
            >
              {plan?.kind === "stripe_paid" ? (
                <>
                  <label
                    htmlFor="refund-stripe-original"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <RadioGroupItem
                      value="stripe_original"
                      id="refund-stripe-original"
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Refund with payment</span>
                      <span className="mt-1 block text-muted-foreground">
                        Returns funds to the same card minus the cancellation
                        fee. Uses the original PaymentIntent from web Checkout
                        or mobile PaymentSheet.
                      </span>
                    </span>
                  </label>
                  <label
                    htmlFor="refund-without-payment"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <RadioGroupItem
                      value="without_payment"
                      id="refund-without-payment"
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Refund without payment</span>
                      <span className="mt-1 block text-muted-foreground">
                        Marks the order refunded and releases inventory. Does
                        not create a Stripe refund.
                      </span>
                    </span>
                  </label>
                </>
              ) : (
                <label
                  htmlFor="refund-cod-manual"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <RadioGroupItem
                    value="cod_manual"
                    id="refund-cod-manual"
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Record refund without Stripe</span>
                    <span className="mt-1 block text-muted-foreground">
                      For cash on delivery after cash was collected. Return cash
                      to the customer yourself minus the fee shown above.
                    </span>
                  </span>
                </label>
              )}
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Back</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading || !canConfirm}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {loading ? "Processing…" : canConfirm ? "Confirm refund" : "Cannot refund"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OrderCancelConfirmDialog({
  open,
  onOpenChange,
  description,
  loading,
  onConfirm,
  feeBreakdown,
  currency = "USD",
  paymentMethod,
  paymentCollected,
  showPaymentChoice,
  paymentHandling,
  onPaymentHandlingChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  loading?: boolean;
  onConfirm: () => void;
  feeBreakdown?: CancellationRefundBreakdown | null;
  currency?: string;
  paymentMethod: "cod" | "stripe";
  paymentCollected: boolean;
  showPaymentChoice?: boolean;
  paymentHandling?: AdminPaymentHandling;
  onPaymentHandlingChange?: (value: AdminPaymentHandling) => void;
}) {
  const withPayment = paymentHandling !== "without_payment";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {feeBreakdown ? (
          <CancellationFeeBreakdown
            breakdown={feeBreakdown}
            currency={currency}
            paymentMethod={paymentMethod}
            paymentCollected={paymentCollected}
            withPayment={showPaymentChoice ? withPayment : true}
          />
        ) : (
          <Alert className="text-left">
            <AlertTitle>Inventory and payment</AlertTitle>
            <AlertDescription>
              Held stock is released exactly once. Unpaid Stripe payments are
              cancelled. Unpaid COD stays unpaid/pending.
            </AlertDescription>
          </Alert>
        )}
        {showPaymentChoice ? (
          <RadioGroup
            value={paymentHandling}
            onValueChange={(value) => {
              if (value === "with_payment" || value === "without_payment") {
                onPaymentHandlingChange?.(value);
              }
            }}
            className="grid gap-2"
          >
            <label
              htmlFor="cancel-with-payment"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
            >
              <RadioGroupItem
                value="with_payment"
                id="cancel-with-payment"
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Cancel with payment refund</span>
                <span className="mt-1 block text-muted-foreground">
                  Refund the original card minus the cancellation fee.
                </span>
              </span>
            </label>
            <label
              htmlFor="cancel-without-payment"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
            >
              <RadioGroupItem
                value="without_payment"
                id="cancel-without-payment"
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Cancel without payment refund</span>
                <span className="mt-1 block text-muted-foreground">
                  Marks the order cancelled and releases inventory. Does not
                  refund Stripe.
                </span>
              </span>
            </label>
          </RadioGroup>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Back</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {loading ? "Cancelling…" : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
