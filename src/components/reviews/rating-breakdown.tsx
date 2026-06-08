import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type DistributionItem = {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  percent: number;
};

type RatingBreakdownProps = {
  distribution: DistributionItem[];
  className?: string;
};

export function RatingBreakdown({
  distribution,
  className,
}: RatingBreakdownProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {distribution.map((item) => (
        <div key={item.stars} className="flex items-center gap-3 text-sm">
          <div className="flex w-16 shrink-0 items-center gap-1">
            <span className="tabular-nums">{item.stars}</span>
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${item.percent}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {item.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}
