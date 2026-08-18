"use client";

import FormatPrice from "@/helpers/FormatPrice";
import { SHOP_PRICE_TOTAL } from "@/lib/typography";
import { cn } from "@/lib/utils";

type OrderSummaryBreakdownProps = {
  subtotal: number;
  discountTotal?: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  deliveryCharge?: number;
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  className?: string;
  showProductsLabel?: boolean;
};

export function OrderSummaryBreakdown({
  subtotal,
  discountTotal = 0,
  shipping = 0,
  deliveryCharge = 0,
  deliveryMethod,
  deliveryMethodLabel,
  tax = 0,
  total,
  currency,
  className,
  showProductsLabel = false,
}: OrderSummaryBreakdownProps) {
  const isStandardDelivery =
    !deliveryMethod || deliveryMethod === "standard";
  const shippingLabel = isStandardDelivery
    ? (deliveryMethodLabel ?? "Shipping")
    : "Shipping";

  return (
    <div className={cn("space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {showProductsLabel ? "Products total" : "Subtotal"}
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          <FormatPrice price={subtotal} currency={currency} />
        </span>
      </div>
      {discountTotal > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span className="font-semibold tabular-nums text-rose-600">
            −<FormatPrice price={discountTotal} currency={currency} />
          </span>
        </div>
      ) : null}
      {isStandardDelivery ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{shippingLabel}</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              shipping === 0 ? "text-emerald-600" : "text-foreground"
            )}
          >
            {shipping === 0 ? (
              "Free"
            ) : (
              <FormatPrice price={shipping} currency={currency} />
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {deliveryMethodLabel ?? "Delivery"}
          </span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              deliveryCharge === 0 ? "text-emerald-600" : "text-foreground"
            )}
          >
            {deliveryCharge === 0 ? (
              "Free"
            ) : (
              <FormatPrice price={deliveryCharge} currency={currency} />
            )}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Tax</span>
        <span className="font-semibold tabular-nums text-foreground">
          <FormatPrice price={tax} currency={currency} />
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-base font-semibold text-foreground">Grand total</span>
        <span className={SHOP_PRICE_TOTAL}>
          <FormatPrice price={total} currency={currency} />
        </span>
      </div>
    </div>
  );
}
