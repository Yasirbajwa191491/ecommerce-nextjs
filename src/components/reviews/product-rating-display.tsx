import { ProductStars } from "@/components/products/product-stars";
import { cn } from "@/lib/utils";

type ProductRatingDisplayProps = {
  rating: number;
  reviewCount: number;
  className?: string;
  showCount?: boolean;
  compact?: boolean;
};

export function ProductRatingDisplay({
  rating,
  reviewCount,
  className,
  showCount = true,
  compact = false,
}: ProductRatingDisplayProps) {
  if (reviewCount === 0) {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground",
          compact ? "h-5" : "",
          className
        )}
      >
        No Reviews Yet
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ProductStars rating={rating} />
      {showCount ? (
        <span className="text-xs text-muted-foreground">
          ({reviewCount.toLocaleString()}{" "}
          {reviewCount === 1 ? "review" : "reviews"})
        </span>
      ) : null}
    </div>
  );
}
