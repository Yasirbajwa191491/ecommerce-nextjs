"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DashboardKpiCard } from "@/components/admin/dashboard/dashboard-kpi-card";
import { formatCurrencyAmount } from "@/lib/currencies";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";

type DashboardKpiGridProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardKpiGrid({ queryArgs }: DashboardKpiGridProps) {
  const data = useQuery(api.adminDashboard.getKpis, queryArgs);
  const loading = data === undefined;

  const currency = data?.currency ?? "USD";

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      <DashboardKpiCard
        title="Total Revenue"
        value={
          loading
            ? "—"
            : formatCurrencyAmount(data.totalRevenue.value, currency)
        }
        changePercent={data?.totalRevenue.changePercent ?? null}
        trend={data?.totalRevenue.trend ?? "flat"}
        loading={loading}
      />
      <DashboardKpiCard
        title="Total Orders"
        value={loading ? "—" : String(data.totalOrders.value)}
        changePercent={data?.totalOrders.changePercent ?? null}
        trend={data?.totalOrders.trend ?? "flat"}
        loading={loading}
      />
      <DashboardKpiCard
        title="Paid Orders"
        value={loading ? "—" : String(data.paidOrders.value)}
        changePercent={data?.paidOrders.changePercent ?? null}
        trend={data?.paidOrders.trend ?? "flat"}
        loading={loading}
      />
      <DashboardKpiCard
        title="Pending Orders"
        value={loading ? "—" : String(data.pendingOrders.value)}
        changePercent={data?.pendingOrders.changePercent ?? null}
        trend={data?.pendingOrders.trend ?? "flat"}
        loading={loading}
        positiveIsGood={false}
      />
      <DashboardKpiCard
        title="Total Customers"
        value={loading ? "—" : String(data.totalCustomers.value)}
        changePercent={data?.totalCustomers.changePercent ?? null}
        trend={data?.totalCustomers.trend ?? "flat"}
        loading={loading}
      />
      <DashboardKpiCard
        title="Average Order Value"
        value={
          loading
            ? "—"
            : formatCurrencyAmount(data.averageOrderValue.value, currency)
        }
        changePercent={data?.averageOrderValue.changePercent ?? null}
        trend={data?.averageOrderValue.trend ?? "flat"}
        loading={loading}
      />
    </div>
  );
}
