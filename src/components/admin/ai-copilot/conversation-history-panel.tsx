import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { History, Plus, Trash2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

type ConversationItem = {
  _id: Id<"aiCopilotConversations">;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type ConversationHistoryPanelProps = {
  conversations: ConversationItem[] | undefined;
  activeConversationId: Id<"aiCopilotConversations"> | null;
  onSelect: (id: Id<"aiCopilotConversations">) => void;
  onNew: () => void;
  onDelete: (id: Id<"aiCopilotConversations">) => void;
  compact?: boolean;
};

function formatRelativeTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function ConversationHistoryPanel({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  compact = false,
}: ConversationHistoryPanelProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <History className="size-4 shrink-0 text-primary" />
          <span className="truncate">Conversation History</span>
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNew}
          className="shrink-0"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 p-0 px-4 pb-4">
        <ScrollArea
          className={cn(
            "min-w-0",
            compact ? "max-h-[min(280px,45vh)]" : "max-h-[min(320px,50vh)] xl:max-h-[280px]"
          )}
        >
          {conversations === undefined ? (
            <div className="space-y-2 pr-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="pr-3 text-sm leading-relaxed text-muted-foreground">
              No conversations yet. Ask your first business question to get
              started.
            </p>
          ) : (
            <div className="space-y-2 pr-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={cn(
                    "group flex items-start gap-2 rounded-lg border p-3 transition-colors",
                    activeConversationId === conversation._id
                      ? "border-primary/30 bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(conversation._id)}
                  >
                    <p className="truncate text-sm font-medium">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updatedAt)}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-100 xl:opacity-0 xl:group-hover:opacity-100"
                    onClick={() => onDelete(conversation._id)}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
