"use client";

import type { ReactNode } from "react";
import { ConversationHistoryPanel } from "./conversation-history-panel";
import { SavedInsightsPanel } from "./saved-insights-panel";
import { SuggestedQuestions } from "./suggested-questions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { CopilotResponseView } from "@/lib/ai-copilot-content";

type ConversationItem = {
  _id: Id<"aiCopilotConversations">;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type SavedInsightItem = {
  _id: Id<"aiCopilotSavedInsights">;
  question: string;
  response: CopilotResponseView;
  createdAt: number;
};

type AiCopilotLayoutProps = {
  conversations: ConversationItem[] | undefined;
  savedInsights: SavedInsightItem[] | undefined;
  activeConversationId: Id<"aiCopilotConversations"> | null;
  onSelectConversation: (id: Id<"aiCopilotConversations">) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: Id<"aiCopilotConversations">) => void;
  onDeleteSavedInsight: (id: Id<"aiCopilotSavedInsights">) => void;
  onSuggestedQuestion: (question: string) => void;
  chatDisabled?: boolean;
  children: ReactNode;
};

function SidebarPanels({
  conversations,
  savedInsights,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onDeleteSavedInsight,
  onSuggestedQuestion,
  chatDisabled,
  compact = false,
}: Omit<AiCopilotLayoutProps, "children"> & { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "flex flex-col gap-4"}>
      <ConversationHistoryPanel
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={onSelectConversation}
        onNew={onNewConversation}
        onDelete={onDeleteConversation}
        compact={compact}
      />
      <SavedInsightsPanel
        insights={savedInsights}
        onDelete={onDeleteSavedInsight}
        compact={compact}
      />
      <SuggestedQuestions
        onSelect={onSuggestedQuestion}
        disabled={chatDisabled}
        compact={compact}
      />
    </div>
  );
}

export function AiCopilotLayout({
  conversations,
  savedInsights,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onDeleteSavedInsight,
  onSuggestedQuestion,
  chatDisabled,
  children,
}: AiCopilotLayoutProps) {
  const panelProps = {
    conversations,
    savedInsights,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onDeleteSavedInsight,
    onSuggestedQuestion,
    chatDisabled,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:items-start xl:gap-6">
      {/* Chat first on phones and tablets */}
      <section className="order-1 min-w-0 xl:order-2">{children}</section>

      <aside className="order-2 min-w-0 xl:order-1">
        {/* Desktop: stacked sidebar */}
        <div className="hidden xl:block">
          <SidebarPanels {...panelProps} />
        </div>

        {/* Mobile & tablet: compact tabs to prevent overlap and long scroll */}
        <div className="xl:hidden">
          <Tabs defaultValue="history" className="w-full min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
              <TabsTrigger value="history" className="px-2 py-2 text-xs sm:text-sm">
                History
              </TabsTrigger>
              <TabsTrigger value="saved" className="px-2 py-2 text-xs sm:text-sm">
                Saved
              </TabsTrigger>
              <TabsTrigger value="suggested" className="px-2 py-2 text-xs sm:text-sm">
                Ideas
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4 min-w-0">
              <ConversationHistoryPanel
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelect={onSelectConversation}
                onNew={onNewConversation}
                onDelete={onDeleteConversation}
                compact
              />
            </TabsContent>
            <TabsContent value="saved" className="mt-4 min-w-0">
              <SavedInsightsPanel
                insights={savedInsights}
                onDelete={onDeleteSavedInsight}
                compact
              />
            </TabsContent>
            <TabsContent value="suggested" className="mt-4 min-w-0">
              <SuggestedQuestions
                onSelect={onSuggestedQuestion}
                disabled={chatDisabled}
                compact
              />
            </TabsContent>
          </Tabs>
        </div>
      </aside>
    </div>
  );
}
