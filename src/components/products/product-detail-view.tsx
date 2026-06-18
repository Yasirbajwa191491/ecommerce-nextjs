"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronRight,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useSingleProduct } from "@/hooks/useProducts";
import { useStableNow } from "@/hooks/use-stable-now";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { ProductPrice } from "@/components/products/product-price";
import { ProductDiscountBadge } from "@/components/products/product-discount-badge";
import { ProductShippingBadge } from "@/components/products/product-shipping-badge";
import { ProductWarrantyBadge } from "@/components/products/product-warranty-badge";
import { ProductDeliveryOptions } from "@/components/products/product-delivery-options";
import { getWarrantyLabel } from "@/lib/product-display-helpers";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { ProductReviewSection } from "@/components/reviews/product-review-section";
import { SimilarProductsSection } from "@/components/products/similar-products-section";
import { formatCurrencyAmount, DEFAULT_CURRENCY } from "@/lib/currencies";
import AddToCart from "@/components/products/AddToCart";
import { PromotionOfferBanner } from "@/components/promotions/promotion-offer-banner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { orderImagesForDisplay } from "@/lib/product-images";
import { cn } from "@/lib/utils";

type ProductDetailViewProps = {
  params: Promise<{ id: string }>;
};

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
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
  const highlightedPromo = useQuery(
    api.productPromotions.getStorefrontById,
    promoId ? { id: promoId, now } : "skip"
  );
  const activePromotions = useQuery(
    api.productPromotions.getActiveForProduct,
    id ? { productId: id as Id<"products">, now } : "skip"
  );

  useEffect(() => {
    if (promoId) void recordView({ id: promoId });
  }, [promoId, recordView]);

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
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
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
  const productHighlights =
    singleProduct.highlights?.map((h) => h.trim()).filter(Boolean) ?? [];
  const galleryImages = orderImagesForDisplay(singleProduct).map((image) => ({
    url: image.url,
    alt: image.alt?.trim() || singleProduct.name,
  }));
  const warrantyLabel = getWarrantyLabel(singleProduct);
  const trustItems = [
    { icon: RefreshCw, label: "30-day returns" },
    { icon: Package, label: "Secure packaging" },
    ...(warrantyLabel
      ? [{ icon: ShieldCheck, label: warrantyLabel } as const]
      : []),
  ];
  const storefrontPromotions =
    activePromotions?.filter((promo) => !promoId || promo._id !== promoId) ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mb-8"
      >
        <Link href="/home" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <Link
          href="/products"
          className="transition-colors hover:text-foreground"
        >
          Products
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <span className="text-foreground/80">{categoryName}</span>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <span className="line-clamp-1 font-medium text-foreground">
          {singleProduct.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12 xl:gap-16">
        <ProductImageGallery
          images={galleryImages}
          fallbackAlt={singleProduct.name}
        />

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:z-10 lg:gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full bg-[#6254f3]/10 px-3 py-0.5 text-[11px] font-semibold tracking-wide text-[#6254f3] uppercase"
            >
              {categoryName}
            </Badge>
            {singleProduct.featured ? (
              <Badge className="rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-semibold tracking-wide text-amber-700 uppercase hover:bg-amber-500/15">
                Featured
              </Badge>
            ) : null}
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase",
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
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {singleProduct.company}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {singleProduct.name}
            </h1>
          </div>

          <ProductRatingDisplay
            rating={singleProduct.stars}
            reviewCount={singleProduct.reviews}
          />

          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Price
              </p>
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

          {productHighlights.length > 0 ? (
            <ul className="space-y-2 text-sm text-foreground sm:text-base">
              {productHighlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#6254f3]" aria-hidden>
                    ✓
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {singleProduct.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
              {singleProduct.description}
            </p>
          ) : null}

          <ProductWarrantyBadge product={singleProduct} showDetails />

          <ProductDeliveryOptions product={singleProduct} />

          <dl className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 text-sm sm:grid-cols-2 sm:p-5">
            <div>
              <dt className="text-muted-foreground">Brand</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {singleProduct.company}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {categoryName}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {inStock
                  ? `${singleProduct.stock} in stock`
                  : "Currently unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Product ID</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-foreground/80">
                {singleProduct._id}
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
            {trustItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-5 text-[#6254f3]" />
                </span>
                <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {inStock ? (
            <AddToCart product={singleProduct} variant="detail" />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
              <p className="font-semibold text-foreground">Out of stock</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This item is currently unavailable. Check back soon or browse
                similar products.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-sm font-medium hover:bg-muted"
              >
                View all products
              </Link>
            </div>
          )}
        </div>
      </div>

      <ProductReviewSection
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />

      <SimilarProductsSection
        productId={singleProduct._id}
        className="mt-12 border-t border-border/60 pt-10 lg:mt-16"
      />

      {singleProduct.description ? (
        <section className="mt-12 border-t border-border/60 pt-10 lg:mt-16">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Product description
          </h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
            {singleProduct.description}
          </p>
        </section>
      ) : null}
    </div>
  );
}
