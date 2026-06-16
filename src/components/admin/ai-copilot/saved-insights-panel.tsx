import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bookmark, Trash2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { CopilotResponseView } from "@/lib/ai-copilot-content";

type SavedInsightItem = {
  _id: Id<"aiCopilotSavedInsights">;
  question: string;
  response: CopilotResponseView;
  createdAt: number;
};

type SavedInsightsPanelProps = {
  insights: SavedInsightItem[] | undefined;
  onDelete: (id: Id<"aiCopilotSavedInsights">) => void;
  compact?: boolean;
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function SavedInsightsPanel({
  insights,
  onDelete,
  compact = false,
}: SavedInsightsPanelProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Bookmark className="size-4 shrink-0 text-primary" />
          <span className="truncate">Saved Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-0 px-4 pb-4">
        <ScrollArea
          className={cn(
            "min-w-0",
            compact ? "max-h-[min(280px,45vh)]" : "max-h-[min(320px,50vh)] xl:max-h-[280px]"
          )}
        >
          {insights === undefined ? (
            <div className="space-y-2 pr-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : insights.length === 0 ? (
            <p className="pr-3 text-sm leading-relaxed text-muted-foreground">
              Save useful AI responses to revisit key business insights later.
            </p>
          ) : (
            <div className="space-y-3 pr-3">
              {insights.map((insight) => (
                <div
                  key={insight._id}
                  className="group rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {insight.question}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {insight.response.summary}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {formatDate(insight.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 opacity-100 xl:opacity-0 xl:group-hover:opacity-100"
                      onClick={() => onDelete(insight._id)}
                      aria-label="Delete saved insight"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
