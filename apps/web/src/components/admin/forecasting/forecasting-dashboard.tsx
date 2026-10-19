"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { api } from "@convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { weeklyTotals } from "@convex/lib/forecasting/eligibility";
import { toastError, toastSuccess } from "@/lib/app-toast";

const chartConfig = {
  predicted: { label: "Predicted units", color: "var(--chart-1)" },
  lower: { label: "Lower estimate", color: "var(--chart-2)" },
  upper: { label: "Upper estimate", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ForecastingDashboard() {
  const status = useQuery(api.forecasting.adminStatus, {});
  const [risk, setRisk] = useState("all");
  const [trend, setTrend] = useState("all");
  const [leadTime, setLeadTime] = useState("");
  const [publishing, setPublishing] = useState(false);
  const dashboard = useQuery(api.forecasting.dashboard, {
    risk: risk === "all" ? undefined : risk,
    trend: trend === "all" ? undefined : trend,
  });
  const publish = useAction(api.forecasting.publish);

  if (status === undefined || dashboard === undefined) {
    return (
      <DashboardSection title="Demand forecasting" loading>
        <span />
      </DashboardSection>
    );
  }

  const chart = (dashboard.store ?? []).map((point) => ({
    label: point.forecastDate.slice(5),
    predicted: point.predictedUnits,
    lower: status.showUncertainty ? point.lowerUnits : point.predictedUnits,
    upper: status.showUncertainty ? point.upperUnits : point.predictedUnits,
  }));
  const weekly = weeklyTotals(
    (dashboard.store ?? []).map((point) => point.forecastDate),
    (dashboard.store ?? []).map((point) => point.predictedUnits)
  );
  const horizonUnits = (dashboard.store ?? []).reduce((sum, point) => sum + point.predictedUnits, 0);
  const stockoutCount = (dashboard.insights ?? []).filter((row) => row.stockoutRisk === "high").length;
  const synthetic = dashboard.publication?.datasetLabel?.includes("synthetic") ?? false;

  async function onPublish() {
    setPublishing(true);
    try {
      const parsed = leadTime.trim() ? Number.parseInt(leadTime, 10) : undefined;
      await publish({ leadTimeDays: Number.isFinite(parsed) ? parsed : undefined });
      toastSuccess("Forecast published");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Forecast publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Demand forecasting"
        description="Unit-demand estimates from paid sales. These are not guaranteed sales, and they do not change inventory."
        action={
          <Button size="sm" onClick={onPublish} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish forecast"}
          </Button>
        }
      />
      {!status.enabled ? (
        <DashboardSection
          title="Forecasting is off"
          description={status.reason.replaceAll("_", " ")}
          empty
          emptyTitle="No published forecast"
          emptyDescription="Turn on Enable Demand Forecasting, set both deployment gates, train demand-forecast-v1, and publish a snapshot."
        >
          <span />
        </DashboardSection>
      ) : null}
      {synthetic ? (
        <p className="text-sm text-amber-700">
          Accuracy attached to this model was measured on synthetic data, not live store performance.
        </p>
      ) : null}
      {status.statisticallyWeak && dashboard.publication ? (
        <p className="text-sm text-muted-foreground">
          The training history was short, so this snapshot is statistically weak.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Forecasted units" value={horizonUnits.toFixed(1)} />
        <Metric label="High stockout risk" value={String(stockoutCount)} />
        <Metric label="Model" value={status.modelVersion || "Unpublished"} />
        <Metric label="Data cutoff" value={status.dataCutoff || "Unavailable"} />
      </div>
      <DashboardSection
        title="Store forecast"
        description="Future predicted units. The shaded band is an empirical residual range, not a promise."
        empty={chart.length === 0}
        emptyTitle="No forecast points"
        emptyDescription="Publish a forecast after eligible paid orders exist."
      >
        <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
          <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {status.showUncertainty ? (
              <Area dataKey="upper" stroke="none" fill="#6254f3" fillOpacity={0.12} />
            ) : null}
            <Line dataKey="predicted" stroke="#6254f3" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartContainer>
      </DashboardSection>
      <p className="text-sm text-muted-foreground">
        Weekly totals: {weekly.map((item) => `${item.label} ${item.units}`).join(", ") || "Unavailable"}
      </p>
      <div className="flex flex-wrap gap-3">
        <Select value={risk} onValueChange={(value) => setRisk(value ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Stockout risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={trend} onValueChange={(value) => setTrend(value ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Trend" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trends</SelectItem>
            <SelectItem value="up">Growing</SelectItem>
            <SelectItem value="down">Declining</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="insufficient">Insufficient</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-44"
          inputMode="numeric"
          placeholder="Lead time days"
          value={leadTime}
          onChange={(event) => setLeadTime(event.target.value)}
          aria-label="Lead time days"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Forecast units</TableHead>
              <TableHead>Days left</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(dashboard.insights ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No products match these filters.</TableCell>
              </TableRow>
            ) : (
              dashboard.insights.map((row) => (
                <TableRow key={row.entityId}>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.currentStock ?? "Unknown"}</TableCell>
                  <TableCell>{row.forecastUnits}</TableCell>
                  <TableCell>{row.daysRemaining ?? "Unavailable"}</TableCell>
                  <TableCell>{row.stockoutRisk}</TableCell>
                  <TableCell>{row.modelName}</TableCell>
                  <TableCell>{row.confidence}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {dashboard.publication ? (
        <p className="text-sm text-muted-foreground">
          {dashboard.publication.modelVersion} trained {dashboard.publication.trainedAt || "unknown"}, strategy{" "}
          {dashboard.publication.strategy}, horizon {dashboard.publication.horizonDays} days.{" "}
          {dashboard.publication.uncertaintyLabel}. Published forecasts are sales-based estimates because historical stock levels are not stored.
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
