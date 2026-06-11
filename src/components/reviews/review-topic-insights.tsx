"use client";

import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Topic = {
  name: string;
  mentionCount: number;
};

type ReviewTopicInsightsProps = {
  topics?: Topic[];
  status?: "pending" | "complete" | "failed";
  className?: string;
};

export function ReviewTopicInsights({
  topics,
  status,
  className,
}: ReviewTopicInsightsProps) {
  if (status === "pending") {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (!topics?.length || status === "failed") return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BarChart3 className="size-4 text-muted-foreground" />
        Most Mentioned Topics
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Badge key={topic.name} variant="secondary" className="rounded-full">
            {topic.name}
            <span className="ml-1 text-muted-foreground">
              ({topic.mentionCount})
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
