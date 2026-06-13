"use client";

import { useCallback, useMemo, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bot, MessageSquare, Mic, User, Wrench } from "lucide-react";

const PAGE_SIZE = 12;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatDuration(ms: number | null) {
  if (ms === null || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function RoleBadge({
  role,
}: {
  role: "user" | "assistant" | "tool" | "system";
}) {
  const config = {
    user: {
      label: "Customer",
      icon: User,
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    assistant: {
      label: "Assistant",
      icon: Bot,
      className: "bg-violet-50 text-violet-700 border-violet-200",
    },
    tool: {
      label: "Tool",
      icon: Wrench,
      className: "bg-amber-50 text-amber-800 border-amber-200",
    },
    system: {
      label: "System",
      icon: MessageSquare,
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
  }[role];

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

function ConversationTimeline({
  conversationId,
}: {
  conversationId: Id<"vapiConversations">;
}) {
  const detail = useQuery(api.vapi.admin.getConversationDetail, { conversationId });

  if (detail === undefined) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Conversation not found.</p>
    );
  }

  const { conversation, logs } = detail;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-muted/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={conversation.channel === "voice" ? "default" : "secondary"}
              >
                {conversation.channel === "voice" ? (
                  <span className="inline-flex items-center gap-1">
                    <Mic className="size-3" /> Voice
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3" /> Chat
                  </span>
                )}
              </Badge>
              <Badge variant="outline">
                {conversation.status === "ended" ? "Ended" : "Active"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Started {formatDate(conversation.startedAt)}
              {conversation.endedAt
                ? ` · Ended ${formatDate(conversation.endedAt)}`
                : ""}
              {conversation.durationMs !== null
                ? ` · Duration ${formatDuration(conversation.durationMs)}`
                : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
              Call ID: {conversation.vapiCallId}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat label="Messages" value={conversation.messageCount} />
            <Stat label="Customer" value={conversation.userMessages} />
            <Stat label="Assistant" value={conversation.assistantMessages} />
            <Stat label="Tools" value={conversation.toolCalls} />
          </div>
        </div>
        {conversation.summary ? (
          <p className="mt-3 rounded-md border bg-background p-3 text-sm">
            <span className="font-medium">Summary: </span>
            {conversation.summary}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transcript logged yet. Messages appear when the session ends or when
            live transcript webhooks are enabled.
          </p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log._id}
                className={cn(
                  "rounded-lg border p-3",
                  log.role === "user" && "border-blue-100 bg-blue-50/40",
                  log.role === "assistant" && "border-violet-100 bg-violet-50/40",
                  log.role === "tool" && "border-amber-100 bg-amber-50/40",
                  log.role === "system" && "border-slate-200 bg-slate-50/80"
                )}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <RoleBadge role={log.role} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </div>

                {log.role === "tool" ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{log.toolName ?? log.content}</p>
                    {log.toolInput ? (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Input
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-background p-2 text-xs whitespace-pre-wrap break-words">
                          {formatJson(log.toolInput)}
                        </pre>
                      </div>
                    ) : null}
                    {log.toolOutput ? (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Output
                        </p>
                        <pre className="max-h-64 overflow-auto rounded-md bg-background p-2 text-xs whitespace-pre-wrap break-words">
                          {formatJson(log.toolOutput)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {log.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function VapiConversationsPanel() {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<"all" | "voice" | "chat">("all");
  const [status, setStatus] = useState<"all" | "active" | "ended">("all");
  const [selectedId, setSelectedId] = useState<Id<"vapiConversations"> | null>(
    null
  );

  const queryArgs = useMemo(
    () => ({
      search: search || undefined,
      channel: channel === "all" ? undefined : channel,
      status: status === "all" ? undefined : status,
    }),
    [search, channel, status]
  );

  const conversations = usePaginatedQuery(
    api.vapi.admin.listConversationsPaginated,
    queryArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const canLoadMore = conversations.status === "CanLoadMore";
  const loadingMore = conversations.status === "LoadingMore";

  const handleLoadMore = useCallback(() => {
    if (canLoadMore) conversations.loadMore(PAGE_SIZE);
  }, [canLoadMore, conversations]);

  const activeId = selectedId ?? conversations.results[0]?._id ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,380px)_1fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Input
            placeholder="Search call ID, email, summary…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={channel}
              onValueChange={(value) =>
                setChannel(value as "all" | "voice" | "chat")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "all" | "active" | "ended")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AdminTableCard className="max-h-[70vh] overflow-y-auto p-0">
          {conversations.results.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            <div className="divide-y">
              {conversations.results.map((conversation) => {
                const isSelected = activeId === conversation._id;
                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => setSelectedId(conversation._id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              conversation.channel === "voice"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {conversation.channel}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {conversation.status}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm">
                          {conversation.preview}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(conversation.startedAt)} ·{" "}
                          {conversation.userMessages} customer ·{" "}
                          {conversation.assistantMessages} assistant ·{" "}
                          {conversation.toolCalls} tools
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </AdminTableCard>

        <AdminTableInfiniteScroll
          enabled={canLoadMore}
          isLoadingMore={loadingMore}
          onLoadMore={handleLoadMore}
        />
      </div>

      <Card className="overflow-hidden xl:min-h-[70vh]">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Conversation transcript</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(70vh-4rem)] overflow-hidden p-0">
          {activeId ? (
            <ConversationTimeline conversationId={activeId} />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Select a conversation to view the full call or chat transcript,
              tool calls, and session details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
