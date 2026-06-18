"use client";

import { Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderDeliverySummaryProps = {
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  deliveryCharge?: number;
  shipping?: number;
  className?: string;
};

export function OrderDeliverySummary({
  deliveryMethodLabel,
  deliveryEstimate,
  deliveryCharge = 0,
  shipping = 0,
  className,
}: OrderDeliverySummaryProps) {
  if (!deliveryMethodLabel && shipping === 0 && deliveryCharge === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Truck className="size-4 text-[#6254f3]" />
        Shipping & delivery
      </div>
      {deliveryMethodLabel ? (
        <div className="flex items-start justify-between gap-3 text-sm">
          <div>
            <p className="font-medium text-foreground">{deliveryMethodLabel}</p>
            {deliveryEstimate ? (
              <p className="text-muted-foreground">Est. {deliveryEstimate}</p>
            ) : null}
          </div>
          {deliveryCharge > 0 ? (
            <span className="font-semibold tabular-nums">${deliveryCharge.toFixed(2)}</span>
          ) : (
            <span className="font-semibold text-emerald-600">Included</span>
          )}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="size-4" />
          Product shipping
        </div>
        <span className="font-semibold tabular-nums">
          {shipping <= 0 ? (
            <span className="text-emerald-600">Free</span>
          ) : (
            `$${shipping.toFixed(2)}`
          )}
        </span>
      </div>
    </div>
  );
}
