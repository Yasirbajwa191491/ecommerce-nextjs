import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type ProductPriceProps = {
  price: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md";
};

export function ProductPrice({
  price,
  currency,
  className,
  size = "md",
}: ProductPriceProps) {
  const code = currency ?? DEFAULT_CURRENCY;
  const originalPrice = Math.round(price * 1.1 * 100) / 100;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-bold text-[#6254f3]",
          size === "sm" ? "text-base" : "text-lg"
        )}
      >
        {formatCurrencyAmount(price, code)}
      </span>
      <span
        className={cn(
          "text-muted-foreground/80 line-through",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {formatCurrencyAmount(originalPrice, code)}
      </span>
    </div>
  );
}
