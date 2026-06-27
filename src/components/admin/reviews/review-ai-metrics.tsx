"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function ReviewAiMetrics() {
  const metrics = useQuery(api.adminReviewAi.getAiMetrics, { days: 30 });

  if (metrics === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4" />
            AI Metrics (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading metrics…
        </CardContent>
      </Card>
    );
  }

  const successRate =
    metrics.totalGenerations > 0
      ? Math.round((metrics.successCount / metrics.totalGenerations) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4" />
          AI Metrics (30 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total generations" value={metrics.totalGenerations} />
        <MetricTile label="Success rate" value={`${successRate}%`} />
        <MetricTile label="Failed" value={metrics.failureCount} />
        <MetricTile
          label="Fallback activations"
          value={metrics.fallbackActivations}
        />
        <MetricTile label="Gemini failures" value={metrics.geminiFailures} />
        <MetricTile
          label="Avg generation time"
          value={`${metrics.avgDurationMs}ms`}
        />
        <div className="sm:col-span-2 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Provider usage
          </p>
          {metrics.byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {metrics.byProvider.map((row) => (
                <li key={row.provider} className="flex justify-between gap-4">
                  <span>{row.provider}</span>
                  <span className="text-muted-foreground">
                    {row.successCount} ok / {row.failureCount} fail
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
