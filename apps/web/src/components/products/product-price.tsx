import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import { calculateFinalPrice } from "@/lib/pricing";
import { SHOP_LINE_ITEM_PRICE, SHOP_PRICE_PRIMARY } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ProductPriceProps = {
  price: number;
  discountPercent?: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
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

  const priceClass =
    size === "sm"
      ? SHOP_LINE_ITEM_PRICE
      : size === "lg"
        ? SHOP_PRICE_PRIMARY
        : "text-xl font-bold tabular-nums text-foreground sm:text-2xl";

  const strikeClass =
    size === "sm"
      ? "text-sm sm:text-base"
      : size === "lg"
        ? "text-base sm:text-lg"
        : "text-sm sm:text-base";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("text-[#6254f3]", priceClass)}>
        {formatCurrencyAmount(finalPrice, code)}
      </span>
      {hasDiscount ? (
        <span
          className={cn(
            "text-muted-foreground/80 line-through",
            strikeClass
          )}
        >
          {formatCurrencyAmount(price, code)}
        </span>
      ) : null}
    </div>
  );
}
