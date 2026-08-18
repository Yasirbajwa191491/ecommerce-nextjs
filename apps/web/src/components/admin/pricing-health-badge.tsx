import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PricingHealthStatus = "optimal" | "underpriced" | "overpriced";

const STATUS_CONFIG: Record<
  PricingHealthStatus,
  { label: string; className: string }
> = {
  optimal: {
    label: "Optimally Priced",
    className: "bg-emerald-600/15 text-emerald-700 border-emerald-600/20",
  },
  underpriced: {
    label: "Potentially Underpriced",
    className: "bg-amber-500/15 text-amber-800 border-amber-500/20",
  },
  overpriced: {
    label: "Potentially Overpriced",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
};

type PricingHealthBadgeProps = {
  status: PricingHealthStatus;
  className?: string;
};

export function PricingHealthBadge({ status, className }: PricingHealthBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
