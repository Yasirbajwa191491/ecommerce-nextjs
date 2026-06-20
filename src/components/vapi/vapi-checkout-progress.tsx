"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckoutProgressPhase } from "@/lib/vapi-ui-actions/types";

const STEPS: { phase: CheckoutProgressPhase; label: string }[] = [
  { phase: "cart_review", label: "Cart" },
  { phase: "delivery", label: "Delivery" },
  { phase: "payment", label: "Payment" },
  { phase: "ready", label: "Ready" },
];

type VapiCheckoutProgressProps = {
  phase: CheckoutProgressPhase | null;
  active?: boolean;
  className?: string;
};

function phaseIndex(phase: CheckoutProgressPhase | null): number {
  if (!phase) return -1;
  if (phase === "understanding") return -1;
  return STEPS.findIndex((step) => step.phase === phase);
}

export function VapiCheckoutProgress({
  phase,
  active = false,
  className,
}: VapiCheckoutProgressProps) {
  if (!active || !phase || phase === "understanding") return null;

  const current = phaseIndex(phase);

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 px-4 py-3",
        className
      )}
      aria-label="AI checkout progress"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
        AI checkout progress
      </p>
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const done = current > index;
          const currentStep = current === index;
          return (
            <li
              key={step.phase}
              className="flex flex-1 flex-col items-center gap-1 text-center"
            >
              {done ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Circle
                  className={cn(
                    "size-4",
                    currentStep ? "text-primary fill-primary/20" : "text-muted-foreground"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  currentStep || done
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
