"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { productPath } from "@/lib/product-url";
import { getPrimaryImageUrl, getPrimaryImageAlt, orderImagesForDisplay } from "@/lib/product-images";
import { Product } from "@/types/product";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProductPromotionBadge } from "@/context/product-promotion-badges-context";
import { ProductPromotionImageOverlay } from "@/components/promotions/product-promotion-image-overlay";
import { useStableNow } from "@/hooks/use-stable-now";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductPrice } from "@/components/products/product-price";
import { ProductDiscountBadge } from "@/components/products/product-discount-badge";
import { ProductShippingBadge } from "@/components/products/product-shipping-badge";
import { ProductStockBadge } from "@/components/products/product-stock-badge";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { MotionHoverImage } from "@/components/motion";
import { cardTap, fadeUp } from "@/lib/motion";
import { hoverOrchestrator, hoverShadowGlow } from "@/lib/motion/image-card-hover";
import { viewportReveal } from "@/lib/motion/transitions";
import {
  PRODUCT_CARD_BRAND,
  PRODUCT_CARD_CATEGORY,
  PRODUCT_CARD_NAME,
  PRODUCT_CARD_RATING,
  SHOP_BODY_SM,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

type ProductCardProps = Product & {
  view?: "grid" | "list";
  animateEntrance?: boolean;
};

export default function ProductCard({
  view = "grid",
  animateEntrance = true,
  ...product
}: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const now = useStableNow();
  const promotionBadge = useProductPromotionBadge(product._id as Id<"products">);
  const imageUrl = getPrimaryImageUrl(product);
  const imageAlt = getPrimaryImageAlt(product);
  const displayImages = orderImagesForDisplay(product);
  const categoryName = product.category?.name ?? "Product";
  const discountPercent = product.discountPercent ?? 0;
  const freeShipping = product.shipping === true;

  const entranceProps = reduceMotion
    ? {}
    : {
        initial: animateEntrance ? ("hidden" as const) : false,
        whileInView: animateEntrance ? ("visible" as const) : undefined,
        viewport: viewportReveal,
        variants: fadeUp,
        style: { willChange: "transform, opacity" as const },
      };

  const hoverShellProps = reduceMotion
    ? {}
    : {
        initial: "rest" as const,
        whileHover: "hover" as const,
        animate: "rest" as const,
        variants: hoverOrchestrator,
      };

  if (view === "list") {
    return (
      <m.div
        className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-[border-color,box-shadow] duration-500 hover:border-[#6254f3]/30 hover:shadow-md sm:p-5 xl:flex-row xl:items-start xl:gap-6"
        {...entranceProps}
        {...hoverShellProps}
        whileTap={reduceMotion ? undefined : cardTap}
      >
        <div className="relative w-full shrink-0 sm:mx-auto sm:max-w-[12.5rem] xl:mx-0 xl:max-w-none">
          <MotionHoverImage className="size-full rounded-xl" zoom="subtle">
            <ProductImageGallery
              variant="list"
              images={displayImages}
              fallbackAlt={product.name}
            />
          </MotionHoverImage>
          {promotionBadge ? (
            <ProductPromotionImageOverlay
              badge={promotionBadge}
              variant="compact"
              now={now}
              className="rounded-xl"
            />
          ) : null}
        </div>

        <Link
          href={productPath(product._id)}
          className="flex min-w-0 flex-1 flex-col gap-4 xl:flex-row xl:items-center xl:gap-6"
        >
          <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span
                className={cn(
                  "rounded-full bg-[#6254f3]/10 px-2.5 py-0.5 text-[#6254f3]",
                  PRODUCT_CARD_CATEGORY
                )}
              >
                {categoryName}
              </span>
              <span className={PRODUCT_CARD_BRAND}>{product.company}</span>
            </div>
            <h3 className={cn("line-clamp-1 min-h-0", PRODUCT_CARD_NAME)}>
              {product.name}
            </h3>
            {product.description ? (
              <p className={cn("line-clamp-2", SHOP_BODY_SM)}>
                {product.description}
              </p>
            ) : null}
            <ProductRatingDisplay
              rating={product.stars}
              reviewCount={product.reviews}
              compact
              className={PRODUCT_CARD_RATING}
            />
            <ProductStockBadge stock={product.stock} variant="list" />
          </div>

          <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 border-t border-border/50 pt-3 xl:w-40 xl:flex-col xl:items-end xl:justify-center xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6 xl:text-right">
            <ProductPrice
              price={product.price}
              discountPercent={discountPercent}
              currency={product.currency}
              className="xl:justify-end"
            />
            <div className="flex flex-wrap justify-end gap-1">
              <ProductDiscountBadge discountPercent={discountPercent} />
              <ProductShippingBadge
                freeShipping={freeShipping}
                shippingCharges={product.shippingCharges}
                currency={product.currency}
                variant="compact"
              />
            </div>
          </div>
        </Link>
      </m.div>
    );
  }

  return (
    <m.div
      className={cn(
        "group h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-[border-color] duration-500 hover:border-[#6254f3]/20"
      )}
      {...entranceProps}
      whileTap={reduceMotion ? undefined : cardTap}
    >
      <m.div
        initial={reduceMotion ? false : "rest"}
        whileHover={reduceMotion ? undefined : "hover"}
        animate="rest"
        variants={reduceMotion ? undefined : hoverOrchestrator}
        className="flex h-full flex-col"
      >
        <m.div
          variants={reduceMotion ? undefined : hoverShadowGlow}
          className="flex h-full flex-col rounded-2xl"
        >
          <Link
            href={productPath(product._id)}
            className="flex h-full flex-col"
          >
            <div className="relative shrink-0 overflow-hidden">
              <MotionHoverImage className="w-full">
                <ProductImageFrame
                  src={imageUrl}
                  alt={imageAlt}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  interactive={false}
                  variant="catalog"
                  className="rounded-none"
                />
              </MotionHoverImage>
              <span className={cn("absolute top-3 right-3", PRODUCT_CARD_CATEGORY)}>
                {categoryName}
              </span>
              {(discountPercent > 0 || freeShipping) && (
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                  <ProductDiscountBadge discountPercent={discountPercent} />
                  {freeShipping ? (
                    <ProductShippingBadge
                      freeShipping
                      currency={product.currency}
                      variant="compact"
                    />
                  ) : null}
                </div>
              )}
              {promotionBadge ? (
                <ProductPromotionImageOverlay badge={promotionBadge} now={now} />
              ) : null}
            </div>

            <div className="flex min-h-[9rem] flex-1 flex-col gap-2.5 p-4 sm:p-5">
              <p className={PRODUCT_CARD_BRAND}>
                {product.company}
              </p>
              <h3 className={PRODUCT_CARD_NAME}>
                {product.name}
              </h3>
              <ProductRatingDisplay
                rating={product.stars}
                reviewCount={product.reviews}
                size="md"
                className={PRODUCT_CARD_RATING}
              />
              <div className="flex w-fit max-w-full flex-wrap items-start gap-2">
                <ProductStockBadge stock={product.stock} variant="compact" />
              </div>
              <div className="mt-auto border-t border-border/50 pt-3">
                <ProductPrice
                  price={product.price}
                  discountPercent={discountPercent}
                  currency={product.currency}
                  size="lg"
                />
              </div>
            </div>
          </Link>
        </m.div>
      </m.div>
    </m.div>
  );
}
