"use client";

import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "../../../../convex/_generated/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

const chartConfig = {
  value: {
    label: "Orders",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type DashboardOrdersChartProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardOrdersChart({ queryArgs }: DashboardOrdersChartProps) {
  const data = useQuery(api.adminDashboard.getTrends, queryArgs);
  const loading = data === undefined;
  const series = data?.ordersSeries ?? [];
  const empty = !loading && series.every((point) => point.value === 0);

  return (
    <DashboardSection
      title="Orders Trend"
      description="Order volume over time"
      loading={loading}
      empty={empty}
      emptyTitle="No orders in this period"
      emptyDescription="Orders will appear here once customers start placing orders."
    >
      <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
        <BarChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
            allowDecimals={false}
            width={40}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="value"
            fill="#6254f3"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </DashboardSection>
  );
}
