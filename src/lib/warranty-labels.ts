"use client";

import { ShieldCheck } from "lucide-react";
import {
  WARRANTY_DURATION_LABELS,
  WARRANTY_TYPE_LABELS,
  type WarrantyDuration,
  type WarrantyType,
} from "@/lib/warranty-labels";
import { cn } from "@/lib/utils";

type ProductWarrantyBadgeProps = {
  warrantyAvailable?: boolean | null;
  warrantyDuration?: WarrantyDuration | null;
  warrantyType?: WarrantyType | null;
  warrantyDetails?: string | null;
  className?: string;
};

export function ProductWarrantyBadge({
  warrantyAvailable,
  warrantyDuration,
  warrantyType,
  warrantyDetails,
  className,
}: ProductWarrantyBadgeProps) {
  if (!warrantyAvailable) return null;

  const parts: string[] = [];
  if (warrantyDuration) {
    parts.push(WARRANTY_DURATION_LABELS[warrantyDuration]);
  }
  if (warrantyType) {
    parts.push(WARRANTY_TYPE_LABELS[warrantyType]);
  }

  const headline = parts.length > 0 ? parts.join(" · ") : "Warranty included";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6254f3]/10">
          <ShieldCheck className="size-5 text-[#6254f3]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Warranty</p>
          <p className="mt-1 text-sm text-foreground">{headline}</p>
          {warrantyDetails?.trim() ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {warrantyDetails.trim()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
