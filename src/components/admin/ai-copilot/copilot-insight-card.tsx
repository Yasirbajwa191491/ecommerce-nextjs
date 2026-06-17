"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CopilotInsightCard } from "@/lib/ai-copilot-content";
import { CopilotProductLink } from "./copilot-product-link";

function trendIcon(trend?: "up" | "down" | "flat") {
  if (!trend || trend === "flat") {
    return <Minus className="size-3 text-muted-foreground" />;
  }
  if (trend === "up") {
    return <TrendingUp className="size-3 text-emerald-600" />;
  }
  return <TrendingDown className="size-3 text-red-500" />;
}

function badgeClass(tone: CopilotInsightCard["badges"][number]["tone"]) {
  if (tone === "positive") return "bg-emerald-600/15 text-emerald-700";
  if (tone === "warning") return "bg-amber-500/15 text-amber-700";
  if (tone === "risk") return "bg-destructive/15 text-destructive";
  return "";
}

type CopilotInsightCardProps = {
  card: CopilotInsightCard;
};

export function CopilotInsightCard({ card }: CopilotInsightCardProps) {
  return (
    <Card className="border-primary/10 bg-background/60">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
          {card.badges.length > 0 ? (
            <Badge variant="secondary" className={cn("text-[11px]", badgeClass(card.badges[0].tone))}>
              {card.badges[0].label}
            </Badge>
          ) : null}
        </div>
        {card.subtitle ? (
          <p className="text-sm text-muted-foreground">{card.subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {card.metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                {trendIcon(metric.trend)}
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {card.recommendation ? (
          <p className="text-xs text-foreground">
            <span className="font-semibold">Recommendation:</span> {card.recommendation}
          </p>
        ) : null}
        {card.reason ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Reason:</span> {card.reason}
          </p>
        ) : null}
        <CopilotProductLink productId={card.productId} productName={card.productName} />
      </CardContent>
    </Card>
  );
}
