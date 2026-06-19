"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

const PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Order Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const TERMINAL_STATUSES: Record<string, { label: string; className: string }> = {
  cancelled: { label: "Order cancelled", className: "text-destructive" },
  refunded: { label: "Order refunded", className: "text-destructive" },
  failed: { label: "Order failed", className: "text-destructive" },
  expired: { label: "Checkout expired", className: "text-muted-foreground" },
};

function getActiveStepIndex(status: OrderStatus) {
  const directIndex = PROGRESS_STEPS.findIndex((step) => step.key === status);
  if (directIndex >= 0) return directIndex;

  const statusOrder: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  const index = statusOrder.indexOf(status);
  return index >= 0 ? index : 0;
}

type OrderProgressTimelineProps = {
  status: OrderStatus;
  className?: string;
};

export function OrderProgressTimeline({
  status,
  className,
}: OrderProgressTimelineProps) {
  const terminal = TERMINAL_STATUSES[status];
  if (terminal) {
    return (
      <div className={cn("rounded-xl border bg-muted/30 p-4 text-center", className)}>
        <p className={cn("text-sm font-medium", terminal.className)}>
          {terminal.label}
        </p>
      </div>
    );
  }

  const activeIndex = getActiveStepIndex(status);

  return (
    <>
      {/* Phone: vertical step list — avoids cramped 5-column grid */}
      <ol className={cn("flex flex-col gap-2 sm:hidden", className)}>
        {PROGRESS_STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                isCurrent && "border-[#6254f3] bg-[#6254f3]/5",
                isComplete && "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              {isComplete || isCurrent ? (
                <CheckCircle2
                  className={cn(
                    "size-5 shrink-0",
                    isCurrent ? "text-[#6254f3]" : "text-emerald-600"
                  )}
                />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-[#6254f3]",
                  !isComplete && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Tablet+ : horizontal progress grid */}
      <ol
        className={cn(
          "hidden w-full grid-cols-5 gap-2 sm:grid md:gap-4",
          className
        )}
      >
        {PROGRESS_STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <li
              key={step.key}
              className={cn(
                "flex min-w-0 flex-col items-center gap-2 rounded-xl border p-3 text-center",
                isCurrent && "border-[#6254f3] bg-[#6254f3]/5",
                isComplete && "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              {isComplete || isCurrent ? (
                <CheckCircle2
                  className={cn(
                    "size-5 shrink-0",
                    isCurrent ? "text-[#6254f3]" : "text-emerald-600"
                  )}
                />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  isCurrent && "text-[#6254f3]",
                  !isComplete && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

type StatusHistoryItem = {
  event: string;
  description: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  createdAt: number;
};

export function OrderStatusHistory({
  history,
  className,
}: {
  history: StatusHistoryItem[];
  className?: string;
}) {
  if (!history.length) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No status history available yet.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-4", className)}>
      {history.map((entry, index) => (
        <li key={`${entry.createdAt}-${index}`} className="relative pl-6">
          <span className="absolute top-1.5 left-0 size-2 rounded-full bg-[#6254f3]" />
          <p className="text-sm font-medium">{entry.description}</p>
          <p className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(entry.createdAt))}
          </p>
        </li>
      ))}
    </ol>
  );
}
