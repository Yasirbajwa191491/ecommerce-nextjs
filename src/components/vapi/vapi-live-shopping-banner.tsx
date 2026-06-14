"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VapiActivityStep } from "@/lib/vapi-activity";

type VapiLiveShoppingBannerProps = {
  steps: VapiActivityStep[];
  isActive: boolean;
};

export function VapiLiveShoppingBanner({
  steps,
  isActive,
}: VapiLiveShoppingBannerProps) {
  if (!isActive || !steps.length) return null;

  const current =
    [...steps].reverse().find((step) => step.status === "active") ??
    steps[steps.length - 1];

  if (!current) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 left-4 z-[59] max-w-[min(100vw-2rem,320px)]",
        "rounded-2xl border border-primary/20 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {current.status === "active" ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <Sparkles className="size-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Assistant shopping
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {current.title}
          </p>
          {current.detail ? (
            <p className="truncate text-xs text-muted-foreground">{current.detail}</p>
          ) : null}
          {current.href && current.href.startsWith("http") ? (
            <a
              href={current.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-primary underline underline-offset-2"
            >
              Open secure Stripe checkout
            </a>
          ) : current.href && current.href.startsWith("/") ? (
            <Link
              href={current.href}
              className="mt-1 inline-block text-xs font-medium text-primary underline underline-offset-2"
            >
              View on site
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
