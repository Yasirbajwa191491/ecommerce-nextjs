"use client";

import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ReviewAiSummaryProps = {
  summary?: string;
  status?: "pending" | "complete" | "failed";
  className?: string;
};

export function ReviewAiSummary({
  summary,
  status,
  className,
}: ReviewAiSummaryProps) {
  if (status === "pending") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-5", className)}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-16 w-full" />
      </div>
    );
  }

  if (!summary || status === "failed") return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-200/60 bg-violet-50/50 p-5 dark:border-violet-900/40 dark:bg-violet-950/20",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        <Sparkles className="size-4" />
        AI Review Summary
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
        {summary}
      </p>
    </div>
  );
}
