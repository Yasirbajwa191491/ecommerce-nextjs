"use client";

import Link from "next/link";
import {
  CreditCard,
  Package,
  PackageCheck,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { formatActivityTimestamp } from "@/lib/admin/dashboard-range";
import type { DashboardQueryArgs } from "@/lib/admin/dashboard-range";
import { cn } from "@/lib/utils";

function ActivityIcon({ type }: { type: string }) {
  const className = "size-4 text-primary";

  if (type.includes("payment") || type.includes("paid")) {
    return <CreditCard className={className} />;
  }
  if (type.includes("shipped") || type.includes("ship")) {
    return <Truck className={className} />;
  }
  if (type.includes("delivered")) {
    return <PackageCheck className={className} />;
  }
  if (type.includes("cancel")) {
    return <XCircle className={className} />;
  }
  if (type.includes("product")) {
    return <Package className={className} />;
  }
  return <ShoppingCart className={className} />;
}

type DashboardActivityFeedProps = {
  queryArgs: DashboardQueryArgs;
};

export function DashboardActivityFeed({
  queryArgs,
}: DashboardActivityFeedProps) {
  const activity = useQuery(api.adminDashboard.getActivity, queryArgs);
  const loading = activity === undefined;
  const empty = !loading && activity.length === 0;

  return (
    <DashboardSection
      title="Recent Activity"
      description="Latest store and admin events"
      loading={loading}
      empty={empty}
      emptyTitle="No recent activity"
      emptyDescription="Order, payment, and product events will appear here."
    >
      <div className="space-y-0">
        {activity?.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "relative flex gap-3 py-4",
              index !== activity.length - 1 && "border-b"
            )}
          >
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ActivityIcon type={item.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatActivityTimestamp(item.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {item.actorName ? <span>By {item.actorName}</span> : null}
                {item.relatedOrderId ? (
                  <Link
                    href={`/admin/orders/${item.relatedOrderId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    View order
                  </Link>
                ) : null}
                {item.relatedProductId ? (
                  <Link
                    href={`/admin/products/${item.relatedProductId}/edit`}
                    className="font-medium text-primary hover:underline"
                  >
                    View product
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
