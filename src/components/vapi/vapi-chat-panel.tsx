"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { VapiAssistantState, VapiTranscriptEntry } from "@/lib/vapi-config";

type VapiChatPanelProps = {
  transcript: VapiTranscriptEntry[];
  state: VapiAssistantState;
  error: string | null;
};

const STATE_LABELS: Record<VapiAssistantState, string> = {
  idle: "Ready to help",
  listening: "Listening…",
  speaking: "Speaking…",
  processing: "Processing…",
};

export function VapiChatPanel({ transcript, state, error }: VapiChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, state]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2 border-b pb-3">
        <span
          className={cn(
            "size-2 rounded-full",
            state === "idle" && "bg-muted-foreground",
            state === "listening" && "animate-pulse bg-emerald-500",
            state === "speaking" && "animate-pulse bg-primary",
            state === "processing" && "animate-pulse bg-amber-500"
          )}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {STATE_LABELS[state]}
        </span>
      </div>

      <ScrollArea className="min-h-[220px] flex-1 pr-2">
        <div className="space-y-3">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask about products, orders, shipping, returns, or request a
              recommendation.
            </p>
          ) : (
            transcript.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                  entry.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {entry.text}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {error ? (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
