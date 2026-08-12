"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestOpenVapiAssistant } from "@/lib/site";
import { cn } from "@/lib/utils";

type HeaderAiButtonProps = {
  compact?: boolean;
};

export function HeaderAiButton({ compact = false }: HeaderAiButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      onClick={requestOpenVapiAssistant}
      aria-label="Open AI shopping assistant"
      className={cn(
        "shrink-0 rounded-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5",
        compact
          ? "size-10 sm:size-11"
          : "hidden h-10 gap-2 px-4 text-sm font-semibold xl:inline-flex"
      )}
    >
      <Bot className={cn(compact ? "size-5" : "size-4")} aria-hidden />
      {!compact ? <span>AI Shop</span> : null}
    </Button>
  );
}
