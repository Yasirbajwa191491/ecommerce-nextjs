"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
import { hoverShadowGlow } from "@/lib/motion/image-card-hover";
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
  const reduceMotion = useReducedMotion();
  const recordClick = useMutation(api.productPromotions.recordClick);
  const { title, offerLine } = getPromotionDisplay(promotion);
  const shortLabel = formatPromotionBadgeShort(promotion);
  const href = `${productPath(promotion.buyProductId)}?promo=${promotion._id}`;

  return (
    <m.article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        className
      )}
      initial={reduceMotion ? false : "rest"}
      whileHover={reduceMotion ? undefined : "hover"}
      animate="rest"
      variants={reduceMotion ? undefined : hoverShadowGlow}
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
        <m.div
          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
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
        </m.div>
      </div>
    </m.article>
  );
}
