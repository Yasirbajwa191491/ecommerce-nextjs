"use client";

import { formatCurrencyAmount } from "@/lib/currencies";
import type { PublicOrderItem } from "@/types/order";
import { normalizeClientOrderItem } from "@/lib/order-item-display";
import { cn } from "@/lib/utils";

type OrderItemPricingProps = {
  item: PublicOrderItem;
  currency: string;
  className?: string;
  compact?: boolean;
  hideLineTotal?: boolean;
};

export function OrderItemPricing({
  item,
  currency,
  className,
  compact = false,
  hideLineTotal = false,
}: OrderItemPricingProps) {
  const normalized = normalizeClientOrderItem(item);
  const hasDiscount = normalized.discountPercent > 0;

  if (compact) {
    return (
      <div className={cn("text-right text-sm", className)}>
        <p className="font-semibold tabular-nums">
          {formatCurrencyAmount(normalized.lineTotal, currency)}
        </p>
        {hasDiscount ? (
          <p className="text-xs text-rose-600">
            −{formatCurrencyAmount(normalized.lineDiscountTotal, currency)} off
          </p>
        ) : null}
        {normalized.lineShippingTotal > 0 ? (
          <p className="text-xs text-muted-foreground">
            +{formatCurrencyAmount(normalized.lineShippingTotal, currency)} shipping
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span>
          <span className="text-muted-foreground">Original: </span>
          {formatCurrencyAmount(normalized.originalUnitPrice, currency)}
        </span>
        {hasDiscount ? (
          <>
            <span>
              <span className="text-muted-foreground">Discount: </span>
              {normalized.discountPercent}%
            </span>
            <span className="text-rose-600">
              −{formatCurrencyAmount(normalized.lineDiscountTotal, currency)}
            </span>
          </>
        ) : null}
        <span>
          <span className="text-muted-foreground">Final: </span>
          {formatCurrencyAmount(normalized.finalUnitPrice, currency)}
        </span>
        {normalized.lineShippingTotal > 0 ? (
          <span>
            <span className="text-muted-foreground">Shipping: </span>
            {formatCurrencyAmount(normalized.lineShippingTotal, currency)}
          </span>
        ) : null}
      </div>
      {!hideLineTotal ? (
        <p className="font-semibold tabular-nums">
          Line total: {formatCurrencyAmount(normalized.lineTotal, currency)}
        </p>
      ) : null}
    </div>
  );
}
