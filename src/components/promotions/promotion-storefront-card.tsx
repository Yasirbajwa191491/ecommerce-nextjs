"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { PromotionCardImagePanel } from "@/components/promotions/product-promotion-image-overlay";
import {
  formatPromotionBadgeShort,
  getPromotionDisplay,
  type PromotionDisplayInput,
} from "@/lib/promotion-display";
import { PRIMARY_BUTTON_CLASS } from "@/lib/layout-constants";
import { productPath } from "@/lib/product-url";
import { useStableNow } from "@/hooks/use-stable-now";
import { cn } from "@/lib/utils";

type StorefrontPromotion = PromotionDisplayInput & {
  _id: Id<"productPromotions">;
  typeLabel: string;
  buyProductId: Id<"products">;
  buyProductImageUrl?: string;
  getProductImageUrl?: string;
  endAt: number;
};

type PromotionStorefrontCardProps = {
  promotion: StorefrontPromotion;
  className?: string;
};

export function PromotionStorefrontCard({
  promotion,
  className,
}: PromotionStorefrontCardProps) {
  const now = useStableNow();
  const recordClick = useMutation(api.productPromotions.recordClick);
  const { title, offerLine } = getPromotionDisplay(promotion);
  const shortLabel = formatPromotionBadgeShort(promotion);
  const href = `${productPath(promotion.buyProductId)}?promo=${promotion._id}`;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-lg",
        className
      )}
    >
      <Link
        href={href}
        className="block"
        onClick={() => void recordClick({ id: promotion._id })}
      >
        <PromotionCardImagePanel
          buyImageUrl={promotion.buyProductImageUrl}
          getImageUrl={promotion.getProductImageUrl}
          buyProductName={promotion.buyProductName}
          getProductName={promotion.getProductName ?? promotion.buyProductName}
          shortLabel={shortLabel}
          title={title}
          offerLine={offerLine}
          typeLabel={promotion.typeLabel}
          endAt={promotion.endAt}
          now={now}
        />
      </Link>

      <div className="flex items-start p-4 pt-3 sm:p-5 sm:pt-4">
        <Button
          render={
            <Link
              href={href}
              onClick={() => void recordClick({ id: promotion._id })}
            />
          }
          className={PRIMARY_BUTTON_CLASS}
        >
          Shop Promotion
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </article>
  );
}
