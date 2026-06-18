"use client";

import { Gift, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PromotionEndsLabel } from "@/components/promotions/promotion-ends-label";
import {
  getPromotionDisplay,
  type PromotionDisplayInput,
} from "@/lib/promotion-display";
import { cn } from "@/lib/utils";

type PromotionOfferBannerProps = {
  promotion: PromotionDisplayInput;
  variant?: "hero" | "compact";
  now?: number;
  className?: string;
};

export function PromotionOfferBanner({
  promotion,
  variant = "compact",
  now,
  className,
}: PromotionOfferBannerProps) {
  const { title, subtitle } = getPromotionDisplay(promotion);
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02]",
        isHero ? "rounded-2xl p-4 sm:p-5" : "rounded-xl px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            isHero ? "size-9" : "size-8"
          )}
        >
          <Gift className={isHero ? "size-4" : "size-3.5"} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          {promotion.typeLabel ? (
            <Badge
              variant="secondary"
              className="mb-0.5 gap-1 rounded-full border-emerald-500/20 bg-emerald-500/10 px-2 py-0 text-[10px] font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-200"
            >
              <Tag className="size-3" />
              {promotion.typeLabel}
            </Badge>
          ) : null}
          <p
            className={cn(
              "font-semibold leading-snug text-emerald-900 dark:text-emerald-100",
              isHero ? "text-base sm:text-lg" : "text-sm"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "leading-relaxed text-emerald-800/85 dark:text-emerald-200/90",
              isHero ? "text-sm sm:text-[0.9375rem]" : "text-sm"
            )}
          >
            {subtitle}
          </p>
          {promotion.endAt ? (
            <PromotionEndsLabel
              endAt={promotion.endAt}
              now={now}
              variant="compact"
              className="mt-1.5 text-emerald-800/75 dark:text-emerald-200/80"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
