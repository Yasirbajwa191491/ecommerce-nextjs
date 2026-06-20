"use client";

import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GuidedShoppingPreferences } from "@/lib/vapi-ui-actions/types";
import { cn } from "@/lib/utils";

type VapiGuidedShoppingBannerProps = {
  active: boolean;
  preferences: GuidedShoppingPreferences;
  onDismiss?: () => void;
  className?: string;
};

function preferenceChips(preferences: GuidedShoppingPreferences): string[] {
  const chips: string[] = [];
  if (preferences.budget !== undefined) {
    chips.push(`Budget: $${preferences.budget}`);
  }
  if (preferences.search?.trim()) chips.push(`Search: ${preferences.search}`);
  if (preferences.categorySlug) chips.push(`Category: ${preferences.categorySlug}`);
  if (preferences.brandSlugs?.length) {
    chips.push(`Brand: ${preferences.brandSlugs.join(", ")}`);
  }
  if (preferences.colorSlugs?.length) {
    chips.push(`Color: ${preferences.colorSlugs.join(", ")}`);
  }
  if (preferences.maxPrice !== undefined) {
    chips.push(`Max: $${preferences.maxPrice}`);
  }
  if (preferences.deliveryPreference) {
    chips.push(`Delivery: ${preferences.deliveryPreference}`);
  }
  return chips;
}

export function VapiGuidedShoppingBanner({
  active,
  preferences,
  onDismiss,
  className,
}: VapiGuidedShoppingBannerProps) {
  if (!active) return null;

  const chips = preferenceChips(preferences);
  if (!chips.length) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs",
          className
        )}
      >
        <Sparkles className="size-3.5 shrink-0 text-primary" />
        <span className="text-muted-foreground">
          Guided shopping — tell me your budget, brand, or category.
        </span>
        {onDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto size-6"
            onClick={onDismiss}
            aria-label="Dismiss guided shopping"
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2",
        className
      )}
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      <span className="text-xs font-medium text-primary">Guided shopping</span>
      {chips.map((chip) => (
        <Badge key={chip} variant="secondary" className="text-[10px] font-normal">
          {chip}
        </Badge>
      ))}
      {onDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-6"
          onClick={onDismiss}
          aria-label="Dismiss guided shopping"
        >
          <X className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}
