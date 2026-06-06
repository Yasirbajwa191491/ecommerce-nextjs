"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DashboardFilterBar } from "@/components/admin/dashboard/dashboard-filter-bar";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-grid";
import { DashboardRevenueChart } from "@/components/admin/dashboard/dashboard-revenue-chart";
import { DashboardOrdersChart } from "@/components/admin/dashboard/dashboard-orders-chart";
import { DashboardBreakdownSection } from "@/components/admin/dashboard/dashboard-breakdown-section";
import { DashboardTopProductsTable } from "@/components/admin/dashboard/dashboard-top-products-table";
import { DashboardTopCategories } from "@/components/admin/dashboard/dashboard-top-categories";
import { DashboardRecentOrders } from "@/components/admin/dashboard/dashboard-recent-orders";
import { DashboardLowStock } from "@/components/admin/dashboard/dashboard-low-stock";
import { DashboardActivityFeed } from "@/components/admin/dashboard/dashboard-activity-feed";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "@/hooks/use-in-view";
import {
  buildDashboardQueryArgs,
  parseDashboardRange,
  parseDateParam,
} from "@/lib/admin/dashboard-range";

function DashboardContent() {
  const searchParams = useSearchParams();
  const range = parseDashboardRange(searchParams.get("range"));
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));

  const queryArgs = useMemo(
    () => buildDashboardQueryArgs(range, from, to),
    [range, from, to]
  );

  const { ref: belowFoldRef, inView: belowFoldVisible } = useInView<HTMLDivElement>({
    rootMargin: "200px",
  });

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of store performance, orders, and inventory."
      />

      <DashboardFilterBar />

      <div className="space-y-6">
        <DashboardKpiGrid queryArgs={queryArgs} />

        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardRevenueChart queryArgs={queryArgs} />
          <DashboardOrdersChart queryArgs={queryArgs} />
        </div>

        <DashboardBreakdownSection queryArgs={queryArgs} />

        <div ref={belowFoldRef} className="space-y-6">
          {belowFoldVisible ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <DashboardTopProductsTable queryArgs={queryArgs} />
                <DashboardTopCategories queryArgs={queryArgs} />
              </div>

              <DashboardRecentOrders queryArgs={queryArgs} />

              <div className="grid gap-4 xl:grid-cols-2">
                <DashboardLowStock />
                <DashboardActivityFeed queryArgs={queryArgs} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
