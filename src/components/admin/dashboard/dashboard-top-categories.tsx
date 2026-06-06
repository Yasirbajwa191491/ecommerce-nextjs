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
import { formatCurrencyAmount } from "@/lib/currencies";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

type DashboardTopCategoriesProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardTopCategories({
  queryArgs,
}: DashboardTopCategoriesProps) {
  const data = useQuery(api.adminDashboard.getTopCategories, queryArgs);
  const loading = data === undefined;
  const categories = data?.categories ?? [];
  const currency = data?.currency ?? "USD";
  const empty = !loading && categories.length === 0;

  const chartData = categories.map((category) => ({
    name: category.categoryName,
    revenue: category.revenue,
    unitsSold: category.unitsSold,
  }));

  return (
    <DashboardSection
      title="Top Categories"
      description="Best performing categories by revenue"
      loading={loading}
      empty={empty}
      emptyTitle="No category sales"
      emptyDescription="Category performance will show after products are sold."
    >
      <ChartContainer config={chartConfig} className="mb-4 min-h-[240px] w-full">
        <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={72}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={72}
            tickFormatter={(value) =>
              formatCurrencyAmount(Number(value), currency)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => [
                  `${formatCurrencyAmount(Number(value), currency)} · ${item?.payload?.unitsSold ?? 0} units`,
                  "Revenue",
                ]}
              />
            }
          />
          <Bar dataKey="revenue" fill="#6254f3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>

      <div className="space-y-2">
        {categories.map((category, index) => (
          <div
            key={category.categoryId}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="font-medium">{category.categoryName}</span>
            </div>
            <div className="text-right text-muted-foreground">
              <p>{formatCurrencyAmount(category.revenue, currency)}</p>
              <p className="text-xs">{category.unitsSold} units sold</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
