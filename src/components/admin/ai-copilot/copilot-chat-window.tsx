"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { CopilotResponseView } from "@/lib/ai-copilot-content";
import { CopilotResponseCard } from "./copilot-response-card";

type ChatMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  response?: CopilotResponseView;
};

type CopilotChatWindowProps = {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onFollowUp: (question: string) => void;
  onSaveInsight: (args: {
    question: string;
    response: CopilotResponseView;
    messageId?: Id<"aiCopilotMessages">;
  }) => void;
  loading?: boolean;
  savingInsightId?: string | null;
};

export function CopilotChatWindow({
  messages,
  draft,
  onDraftChange,
  onSubmit,
  onFollowUp,
  onSaveInsight,
  loading,
  savingInsightId,
}: CopilotChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && draft.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <Card className="flex min-h-[min(420px,70vh)] flex-1 flex-col overflow-hidden sm:min-h-[480px] xl:min-h-[560px]">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
        <ScrollArea className="min-h-0 flex-1 pr-1 sm:pr-3">
          <div className="space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center sm:px-8 sm:py-10">
                <p className="text-balance text-sm font-medium text-foreground sm:text-base">
                  Ask a business question in plain English
                </p>
                <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                  Get intelligent explanations, insights, and recommendations
                  based on your real store data.
                </p>
              </div>
            ) : (
              messages.reduce<
                Array<{
                  key: string;
                  user?: ChatMessage;
                  assistant?: ChatMessage;
                }>
              >((pairs, message) => {
                if (message.role === "user") {
                  pairs.push({ key: message._id, user: message });
                  return pairs;
                }

                const lastPair = pairs[pairs.length - 1];
                if (lastPair && !lastPair.assistant) {
                  lastPair.assistant = message;
                  return pairs;
                }

                pairs.push({ key: message._id, assistant: message });
                return pairs;
              }, []).map((pair) => {
                if (pair.assistant?.response) {
                  return (
                    <div key={pair.key} className="space-y-3">
                      {pair.user ? (
                        <div className="ml-auto w-fit max-w-full rounded-2xl bg-primary px-3 py-2.5 text-sm text-primary-foreground sm:max-w-[85%] sm:px-4 sm:py-3">
                          {pair.user.content}
                        </div>
                      ) : null}
                      <CopilotResponseCard
                        response={pair.assistant.response}
                        onFollowUp={onFollowUp}
                        onSave={() =>
                          onSaveInsight({
                            question: pair.user?.content ?? "Business insight",
                            response: pair.assistant!.response!,
                            messageId: pair.assistant!._id as Id<"aiCopilotMessages">,
                          })
                        }
                        saving={savingInsightId === pair.assistant._id}
                      />
                    </div>
                  );
                }

                if (pair.user) {
                  return (
                    <div
                      key={pair.key}
                      className="ml-auto w-fit max-w-full rounded-2xl bg-primary px-3 py-2.5 text-sm text-primary-foreground sm:max-w-[85%] sm:px-4 sm:py-3"
                    >
                      {pair.user.content}
                    </div>
                  );
                }

                return null;
              })
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4 shrink-0" />
                Analyzing your store data...
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t pt-3 sm:pt-4">
          <div className="relative">
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about revenue, products, inventory, reviews..."
              className="min-h-[72px] w-full min-w-0 resize-none pr-14 sm:min-h-[88px]"
              disabled={loading}
            />
            <Button
              type="button"
              size="icon"
              onClick={onSubmit}
              disabled={loading || !draft.trim()}
              className="absolute bottom-2 right-2 h-9 w-9 shrink-0"
            >
              {loading ? (
                <Spinner className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
