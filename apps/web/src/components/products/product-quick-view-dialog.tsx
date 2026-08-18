"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import AddToCart from "@/components/products/AddToCart";
import { ProductPrice } from "@/components/products/product-price";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { getPrimaryImageUrl } from "@/lib/product-images";
import { productPath } from "@/lib/product-url";
import { SHOP_BODY, SHOP_PRODUCT_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ProductQuickViewDialogProps = {
  productId: Id<"products"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductQuickViewDialog({
  productId,
  open,
  onOpenChange,
}: ProductQuickViewDialogProps) {
  const product = useQuery(
    api.products.getById,
    productId ? { id: productId } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Quick view</DialogTitle>
        </DialogHeader>
        {!product ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <ProductImageFrame
              src={getPrimaryImageUrl(product)}
              alt={product.name}
              sizes="(max-width: 640px) 100vw, 50vw"
              variant="catalog"
              className="rounded-xl"
            />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {product.company}
              </p>
              <Link
                href={productPath(product._id)}
                className={cn("hover:text-brand-primary", SHOP_PRODUCT_TITLE)}
                onClick={() => onOpenChange(false)}
              >
                {product.name}
              </Link>
              <ProductRatingDisplay
                rating={product.stars}
                reviewCount={product.reviews}
                size="sm"
              />
              <ProductPrice
                price={product.price}
                discountPercent={product.discountPercent ?? 0}
                currency={product.currency}
              />
              <p className={cn("line-clamp-3", SHOP_BODY)}>{product.description}</p>
              <AddToCart product={product} variant="detail" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
