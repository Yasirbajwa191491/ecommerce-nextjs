"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { api } from "../../../convex/_generated/api";
import { useVapiAssistant } from "@/hooks/use-vapi-assistant";
import { useVapiCartSync } from "@/hooks/use-vapi-cart-sync";
import { useVapiStorefrontSync } from "@/hooks/use-vapi-storefront-sync";
import { useVapiUiActionExecutor } from "@/hooks/use-vapi-ui-action-executor";
import { useVapiStorefrontController } from "@/providers/vapi-storefront-controller";
import { useCartContext } from "@/context/cart_context";
import { cartItemsToCheckoutLines } from "@/lib/cart-lines";
import { VapiChatPanel } from "@/components/vapi/vapi-chat-panel";
import { VapiActivityPanel } from "@/components/vapi/vapi-activity-panel";
import { VapiLiveShoppingBanner } from "@/components/vapi/vapi-live-shopping-banner";
import { VapiAssistantStatus } from "@/components/vapi/vapi-assistant-status";
import { VapiGuidedShoppingBanner } from "@/components/vapi/vapi-guided-shopping-banner";
import { getStripeCheckoutUrlFromSteps } from "@/lib/vapi-activity";
import { isCheckoutRelatedMessage, isVapiConfigured } from "@/lib/vapi-config";
import type { VapiToolEvent } from "@/lib/vapi-activity";
import type { UiAction } from "@/lib/vapi-ui-actions/types";

const VOICE_CART_SYNC_TOOLS = new Set([
  "addToCart",
  "addMultipleToCart",
  "removeFromCart",
  "getCart",
  "createCashOrder",
  "createCheckoutSession",
]);

export function VapiAssistantWidget() {
  const configured = isVapiConfigured();
  const { cart } = useCartContext();
  const { syncToolResult } = useVapiCartSync();
  const pushBrowserCartToVoice = useMutation(
    api.vapi.voiceCartSync.pushBrowserCartToVoice
  );
  const storefront = useVapiStorefrontController();
  const { handleToolStart, handleToolComplete, handleUserMessage } =
    useVapiUiActionExecutor();

  const onToolStart = useCallback(
    (event: VapiToolEvent) => {
      handleToolStart(event);
    },
    [handleToolStart]
  );

  const onToolComplete = useCallback(
    (event: VapiToolEvent) => {
      // Cart mutations are applied once from Convex server tool logs.
      if (!VOICE_CART_SYNC_TOOLS.has(event.toolName)) {
        void syncToolResult(event.toolName, event.parameters, event.result);
      }
      handleToolComplete(event);
    },
    [syncToolResult, handleToolComplete]
  );

  const {
    state,
    isConnected,
    transcript,
    activitySteps,
    stripeCheckoutUrl: clientCheckoutUrl,
    vapiCallId,
    confirmedOrderNumber,
    error,
    startVoiceCall,
    stopCall,
    sendMessage,
    completeServerTools,
    setResolvedCallId,
  } = useVapiAssistant({
    onToolStart,
    onToolComplete,
    onUserMessage: handleUserMessage,
  });

  const onServerToolComplete = useCallback(
    (event: VapiToolEvent) => {
      completeServerTools([event.toolName]);
      void syncToolResult(event.toolName, event.parameters, event.result);
      handleToolComplete(event);
    },
    [completeServerTools, syncToolResult, handleToolComplete]
  );

  const onCheckoutBackupActions = useCallback(
    (actions: UiAction[]) => {
      storefront.applyUiActions(actions);
    },
    [storefront.applyUiActions]
  );

  useVapiStorefrontSync({
    vapiCallId,
    voiceSessionActive: isConnected,
    onServerToolComplete,
    onResolvedCallId: setResolvedCallId,
    onCheckoutBackupActions,
  });

  const [open, setOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const needsCheckoutLookup = useMemo(
    () =>
      activitySteps.some(
        (step) =>
          step.toolName === "createCheckoutSession" &&
          (step.status === "active" || step.status === "complete")
      ) ||
      transcript.some(
        (entry) =>
          entry.role === "assistant" && isCheckoutRelatedMessage(entry.text)
      ),
    [activitySteps, transcript]
  );

  const serverCheckout = useQuery(
    api.vapi.voiceCheckout.getPendingCheckoutByCallId,
    vapiCallId && needsCheckoutLookup && !clientCheckoutUrl
      ? { vapiCallId }
      : "skip"
  );

  const latestCheckout = useQuery(
    api.vapi.voiceCheckout.getLatestPendingCheckout,
    needsCheckoutLookup && !clientCheckoutUrl && !serverCheckout?.checkoutUrl
      ? {}
      : "skip"
  );

  const shoppingActive =
    isConnected || state !== "idle" || activitySteps.length > 0;

  const stripeCheckoutUrl =
    clientCheckoutUrl ??
    serverCheckout?.checkoutUrl ??
    latestCheckout?.checkoutUrl ??
    getStripeCheckoutUrlFromSteps(activitySteps);

  const checkoutOrderNumber =
    serverCheckout?.orderNumber ?? latestCheckout?.orderNumber;

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

    const browserLines = cartItemsToCheckoutLines(cart);
    const sessionCallId = vapiCallId;
    if (sessionCallId && browserLines.length > 0) {
      try {
        await pushBrowserCartToVoice({
          vapiCallId: sessionCallId,
          lines: browserLines,
        });
      } catch {
        // Non-blocking — reactive sync will retry
      }
    }

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
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <VapiAssistantStatus
                      state={state}
                      isConnected={isConnected}
                      executorBusy={storefront.executorBusy}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Voice & in-call chat drive live storefront navigation.
                    Standalone text chat is reply-only (Phase 1).
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
            <VapiGuidedShoppingBanner
              active={storefront.guidedShopping.active}
              preferences={storefront.guidedShopping.preferences}
              className="mb-3"
              onDismiss={() =>
                storefront.applyUiAction({
                  type: "setGuidedShopping",
                  active: false,
                })
              }
            />

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
              checkoutOrderNumber={checkoutOrderNumber}
              confirmedOrderNumber={confirmedOrderNumber}
              awaitingCheckoutLink={
                needsCheckoutLookup && !stripeCheckoutUrl
              }
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
                  disabled={state === "processing" || state === "thinking"}
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
                  disabled={state === "processing" || state === "thinking"}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    !chatInput.trim() ||
                    state === "processing" ||
                    state === "thinking"
                  }
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
