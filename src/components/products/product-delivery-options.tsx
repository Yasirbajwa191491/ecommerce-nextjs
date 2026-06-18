"use client";

import { Truck } from "lucide-react";
import type { ProductDisplaySource } from "@/lib/product-display-helpers";
import {
  DELIVERY_METHOD_LABELS,
  describeDeliveryOption,
  getEnabledDeliveryOptions,
} from "@/lib/product-display-helpers";
import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type ProductDeliveryOptionsProps = {
  product: ProductDisplaySource & { currency?: string | null };
  className?: string;
};

export function ProductDeliveryOptions({
  product,
  className,
}: ProductDeliveryOptionsProps) {
  const options = getEnabledDeliveryOptions(product);
  if (options.length === 0) return null;

  const currency = product.currency ?? DEFAULT_CURRENCY;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Truck className="size-4 text-[#6254f3]" />
        <h3 className="text-sm font-semibold text-foreground">
          Delivery options
        </h3>
      </div>
      <ul className="space-y-2">
        {options.map((option) => {
          const described = describeDeliveryOption(product, option.type);
          if (!described) return null;
          return (
            <li
              key={option.type}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{described.label}</p>
                <p className="text-xs text-muted-foreground">
                  {described.estimate}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {described.charge <= 0
                  ? "Free"
                  : formatCurrencyAmount(described.charge, currency)}
              </span>
            </li>
          );
        })}
      </ul>
      {product.shipping === true ? (
        <p className="mt-3 text-xs text-emerald-600">
          Standard delivery includes free shipping on this product.
        </p>
      ) : null}
    </div>
  );
}
