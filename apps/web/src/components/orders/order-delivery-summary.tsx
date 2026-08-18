"use client";

import { Truck } from "lucide-react";
import FormatPrice from "@/helpers/FormatPrice";
import { cn } from "@/lib/utils";

type OrderDeliverySummaryProps = {
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  deliveryCharge?: number;
  shipping?: number;
  currency?: string;
  className?: string;
};

export function OrderDeliverySummary({
  deliveryMethod,
  deliveryMethodLabel,
  deliveryEstimate,
  deliveryCharge = 0,
  shipping = 0,
  currency,
  className,
}: OrderDeliverySummaryProps) {
  const isStandardDelivery =
    !deliveryMethod || deliveryMethod === "standard";
  const displayCharge = isStandardDelivery ? shipping : deliveryCharge;

  if (!deliveryMethodLabel && displayCharge === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4",
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
          <span
            className={cn(
              "font-semibold tabular-nums",
              displayCharge === 0 ? "text-emerald-600" : "text-foreground"
            )}
          >
            {displayCharge === 0 ? (
              "Free"
            ) : (
              <FormatPrice price={displayCharge} currency={currency} />
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
