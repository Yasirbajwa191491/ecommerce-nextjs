import { ProductStars } from "@/components/products/product-stars";
import { PRODUCT_CARD_RATING } from "@/lib/typography";
import { cn } from "@/lib/utils";
type ProductRatingDisplayProps = {
  rating: number;
  reviewCount: number;
  className?: string;
  showCount?: boolean;
  compact?: boolean;
  size?: "sm" | "md";
};

export function ProductRatingDisplay({
  rating,
  reviewCount,
  className,
  showCount = true,
  compact = false,
  size,
}: ProductRatingDisplayProps) {
  const resolvedSize = size ?? (compact ? "sm" : "md");

  if (reviewCount === 0) {
    return (
      <p
        className={cn(
          PRODUCT_CARD_RATING,
          resolvedSize === "sm" ? "h-5" : "min-h-6",
          className
        )}
      >
        No Reviews Yet
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ProductStars rating={rating} size={resolvedSize} />
      {showCount ? (
        <span
          className={cn(PRODUCT_CARD_RATING)}
        >
          ({reviewCount.toLocaleString()}{" "}
          {reviewCount === 1 ? "review" : "reviews"})
        </span>
      ) : null}
    </div>
  );
}
