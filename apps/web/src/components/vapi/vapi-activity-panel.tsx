"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  GitCompare,
  Loader2,
  MapPin,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VapiActivityStep } from "@/lib/vapi-activity";
import type { VapiActivityPhase } from "@/lib/vapi-ui-actions/types";

type VapiActivityPanelProps = {
  steps: VapiActivityStep[];
  compact?: boolean;
};

function stepIcon(step: VapiActivityStep) {
  if (step.status === "active") {
    return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
  }
  if (step.status === "error") {
    return <XCircle className="size-3.5 shrink-0 text-destructive" />;
  }
  return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
}

function phaseIcon(phase?: VapiActivityPhase) {
  switch (phase) {
    case "understanding":
      return Sparkles;
    case "searching":
      return Search;
    case "comparing":
      return GitCompare;
    case "opening_product":
      return Package;
    case "adding_to_cart":
      return ShoppingCart;
    case "calculating_delivery":
      return Truck;
    case "preparing_checkout":
      return CreditCard;
    case "tracking_order":
      return MapPin;
    default:
      return Package;
  }
}

function categoryIcon(toolName: string, phase?: VapiActivityPhase) {
  if (phase) return phaseIcon(phase);
  if (
    toolName === "searchProducts" ||
    toolName === "searchProductsHybrid" ||
    toolName === "getProductDetails" ||
    toolName === "buildProductBundle"
  ) {
    return Search;
  }
  if (
    toolName === "addToCart" ||
    toolName === "getCart" ||
    toolName === "removeFromCart"
  ) {
    return ShoppingCart;
  }
  if (toolName === "createCheckoutSession" || toolName === "createCashOrder") {
    return CreditCard;
  }
  return Package;
}

export function VapiActivityPanel({
  steps,
  compact = false,
}: VapiActivityPanelProps) {
  const visible = compact ? steps.slice(-8) : steps;

  if (!visible.length) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/30",
        compact ? "p-2.5" : "p-3"
      )}
      aria-label="AI activity timeline"
    >
      {!compact ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activity
        </p>
      ) : null}
      <ol className={cn("space-y-2", compact && "max-h-40 overflow-y-auto")}>
        {visible.map((step) => {
          const Icon = categoryIcon(step.toolName, step.phase);
          const content = (
            <div className="flex min-w-0 items-start gap-2">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-background">
                <Icon className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {stepIcon(step)}
                  <span className="truncate text-xs font-medium">{step.title}</span>
                </div>
                {step.detail ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </div>
          );

          if (step.href && step.href.startsWith("/")) {
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="block rounded-lg px-1 py-0.5 transition-colors hover:bg-background/80"
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li key={step.id} className="rounded-lg px-1 py-0.5">
              {content}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
