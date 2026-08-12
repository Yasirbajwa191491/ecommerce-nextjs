"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDeliveryOptions } from "@/components/products/product-delivery-options";
import { ProductWarrantyBadge } from "@/components/products/product-warranty-badge";
import { PromotionOfferBanner } from "@/components/promotions/promotion-offer-banner";
import type { ActiveProductPromotions } from "@/hooks/use-storefront-promotions";
import type { Product } from "@/types/product";
import { SHOP_BODY, SHOP_BODY_SM, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ProductDetailTabsProps = {
  product: Product;
  categoryName: string;
  categorySlug?: string;
  inStock: boolean;
  promotions?: ActiveProductPromotions;
  now: number;
  className?: string;
};

export function ProductDetailTabs({
  product,
  categoryName,
  categorySlug,
  inStock,
  promotions,
  now,
  className,
}: ProductDetailTabsProps) {
  const highlights =
    product.highlights?.map((h) => h.trim()).filter(Boolean) ?? [];

  return (
    <Tabs defaultValue="details" className={cn("w-full", className)}>
      <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/40 p-1">
        <TabsTrigger value="details" className="rounded-lg px-4 py-2">
          Details
        </TabsTrigger>
        <TabsTrigger value="specs" className="rounded-lg px-4 py-2">
          Specifications
        </TabsTrigger>
        <TabsTrigger value="warranty" className="rounded-lg px-4 py-2">
          Warranty
        </TabsTrigger>
        <TabsTrigger value="delivery" className="rounded-lg px-4 py-2">
          Delivery
        </TabsTrigger>
        {promotions && promotions.length > 0 ? (
          <TabsTrigger value="promotions" className="rounded-lg px-4 py-2">
            Promotions
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="details" className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        {highlights.length > 0 ? (
          <ul className={cn("space-y-2 text-foreground", SHOP_BODY)}>
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2">
                <span className="text-brand-primary" aria-hidden>
                  ✓
                </span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {product.description ? (
          <p className={cn("whitespace-pre-line text-foreground", SHOP_BODY)}>
            {product.description}
          </p>
        ) : (
          <p className={SHOP_BODY}>No additional details available.</p>
        )}
      </TabsContent>

      <TabsContent value="specs">
        <dl className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <dt className={SHOP_BODY_SM}>Brand</dt>
            <dd className="mt-1 font-semibold text-foreground">{product.company}</dd>
          </div>
          <div>
            <dt className={SHOP_BODY_SM}>Category</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {categorySlug ? (
                <a href={`/products?category=${categorySlug}`} className="hover:text-brand-primary">
                  {categoryName}
                </a>
              ) : (
                categoryName
              )}
            </dd>
          </div>
          <div>
            <dt className={SHOP_BODY_SM}>SKU</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {product.sku ?? "—"}
            </dd>
          </div>
          <div>
            <dt className={SHOP_BODY_SM}>Availability</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {inStock ? `${product.stock} in stock` : "Out of stock"}
            </dd>
          </div>
          {product.colors.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className={SHOP_BODY_SM}>Colors</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {product.colors.join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>
      </TabsContent>

      <TabsContent value="warranty">
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className={SHOP_SUBSECTION_TITLE}>Warranty information</h2>
          <div className="mt-4">
            <ProductWarrantyBadge product={product} showDetails />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="delivery">
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className={SHOP_SUBSECTION_TITLE}>Delivery options</h2>
          <div className="mt-4">
            <ProductDeliveryOptions product={product} />
          </div>
        </div>
      </TabsContent>

      {promotions && promotions.length > 0 ? (
        <TabsContent value="promotions" className="space-y-3">
          {promotions.map((promotion) => (
            <PromotionOfferBanner
              key={promotion._id}
              promotion={promotion}
              variant="compact"
              now={now}
            />
          ))}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
