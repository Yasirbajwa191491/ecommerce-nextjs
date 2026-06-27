"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { History } from "lucide-react";

type ReviewAiHistoryProps = {
  reviewId: Id<"productReviews">;
};

export function ReviewAiHistory({ reviewId }: ReviewAiHistoryProps) {
  const history = useQuery(api.adminReviewAi.getGenerationHistory, {
    reviewId,
    limit: 20,
  });

  if (history === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            AI Generation History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading history…
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            AI Generation History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No generation history yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" />
          AI Generation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry._id}
            className="rounded-lg border p-3 text-sm space-y-1"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{entry.type}</Badge>
              <Badge variant="secondary">v{entry.version}</Badge>
              <span className="text-muted-foreground">
                {entry.provider} / {entry.model}
              </span>
              {entry.isActive ? (
                <Badge className="bg-emerald-600">active</Badge>
              ) : null}
              <Badge variant="outline">{entry.source}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
              {entry.durationMs != null
                ? ` · ${entry.durationMs}ms`
                : null}
              {entry.triggeredBy ? ` · by ${entry.triggeredBy}` : null}
            </p>
            <pre className="max-h-24 overflow-auto rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap">
              {entry.content}
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
