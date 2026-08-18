import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductStarsProps = {
  rating: number;
  className?: string;
  /** Show numeric rating text after stars (default true) */
  showValue?: boolean;
  size?: "sm" | "md";
};

export function ProductStars({
  rating,
  className,
  showValue = true,
  size = "md",
}: ProductStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const starSize = size === "sm" ? "size-3.5" : "size-4 sm:size-[1.125rem]";
  const valueClass =
    size === "sm"
      ? "ml-1.5 text-xs font-medium text-muted-foreground tabular-nums"
      : "ml-1.5 text-sm font-medium text-muted-foreground tabular-nums sm:text-base";

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = clamped >= index + 1;
        const half = !filled && clamped > index && clamped < index + 1;
        return (
          <Star
            key={index}
            className={cn(
              "shrink-0",
              starSize,
              filled || half
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        );
      })}
      {showValue ? (
        <span className={valueClass}>
          {clamped.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
