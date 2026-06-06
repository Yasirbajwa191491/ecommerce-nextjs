"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { DashboardKpiCard } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ButtonLink } from "@/components/ui/button";

export default function EmailMarketingDashboardPage() {
  const kpis = useQuery(api.emailMarketingDashboard.getKpis);

  const formatRate = (rate: number | null) =>
    rate === null ? "—" : `${rate.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Email Marketing"
        description="Create templates, run promotional campaigns, and manage newsletter subscribers."
      />

      <AdminListToolbar
        hideTabs
        showSearch={false}
        search=""
        onSearchChange={() => {}}
        action={
          <>
            <ButtonLink
              variant="outline"
              size="sm"
              href="/admin/email-marketing/templates/create"
            >
              New template
            </ButtonLink>
            <ButtonLink size="sm" href="/admin/email-marketing/campaigns/create">
              New campaign
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <DashboardKpiCard
          title="Total Subscribers"
          value={kpis ? String(kpis.totalSubscribers) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
        <DashboardKpiCard
          title="Total Campaigns Sent"
          value={kpis ? String(kpis.totalCampaignsSent) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
        <DashboardKpiCard
          title="Emails Sent Today"
          value={kpis ? String(kpis.emailsSentToday) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
        <DashboardKpiCard
          title="Total Email Templates"
          value={kpis ? String(kpis.totalTemplates) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
        <DashboardKpiCard
          title="Average Open Rate"
          value={kpis ? formatRate(kpis.averageOpenRate) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
        <DashboardKpiCard
          title="Average Click Rate"
          value={kpis ? formatRate(kpis.averageClickRate) : "—"}
          changePercent={null}
          trend="flat"
          loading={kpis === undefined}
        />
      </div>
    </div>
  );
}
