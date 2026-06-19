"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import { PromotionEndsLabel } from "@/components/promotions/promotion-ends-label";
import {
  MotionHoverCaption,
  MotionHoverImage,
  MotionHoverOverlay,
} from "@/components/motion";
import { hoverCardLift, hoverShadowGlow } from "@/lib/motion/image-card-hover";
import { cn } from "@/lib/utils";
import type { ProductPromotionBadge } from "@/context/product-promotion-badges-context";

const hoverOrchestrator = {
  rest: {},
  hover: { transition: { staggerChildren: 0.04 } },
};

type ProductPromotionImageOverlayProps = {
  badge: ProductPromotionBadge;
  variant?: "card" | "compact";
  now?: number;
  className?: string;
};

export function ProductPromotionImageOverlay({
  badge,
  variant = "card",
  now,
  className,
}: ProductPromotionImageOverlayProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/95 via-emerald-900/70 to-transparent",
        isCompact ? "px-2 pb-2 pt-6" : "px-3 pb-3 pt-10 sm:px-4 sm:pb-4",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-emerald-500 font-bold uppercase tracking-wide text-white shadow-sm",
          isCompact
            ? "px-2 py-0.5 text-[9px]"
            : "px-2.5 py-0.5 text-[10px] sm:text-[11px]"
        )}
      >
        {badge.shortLabel}
      </span>
      <p
        className={cn(
          "mt-1 font-semibold leading-snug text-white",
          isCompact ? "line-clamp-2 text-[10px]" : "line-clamp-2 text-xs sm:text-sm"
        )}
      >
        {badge.offerLine}
      </p>
      <PromotionEndsLabel
        endAt={badge.endAt}
        now={now}
        variant="overlay"
        className="mt-1.5"
      />
    </div>
  );
}

type PromotionCardImagePanelProps = {
  buyImageUrl?: string;
  getImageUrl?: string;
  buyProductName: string;
  getProductName: string;
  shortLabel: string;
  title: string;
  offerLine: string;
  typeLabel: string;
  endAt: number;
  now?: number;
};

export function PromotionCardImagePanel({
  buyImageUrl,
  getImageUrl,
  buyProductName,
  getProductName,
  shortLabel,
  title,
  offerLine,
  typeLabel,
  endAt,
  now,
}: PromotionCardImagePanelProps) {
  const reduceMotion = useReducedMotion();

  const imageGrid = (
    <div className="absolute inset-0 grid grid-cols-2">
      <div className="relative border-r border-white/10 bg-muted">
        {buyImageUrl ? (
          <Image
            src={buyImageUrl}
            alt={buyProductName}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : null}
        <span className="absolute top-2 left-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          Buy
        </span>
      </div>
      <div className="relative bg-muted">
        {getImageUrl ? (
          <Image
            src={getImageUrl}
            alt={getProductName}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Gift className="size-10" />
          </div>
        )}
        <span className="absolute top-2 right-2 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          Free
        </span>
      </div>
    </div>
  );

  const badges = (
    <div className="absolute top-3 left-3 z-10">
      <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-md sm:text-xs">
        {shortLabel}
      </span>
    </div>
  );

  const captionContent = (
    <>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-200 uppercase sm:text-[11px]">
        {typeLabel}
      </p>
      <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">
        {title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/90">
        {offerLine}
      </p>
      <PromotionEndsLabel
        endAt={endAt}
        now={now}
        variant="overlay"
        className="mt-2"
      />
    </>
  );

  if (reduceMotion) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
        {imageGrid}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        {badges}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">{captionContent}</div>
      </div>
    );
  }

  return (
    <m.div
      className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]"
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={hoverOrchestrator}
    >
      <m.div variants={hoverCardLift} className="absolute inset-0">
        <m.div variants={hoverShadowGlow} className="absolute inset-0">
          <MotionHoverImage className="absolute inset-0">
            {imageGrid}
          </MotionHoverImage>
          <MotionHoverOverlay className="bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          {badges}
          <MotionHoverCaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            {captionContent}
          </MotionHoverCaption>
        </m.div>
      </m.div>
    </m.div>
  );
}
