import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ConfidenceIndicatorProps = {
  confidence: number;
  className?: string;
  showLabel?: boolean;
};

export function ConfidenceIndicator({
  confidence,
  className,
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const value = Math.max(0, Math.min(100, Math.round(confidence)));

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium tabular-nums text-foreground">{value}%</span>
        </div>
      ) : null}
      <Progress value={value} className="h-2" />
    </div>
  );
}
