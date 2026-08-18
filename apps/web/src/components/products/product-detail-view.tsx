"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import {
  ChevronRight,
  Truck,
} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useSingleProduct } from "@/hooks/useProducts";
import { useStableNow } from "@/hooks/use-stable-now";
import {
  useActivePromotionsForProduct,
  useStorefrontPromotion,
} from "@/hooks/use-storefront-promotions";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { ProductPrice } from "@/components/products/product-price";
import { ProductDiscountBadge } from "@/components/products/product-discount-badge";
import { ProductShippingBadge } from "@/components/products/product-shipping-badge";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { ProductReviewSection } from "@/components/reviews/product-review-section";
import { SimilarProductsSection } from "@/components/products/similar-products-section";
import { ProductDetailTabs } from "@/components/products/product-detail-tabs";
import { RecommendationSection } from "@/components/products/recommendation-section";
import { ProductViewTracker } from "@/components/products/product-view-tracker";
import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import AddToCart from "@/components/products/AddToCart";
import { PromotionOfferBanner } from "@/components/promotions/promotion-offer-banner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { orderImagesForDisplay } from "@/lib/product-images";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import {
  SHOP_BADGE,
  SHOP_BODY,
  SHOP_BODY_SM,
  SHOP_BREADCRUMB,
  SHOP_META_LABEL,
  SHOP_PRODUCT_TITLE,
} from "@/lib/typography";
import { recordRecentlyViewed } from "@/lib/recently-viewed-storage";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";

type ProductDetailViewProps = {
  params: Promise<{ id: string }>;
};

function ProductDetailSkeleton() {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl", CONTENT_SECTION_PADDING_Y)}
      style={PAGE_GUTTER}
    >
      <Skeleton className="mb-8 h-5 w-64 max-w-full" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailView({ params }: ProductDetailViewProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const promoId = searchParams.get("promo") as Id<"productPromotions"> | null;
  const now = useStableNow();
  const recordView = useMutation(api.productPromotions.recordView);
  const highlightedPromo = useStorefrontPromotion(promoId);
  const activePromotions = useActivePromotionsForProduct(
    id ? (id as Id<"products">) : null
  );

  useEffect(() => {
    if (promoId) void recordView({ id: promoId });
  }, [promoId, recordView]);

  useEffect(() => {
    if (id) recordRecentlyViewed(id);
  }, [id]);

  const { singleProduct, isSingleLoading } = useSingleProduct(
    id as Id<"products">
  );

  if (isSingleLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!singleProduct) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Product not found
        </h1>
        <p className={cn("mt-2 max-w-md", SHOP_BODY)}>
          This product may have been removed or the link is incorrect.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-[#6254f3] px-6 text-sm font-semibold text-white hover:bg-[#5548e0]"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const categoryName = singleProduct.category?.name ?? "Product";
  const inStock = singleProduct.stock > 0;
  const discountPercent = singleProduct.discountPercent ?? 0;
  const freeShipping = singleProduct.shipping === true;
  const galleryImages = orderImagesForDisplay(singleProduct).map((image) => ({
    url: image.url,
    alt: image.alt?.trim() || singleProduct.name,
  }));
  const storefrontPromotions =
    activePromotions?.filter((promo) => !promoId || promo._id !== promoId) ??
    [];

  const purchasePanel = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-full bg-[#6254f3]/10 px-3 py-0.5 font-semibold text-[#6254f3]",
            SHOP_BADGE
          )}
        >
          {categoryName}
        </Badge>
        {singleProduct.featured ? (
          <Badge
            className={cn(
              "rounded-full bg-amber-500/15 px-3 py-0.5 font-semibold text-amber-700 hover:bg-amber-500/15",
              SHOP_BADGE
            )}
          >
            Featured
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-0.5 font-semibold uppercase",
            SHOP_BADGE,
            inStock
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600"
          )}
        >
          {inStock ? "In stock" : "Out of stock"}
        </Badge>
      </div>

      {highlightedPromo ? (
        <PromotionOfferBanner
          promotion={highlightedPromo}
          variant="hero"
          now={now}
        />
      ) : null}

      {storefrontPromotions.length > 0 ? (
        <div className="space-y-2">
          {storefrontPromotions.map((promotion) => (
            <PromotionOfferBanner
              key={promotion._id}
              promotion={promotion}
              variant="compact"
              now={now}
            />
          ))}
        </div>
      ) : null}

      <div>
        <p className={SHOP_META_LABEL}>{singleProduct.company}</p>
        <h1 className={cn("mt-3", SHOP_PRODUCT_TITLE)}>
          {singleProduct.name}
        </h1>
      </div>

      <ProductRatingDisplay
        rating={singleProduct.stars}
        reviewCount={singleProduct.reviews}
      />

      <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={SHOP_META_LABEL}>Price</p>
          <ProductDiscountBadge discountPercent={discountPercent} />
        </div>
        <ProductPrice
          price={singleProduct.price}
          discountPercent={discountPercent}
          currency={singleProduct.currency}
          className="mt-1"
          size="md"
        />
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Truck className="size-4 shrink-0 text-[#6254f3]" />
          {freeShipping ? (
            <span className="font-medium text-emerald-600">Free Shipping</span>
          ) : (
            <span className="font-medium text-foreground">
              Shipping Charges:{" "}
              {formatCurrencyAmount(
                singleProduct.shippingCharges ?? 0,
                singleProduct.currency ?? DEFAULT_CURRENCY
              )}
            </span>
          )}
        </div>
      </div>

      {inStock ? (
        <AddToCart
          product={singleProduct}
          variant="detail"
          promotions={activePromotions}
          hidePromotionBanner={
            Boolean(highlightedPromo) || storefrontPromotions.length > 0
          }
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
          <p className="font-semibold text-foreground">Out of stock</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This item is currently unavailable. Check back soon or browse similar
            products.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-sm font-medium hover:bg-muted"
          >
            View all products
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn("mx-auto w-full max-w-7xl", CONTENT_SECTION_PADDING_Y)}
      style={PAGE_GUTTER}
    >
      <nav
        aria-label="Breadcrumb"
        className={cn("mb-6 sm:mb-8", SHOP_BREADCRUMB)}
      >
        <Link href="/home" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <Link
          href={`/products${singleProduct.category?.slug ? `?category=${singleProduct.category.slug}` : ""}`}
          className="transition-colors hover:text-foreground"
        >
          {categoryName}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <span className="line-clamp-1 font-medium text-foreground">
          {singleProduct.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <ProductImageGallery
          images={galleryImages}
          fallbackAlt={singleProduct.name}
        />
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">{purchasePanel}</div>
      </div>

      <ProductDetailTabs
        product={singleProduct}
        categoryName={categoryName}
        categorySlug={singleProduct.category?.slug}
        inStock={inStock}
        promotions={storefrontPromotions}
        now={now}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />

      <div id="product-reviews">
        <ProductReviewSection
          productId={singleProduct._id}
          className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
        />
      </div>

      <SimilarProductsSection
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />

      <RecommendationSection
        sectionType="recommended_for_you"
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />
      <RecommendationSection
        sectionType="customers_like_you_bought"
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />
      <RecommendationSection
        sectionType="recommended_alternatives"
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />
      <RecommendationSection
        sectionType="ai_suggested_accessories"
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />
      <RecommendationSection
        sectionType="frequently_bought_together"
        productId={singleProduct._id}
        cartProductIds={[singleProduct._id]}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />

      <ProductViewTracker productId={singleProduct._id} />
    </div>
  );
}
