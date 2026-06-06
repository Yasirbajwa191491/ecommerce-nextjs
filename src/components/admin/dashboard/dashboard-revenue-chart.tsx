"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { api } from "../../../../convex/_generated/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { formatCurrencyAmount } from "@/lib/currencies";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

const chartConfig = {
  value: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const REVENUE_LINE_COLOR = "#6254f3";

type DashboardRevenueChartProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardRevenueChart({ queryArgs }: DashboardRevenueChartProps) {
  const data = useQuery(api.adminDashboard.getTrends, queryArgs);
  const loading = data === undefined;
  const series = data?.revenueSeries ?? [];
  const currency = data?.currency ?? "USD";
  const empty = !loading && series.every((point) => point.value === 0);

  const yMax = useMemo(() => {
    const max = Math.max(...series.map((point) => point.value), 0);
    return max > 0 ? Math.ceil(max * 1.1) : 1;
  }, [series]);

  return (
    <DashboardSection
      title="Revenue Trend"
      description="Paid order revenue over time"
      loading={loading}
      empty={empty}
      emptyTitle="No revenue in this period"
      emptyDescription="Revenue will appear once paid orders are recorded."
    >
      <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
        <LineChart data={series} margin={{ left: 8, right: 12, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={72}
            domain={[0, yMax]}
            tickFormatter={(value) =>
              formatCurrencyAmount(Number(value), currency)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  formatCurrencyAmount(Number(value), currency)
                }
              />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={REVENUE_LINE_COLOR}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (!payload || payload.value <= 0 || cx == null || cy == null) {
                return <g />;
              }
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={REVENUE_LINE_COLOR}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5, fill: REVENUE_LINE_COLOR, stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ChartContainer>
    </DashboardSection>
  );
}
