"use client";

import { useCallback, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiCopilotLayout } from "@/components/admin/ai-copilot/ai-copilot-layout";
import { CopilotChatWindow } from "@/components/admin/ai-copilot/copilot-chat-window";
import type { CopilotResponseView } from "@/lib/ai-copilot-content";
import { toastError, toastSuccess } from "@/lib/app-toast";

type StoredMessage = FunctionReturnType<
  typeof api.aiCopilotStore.getConversationMessages
>[number];

export default function AdminAiCopilotPage() {
  const [activeConversationId, setActiveConversationId] =
    useState<Id<"aiCopilotConversations"> | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingInsightId, setSavingInsightId] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<
    Array<{
      _id: string;
      role: "user" | "assistant";
      content: string;
      response?: CopilotResponseView;
    }>
  >([]);

  const conversations = useQuery(api.aiCopilotStore.listConversations);
  const savedInsights = useQuery(api.aiCopilotStore.listSavedInsights);
  const storedMessages = useQuery(
    api.aiCopilotStore.getConversationMessages,
    activeConversationId ? { conversationId: activeConversationId } : "skip"
  );

  const askCopilot = useAction(api.aiBusinessCopilot.askCopilot);
  const createConversation = useMutation(api.aiCopilotStore.createConversation);
  const deleteConversation = useMutation(api.aiCopilotStore.deleteConversation);
  const saveInsight = useMutation(api.aiCopilotStore.saveInsight);
  const deleteSavedInsight = useMutation(api.aiCopilotStore.deleteSavedInsight);

  const messages = useMemo(() => {
    const stored = storedMessages
      ? storedMessages.map((message: StoredMessage) => ({
          _id: message._id,
          role: message.role,
          content: message.content,
          response: message.response,
        }))
      : [];

    if (pendingMessages.length > 0) {
      return [...stored, ...pendingMessages];
    }

    return stored;
  }, [pendingMessages, storedMessages]);

  const submitQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setDraft("");
      setPendingMessages((current) => [
        ...current,
        { _id: `pending-user-${Date.now()}`, role: "user", content: trimmed },
      ]);

      try {
        const result = await askCopilot({
          question: trimmed,
          conversationId: activeConversationId ?? undefined,
        });

        setActiveConversationId(result.conversationId);
        setPendingMessages([]);
      } catch (error) {
        setPendingMessages([]);
        toastError(
          error instanceof Error ? error.message : "Failed to get AI insight"
        );
      } finally {
        setLoading(false);
      }
    },
    [activeConversationId, askCopilot, loading]
  );

  const handleNewConversation = useCallback(async () => {
    try {
      const conversationId = await createConversation({});
      setActiveConversationId(conversationId);
      setPendingMessages([]);
      setDraft("");
    } catch (error) {
      toastError(
        error instanceof Error
          ? error.message
          : "Failed to create conversation"
      );
    }
  }, [createConversation]);

  const handleDeleteConversation = useCallback(
    async (conversationId: Id<"aiCopilotConversations">) => {
      try {
        await deleteConversation({ conversationId });
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          setPendingMessages([]);
        }
        toastSuccess("Conversation deleted");
      } catch (error) {
        toastError(
          error instanceof Error
            ? error.message
            : "Failed to delete conversation"
        );
      }
    },
    [activeConversationId, deleteConversation]
  );

  const handleSaveInsight = useCallback(
    async (args: {
      question: string;
      response: CopilotResponseView;
      messageId?: Id<"aiCopilotMessages">;
    }) => {
      if (!args.messageId) return;
      setSavingInsightId(args.messageId);
      try {
        await saveInsight({
          question: args.question,
          response: args.response,
          conversationId: activeConversationId ?? undefined,
          messageId: args.messageId,
        });
        toastSuccess("Insight saved");
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : "Failed to save insight"
        );
      } finally {
        setSavingInsightId(null);
      }
    },
    [activeConversationId, saveInsight]
  );

  const handleDeleteSavedInsight = useCallback(
    async (insightId: Id<"aiCopilotSavedInsights">) => {
      try {
        await deleteSavedInsight({ insightId });
        toastSuccess("Saved insight removed");
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : "Failed to delete insight"
        );
      }
    },
    [deleteSavedInsight]
  );

  return (
    <>
      <AdminPageHeader
        title="AI Business Copilot"
        description="Ask natural language questions about your store and get intelligent explanations, insights, and recommendations based on real business data."
      />

      <AiCopilotLayout
        conversations={conversations}
        savedInsights={savedInsights}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setPendingMessages([]);
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onDeleteSavedInsight={handleDeleteSavedInsight}
        onSuggestedQuestion={submitQuestion}
        chatDisabled={loading}
      >
        <CopilotChatWindow
          messages={messages}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={() => submitQuestion(draft)}
          onFollowUp={submitQuestion}
          onSaveInsight={handleSaveInsight}
          loading={loading}
          savingInsightId={savingInsightId}
        />
      </AiCopilotLayout>
    </>
  );
}
