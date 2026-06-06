import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { Truck } from "lucide-react";

type ProductShippingBadgeProps = {
  freeShipping: boolean;
  shippingCharges?: number;
  currency?: string;
  className?: string;
  variant?: "default" | "compact";
};

export function ProductShippingBadge({
  freeShipping,
  shippingCharges = 0,
  currency,
  className,
  variant = "default",
}: ProductShippingBadgeProps) {
  const code = currency ?? DEFAULT_CURRENCY;

  if (freeShipping) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 sm:text-xs",
          className
        )}
      >
        {variant === "default" ? <Truck className="size-3 shrink-0" /> : null}
        Free Shipping
      </span>
    );
  }

  if (shippingCharges <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs",
        className
      )}
    >
      Shipping: {formatCurrencyAmount(shippingCharges, code)}
    </span>
  );
}
