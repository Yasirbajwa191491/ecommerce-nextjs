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
import type { AdminRefundMode, AdminRefundPlan } from "@convex/lib/adminOrderTransitions";

export type OrderRefundConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: AdminRefundPlan | null;
  mode: AdminRefundMode;
  onModeChange: (mode: AdminRefundMode) => void;
  loading?: boolean;
  onConfirm: () => void;
};

export function OrderRefundConfirmDialog({
  open,
  onOpenChange,
  plan,
  mode,
  onModeChange,
  loading,
  onConfirm,
}: OrderRefundConfirmDialogProps) {
  const canConfirm =
    plan?.kind === "stripe_paid" || plan?.kind === "cod_paid";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Refund this order?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how money is returned. This cannot fake a Stripe refund by
            only changing the order status.
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
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                if (value === "stripe_original" || value === "cod_manual") {
                  onModeChange(value);
                }
              }}
              className="grid gap-2"
            >
              <label
                htmlFor="refund-stripe-original"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <RadioGroupItem
                  value="stripe_original"
                  id="refund-stripe-original"
                  disabled={plan?.kind !== "stripe_paid"}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Refund original Stripe payment</span>
                  <span className="mt-1 block text-muted-foreground">
                    Returns funds to the same card the customer used on web
                    Stripe Checkout or mobile PaymentSheet. Card details stay in
                    Stripe; this app only uses the PaymentIntent ID. A new
                    Checkout Session or Payment Link is not created, because
                    those collect money rather than refund it.
                  </span>
                </span>
              </label>
              <label
                htmlFor="refund-cod-manual"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <RadioGroupItem
                  value="cod_manual"
                  id="refund-cod-manual"
                  disabled={plan?.kind !== "cod_paid"}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Record refund without Stripe</span>
                  <span className="mt-1 block text-muted-foreground">
                    For cash on delivery after cash was collected. Confirms the
                    cash was returned to the customer. Does not create a Stripe
                    refund.
                  </span>
                </span>
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Inventory held for this order is released once when the refund is
              recorded. Duplicate Stripe webhooks will not restore stock again.
            </p>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Alert className="text-left">
          <AlertTitle>Inventory and payment</AlertTitle>
          <AlertDescription>
            Held stock is released exactly once. Unpaid Stripe payments are
            cancelled. Paid Stripe orders start a real refund to the original
            card. Unpaid COD stays unpaid/pending.
          </AlertDescription>
        </Alert>
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
