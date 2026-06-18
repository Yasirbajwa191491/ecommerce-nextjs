"use client";

import { Clock } from "lucide-react";
import {
  formatPromotionEndsAt,
  formatPromotionEndsAtCompact,
} from "@/lib/promotion-datetime";
import { cn } from "@/lib/utils";

type PromotionEndsLabelProps = {
  endAt: number;
  now?: number;
  variant?: "default" | "compact" | "overlay";
  className?: string;
};

export function PromotionEndsLabel({
  endAt,
  now,
  variant = "default",
  className,
}: PromotionEndsLabelProps) {
  const referenceNow = now ?? Date.now();
  const label =
    variant === "compact"
      ? formatPromotionEndsAtCompact(endAt, referenceNow)
      : formatPromotionEndsAt(endAt, referenceNow);

  return (
    <p
      className={cn(
        "flex items-center gap-1.5",
        variant === "overlay"
          ? "text-[11px] font-medium text-amber-100/95 sm:text-xs"
          : variant === "compact"
            ? "text-[10px] text-muted-foreground sm:text-[11px]"
            : "text-xs text-muted-foreground sm:text-sm",
        className
      )}
    >
      <Clock
        className={cn(
          "shrink-0 opacity-80",
          variant === "compact" ? "size-3" : "size-3.5"
        )}
        aria-hidden
      />
      <span>{label}</span>
    </p>
  );
}
