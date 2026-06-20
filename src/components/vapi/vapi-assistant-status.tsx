"use client";

import {
  CreditCard,
  Loader2,
  Mic,
  Navigation,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VapiAssistantState } from "@/lib/vapi-config";

type VapiAssistantStatusProps = {
  state: VapiAssistantState;
  isConnected: boolean;
  executorBusy?: boolean;
};

const STATUS_CONFIG: Record<
  VapiAssistantState,
  { label: string; icon: typeof Mic; className: string }
> = {
  idle: {
    label: "Ready",
    icon: Sparkles,
    className: "text-muted-foreground",
  },
  listening: {
    label: "Listening",
    icon: Mic,
    className: "text-primary",
  },
  speaking: {
    label: "Speaking",
    icon: Sparkles,
    className: "text-primary",
  },
  processing: {
    label: "Thinking",
    icon: Loader2,
    className: "text-primary animate-spin",
  },
  thinking: {
    label: "Thinking",
    icon: Loader2,
    className: "text-primary animate-spin",
  },
  searching: {
    label: "Searching",
    icon: Search,
    className: "text-primary",
  },
  navigating: {
    label: "Navigating",
    icon: Navigation,
    className: "text-primary",
  },
  updating_cart: {
    label: "Updating cart",
    icon: ShoppingCart,
    className: "text-primary",
  },
  checkout_ready: {
    label: "Checkout ready",
    icon: CreditCard,
    className: "text-emerald-600",
  },
};

export function VapiAssistantStatus({
  state,
  isConnected,
  executorBusy = false,
}: VapiAssistantStatusProps) {
  const effectiveState: VapiAssistantState = executorBusy
    ? "navigating"
    : isConnected && state === "idle"
      ? "listening"
      : state;

  const config = STATUS_CONFIG[effectiveState];
  const Icon = config.icon;
  const spin = effectiveState === "processing" || effectiveState === "thinking";

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium"
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("size-3.5 shrink-0", config.className, spin && "animate-spin")} />
      <span className={config.className.replace("animate-spin", "").trim()}>
        {config.label}
      </span>
    </div>
  );
}
