import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductStarsProps = {
  rating: number;
  className?: string;
};

export function ProductStars({ rating, className }: ProductStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));

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
              "size-3.5 shrink-0",
              filled || half
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        );
      })}
      <span className="ml-1.5 text-xs font-medium text-muted-foreground tabular-nums">
        {clamped.toFixed(1)}
      </span>
    </div>
  );
}
