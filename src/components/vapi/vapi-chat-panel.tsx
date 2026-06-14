"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { StripeCheckoutCta } from "@/components/vapi/stripe-checkout-cta";
import {
  extractCheckoutUrl,
  extractOrderNumber,
  isCheckoutRelatedMessage,
  isValidStripeCheckoutUrl,
  normalizeAssistantDisplayText,
  type VapiAssistantState,
  type VapiTranscriptEntry,
} from "@/lib/vapi-config";

type VapiChatPanelProps = {
  transcript: VapiTranscriptEntry[];
  state: VapiAssistantState;
  error: string | null;
  stripeCheckoutUrl?: string | null;
  checkoutOrderNumber?: string;
  confirmedOrderNumber?: string;
  awaitingCheckoutLink?: boolean;
};

const STATE_LABELS: Record<VapiAssistantState, string> = {
  idle: "Ready to help",
  listening: "Listening…",
  speaking: "Speaking…",
  processing: "Processing…",
};

function resolveCheckoutUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const base = raw.split("#")[0] ?? raw;
  return isValidStripeCheckoutUrl(base) ? raw : undefined;
}

export function VapiChatPanel({
  transcript,
  state,
  error,
  stripeCheckoutUrl,
  checkoutOrderNumber,
  confirmedOrderNumber,
  awaitingCheckoutLink = false,
}: VapiChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const globalCheckoutUrl = resolveCheckoutUrl(stripeCheckoutUrl);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, state, stripeCheckoutUrl]);

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

      <ScrollArea className="min-h-[180px] flex-1 pr-2">
        <div className="space-y-3">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Type a message below for chat, or tap Voice call to speak (microphone
              required).
            </p>
          ) : (
            transcript.map((entry) => {
              const displayText =
                entry.role === "assistant"
                  ? normalizeAssistantDisplayText(
                      entry.text,
                      confirmedOrderNumber ?? checkoutOrderNumber
                    )
                  : entry.text;
              const mentionsCheckout =
                entry.role === "assistant" && isCheckoutRelatedMessage(displayText);
              const entryCheckoutUrl = resolveCheckoutUrl(
                entry.linkUrl ??
                  extractCheckoutUrl(entry.text) ??
                  (mentionsCheckout ? globalCheckoutUrl : undefined)
              );
              const productUrl =
                entry.linkUrl?.startsWith("/product/") ? entry.linkUrl : undefined;
              const orderNumber =
                confirmedOrderNumber ??
                checkoutOrderNumber ??
                extractOrderNumber(displayText);

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                    entry.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{displayText}</p>
                  {entryCheckoutUrl ? (
                    <StripeCheckoutCta
                      checkoutUrl={entryCheckoutUrl}
                      orderNumber={orderNumber}
                      compact
                    />
                  ) : null}
                  {productUrl ? (
                    <a
                      href={productUrl}
                      className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
                    >
                      View product
                    </a>
                  ) : null}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {globalCheckoutUrl ? (
        <StripeCheckoutCta
          checkoutUrl={globalCheckoutUrl}
          orderNumber={confirmedOrderNumber ?? checkoutOrderNumber}
          className="mt-3 shrink-0"
        />
      ) : awaitingCheckoutLink ? (
        <div
          className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-muted/40 px-3 py-3 text-xs text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          Preparing your secure Stripe checkout link…
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 space-y-1 text-xs text-destructive" role="alert">
          <p>{error}</p>
          {error.toLowerCase().includes("payment method") ||
          error.toLowerCase().includes("billing") ? (
            <a
              href="https://dashboard.vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-medium underline underline-offset-2"
            >
              Open Vapi billing settings
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
