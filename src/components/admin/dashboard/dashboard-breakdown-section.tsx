"use client";

import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../../convex/_generated/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

const STATUS_COLORS = [
  "#6254f3",
  "#7c6df5",
  "#9488f7",
  "#a99af8",
  "#beacfa",
  "#8b5cf6",
  "#6b7280",
];

const statusChartConfig = {
  count: { label: "Orders", color: "var(--chart-1)" },
} satisfies ChartConfig;

const methodChartConfig = {
  count: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig;

const paymentChartConfig = {
  count: { label: "Orders", color: "var(--chart-3)" },
} satisfies ChartConfig;

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type DashboardBreakdownSectionProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardBreakdownSection({
  queryArgs,
}: DashboardBreakdownSectionProps) {
  const data = useQuery(api.adminDashboard.getBreakdowns, queryArgs);
  const loading = data === undefined;

  const statusData =
    data?.orderStatus.map((item) => ({
      name: formatStatusLabel(item.status),
      count: item.count,
    })) ?? [];

  const methodData =
    data?.paymentMethod.map((item) => ({
      name: item.label,
      count: item.count,
      percent: item.percent,
    })) ?? [];

  const paymentData =
    data?.paymentStatus.map((item) => ({
      name: formatStatusLabel(item.status),
      count: item.count,
    })) ?? [];

  const totalOrders = statusData.reduce((sum, item) => sum + item.count, 0);
  const empty = !loading && totalOrders === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DashboardSection
        title="Orders By Status"
        loading={loading}
        empty={empty}
        emptyTitle="No orders to analyze"
      >
        <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[280px]">
          <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={4}>
              {statusData.map((_, index) => (
                <Cell
                  key={`status-${index}`}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </DashboardSection>

      <DashboardSection
        title="Payment Method"
        loading={loading}
        empty={empty}
        emptyTitle="No payment data"
      >
        <ChartContainer config={methodChartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const percent = item?.payload?.percent;
                    return [
                      `${value} orders${typeof percent === "number" ? ` (${percent.toFixed(1)}%)` : ""}`,
                      item?.payload?.name,
                    ];
                  }}
                />
              }
            />
            <Pie
              data={methodData}
              dataKey="count"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
            >
              {methodData.map((_, index) => (
                <Cell
                  key={`method-${index}`}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {methodData.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      STATUS_COLORS[index % STATUS_COLORS.length],
                  }}
                />
                <span>{item.name}</span>
              </div>
              <span className="text-muted-foreground">
                {item.count} ({item.percent.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Payment Status"
        loading={loading}
        empty={empty}
        emptyTitle="No payment status data"
      >
        <ChartContainer config={paymentChartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={paymentData}
              dataKey="count"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
            >
              {paymentData.map((_, index) => (
                <Cell
                  key={`payment-${index}`}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </DashboardSection>
    </div>
  );
}
