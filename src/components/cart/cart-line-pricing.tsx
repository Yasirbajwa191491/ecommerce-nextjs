"use client";

import FormatPrice from "@/helpers/FormatPrice";
import { cn } from "@/lib/utils";

export type CartPricedLine = {
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  lineTotal: number;
  lineShippingTotal: number;
};

type CartLinePricingDetailsProps = {
  priced: CartPricedLine;
  currency?: string;
  compact?: boolean;
  className?: string;
};

export function CartLinePricingDetails({
  priced,
  currency,
  compact = false,
  className,
}: CartLinePricingDetailsProps) {
  const hasDiscount = priced.discountPercent > 0;

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-semibold tabular-nums text-foreground">
          <FormatPrice price={priced.finalUnitPrice} currency={currency} />
        </span>
        {hasDiscount ? (
          <span className="text-xs text-muted-foreground line-through">
            <FormatPrice price={priced.originalUnitPrice} currency={currency} />
          </span>
        ) : null}
        {!compact ? (
          <span className="text-xs text-muted-foreground">each</span>
        ) : null}
      </div>
      {hasDiscount ? (
        <p className="text-xs text-rose-600">
          −<FormatPrice price={priced.lineDiscountTotal} currency={currency} /> discount
          {priced.discountPercent > 0 ? ` (${priced.discountPercent}% off)` : null}
        </p>
      ) : null}
      {priced.lineShippingTotal > 0 ? (
        <p className="text-xs text-muted-foreground">
          Shipping:{" "}
          <FormatPrice price={priced.lineShippingTotal} currency={currency} />
        </p>
      ) : null}
    </div>
  );
}
