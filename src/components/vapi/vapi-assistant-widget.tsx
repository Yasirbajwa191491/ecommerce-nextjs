"use client";

import { useCallback, useState } from "react";
import {
  Bot,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useVapiAssistant } from "@/hooks/use-vapi-assistant";
import { useVapiCartSync } from "@/hooks/use-vapi-cart-sync";
import { VapiChatPanel } from "@/components/vapi/vapi-chat-panel";
import { VapiActivityPanel } from "@/components/vapi/vapi-activity-panel";
import { VapiLiveShoppingBanner } from "@/components/vapi/vapi-live-shopping-banner";
import { getStripeCheckoutUrlFromSteps } from "@/lib/vapi-activity";
import { isVapiConfigured } from "@/lib/vapi-config";

export function VapiAssistantWidget() {
  const configured = isVapiConfigured();
  const { syncToolResult } = useVapiCartSync();

  const onToolComplete = useCallback(
    (event: { toolName: string; parameters: Record<string, unknown>; result?: unknown }) => {
      void syncToolResult(event.toolName, event.parameters, event.result);
    },
    [syncToolResult]
  );

  const {
    state,
    isConnected,
    transcript,
    activitySteps,
    error,
    startVoiceCall,
    stopCall,
    sendMessage,
  } = useVapiAssistant({ onToolComplete });

  const [open, setOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const shoppingActive =
    isConnected || state === "processing" || activitySteps.length > 0;

  const stripeCheckoutUrl = getStripeCheckoutUrlFromSteps(activitySteps);

  if (!configured) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Vapi] Widget hidden — set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID"
      );
    }
    return null;
  }

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput;
    setChatInput("");
    await sendMessage(message);
  };

  return (
    <>
      <VapiLiveShoppingBanner steps={activitySteps} isActive={shoppingActive} />

      <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
        {!open ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-11 rounded-full border-primary/20 bg-background shadow-lg"
              onClick={() => setOpen(true)}
              aria-label="Open voice assistant"
            >
              <Mic className="size-5 text-primary" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="size-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90"
              onClick={() => setOpen(true)}
              aria-label="Open shopping assistant"
            >
              <Sparkles className="size-6" />
            </Button>
          </div>
        ) : null}
      </div>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) void stopCall();
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayBlur={false}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-4 py-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>Store Shopping Assistant</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Voice & chat support for products and orders
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                <X className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            {activitySteps.length > 0 ? (
              <div className="mb-3">
                <VapiActivityPanel steps={activitySteps} compact />
              </div>
            ) : null}

            <VapiChatPanel
              transcript={transcript}
              state={state}
              error={error}
              stripeCheckoutUrl={stripeCheckoutUrl}
            />

            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isConnected ? "destructive" : "default"}
                  className="flex-1"
                  onClick={() => {
                    if (isConnected) stopCall();
                    else void startVoiceCall();
                  }}
                >
                  {isConnected ? (
                    <>
                      <MicOff className="mr-2 size-4" />
                      End call
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 size-4" />
                      Voice call
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(isConnected && "border-primary text-primary")}
                  disabled={state === "processing"}
                  aria-label="Chat mode — type a message below"
                >
                  <MessageSquare className="size-4" />
                </Button>
              </div>

              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Type a message…"
                  disabled={state === "processing"}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!chatInput.trim() || state === "processing"}
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
