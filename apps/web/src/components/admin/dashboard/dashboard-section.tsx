"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardEmptyState } from "@/components/admin/dashboard/dashboard-empty-state";

type DashboardSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  action,
  loading = false,
  empty = false,
  emptyTitle = "No data available",
  emptyDescription,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-1">{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : empty ? (
          <DashboardEmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
