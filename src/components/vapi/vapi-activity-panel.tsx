"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Search,
  ShoppingCart,
  CreditCard,
  Package,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VapiActivityStep } from "@/lib/vapi-activity";

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

function categoryIcon(toolName: string) {
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

export function VapiActivityPanel({ steps, compact = false }: VapiActivityPanelProps) {
  if (!steps.length) return null;

  const visibleSteps = compact ? steps.slice(-4) : steps;

  return (
    <div
      className={cn(
        "rounded-xl border bg-background/95",
        compact ? "px-3 py-2" : "px-3 py-3"
      )}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Live shopping steps
      </p>
      <ol className="space-y-2">
        {visibleSteps.map((step) => {
          const CategoryIcon = categoryIcon(step.toolName);
          const content = (
            <div className="flex min-w-0 items-start gap-2">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <CategoryIcon className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {stepIcon(step)}
                  <span className="truncate text-xs font-medium text-foreground">
                    {step.title}
                  </span>
                </div>
                {step.detail ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </div>
          );

          return (
            <li key={step.id}>
              {step.href && step.href.startsWith("/") ? (
                <Link
                  href={step.href}
                  className="block rounded-lg transition-colors hover:bg-muted/60"
                >
                  {content}
                </Link>
              ) : step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg transition-colors hover:bg-muted/60"
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
