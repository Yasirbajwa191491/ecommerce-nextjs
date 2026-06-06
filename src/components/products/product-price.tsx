import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import { calculateFinalPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type ProductPriceProps = {
  price: number;
  discountPercent?: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md";
};

export function ProductPrice({
  price,
  discountPercent = 0,
  currency,
  className,
  size = "md",
}: ProductPriceProps) {
  const code = currency ?? DEFAULT_CURRENCY;
  const hasDiscount = discountPercent > 0;
  const finalPrice = hasDiscount
    ? calculateFinalPrice(price, discountPercent)
    : price;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-bold text-[#6254f3]",
          size === "sm" ? "text-base" : "text-lg"
        )}
      >
        {formatCurrencyAmount(finalPrice, code)}
      </span>
      {hasDiscount ? (
        <span
          className={cn(
            "text-muted-foreground/80 line-through",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {formatCurrencyAmount(price, code)}
        </span>
      ) : null}
    </div>
  );
}
