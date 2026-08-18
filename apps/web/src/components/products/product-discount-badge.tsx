"use client";

import { m, useReducedMotion } from "framer-motion";
import { formatDiscountBadge } from "@/lib/pricing";
import { badgePop } from "@/lib/motion";
import { SHOP_BADGE } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ProductDiscountBadgeProps = {
  discountPercent?: number;
  className?: string;
};

export function ProductDiscountBadge({
  discountPercent = 0,
  className,
}: ProductDiscountBadgeProps) {
  const reduceMotion = useReducedMotion();
  const label = formatDiscountBadge(discountPercent);
  if (!label) return null;

  if (reduceMotion) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600",
          SHOP_BADGE,
          className
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <m.span
      initial="hidden"
      animate="visible"
      variants={badgePop}
      className={cn(
        "inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600",
        SHOP_BADGE,
        className
      )}
    >
      {label}
    </m.span>
  );
}
