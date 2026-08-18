"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPercentChange } from "@/lib/admin/dashboard-range";

type DashboardKpiCardProps = {
  title: string;
  value: string;
  changePercent: number | null;
  trend: "up" | "down" | "flat";
  loading?: boolean;
  positiveIsGood?: boolean;
};

function TrendIcon({
  trend,
  positiveIsGood,
}: {
  trend: "up" | "down" | "flat";
  positiveIsGood: boolean;
}) {
  const isPositive =
    trend === "up"
      ? positiveIsGood
      : trend === "down"
        ? !positiveIsGood
        : true;

  if (trend === "flat") {
    return <Minus className="size-3.5 text-muted-foreground" />;
  }
  if (trend === "up") {
    return (
      <TrendingUp
        className={cn("size-3.5", isPositive ? "text-emerald-600" : "text-red-500")}
      />
    );
  }
  return (
    <TrendingDown
      className={cn("size-3.5", isPositive ? "text-emerald-600" : "text-red-500")}
    />
  );
}

export function DashboardKpiCard({
  title,
  value,
  changePercent,
  trend,
  loading = false,
  positiveIsGood = true,
}: DashboardKpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const changeLabel = formatPercentChange(changePercent);
  const isPositive =
    trend === "up"
      ? positiveIsGood
      : trend === "down"
        ? !positiveIsGood
        : true;

  return (
    <Card>
      <CardHeader className="px-4 pb-1 pt-4 sm:pb-2">
        <CardTitle className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
          {value}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] sm:mt-2 sm:gap-1.5 sm:text-xs">
          <TrendIcon trend={trend} positiveIsGood={positiveIsGood} />
          <span
            className={cn(
              "font-medium",
              trend === "flat"
                ? "text-muted-foreground"
                : isPositive
                  ? "text-emerald-600"
                  : "text-red-500"
            )}
          >
            {changeLabel}
          </span>
          <span className="text-muted-foreground max-sm:hidden">vs previous period</span>
          <span className="text-muted-foreground sm:hidden">vs prev.</span>
        </div>
      </CardContent>
    </Card>
  );
}
