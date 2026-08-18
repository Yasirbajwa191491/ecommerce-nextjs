"use client";

import { useState } from "react";
import { GitCompare, Heart, ShoppingCart, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductQuickViewDialog } from "@/components/products/product-quick-view-dialog";
import type { Id } from "@convex/_generated/dataModel";
import { useCartContext } from "@/context/cart_context";
import { useProductCompare } from "@/hooks/use-product-compare";
import { useWishlist } from "@/hooks/use-wishlist";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

type ProductCardActionsProps = {
  product: Product;
  className?: string;
};

export function ProductCardActions({ product, className }: ProductCardActionsProps) {
  const { addToCart } = useCartContext();
  const { toggle, has } = useWishlist();
  const { addProduct, isComparing } = useProductCompare();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const inWishlist = has(product._id);
  const comparing = isComparing(product._id);
  const inStock = product.stock > 0;

  const actionClass =
    "size-9 rounded-full border border-white/80 bg-white/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-white hover:text-brand-primary";

  return (
    <>
      <div
        className={cn(
          "product-card-actions absolute inset-x-0 bottom-0 z-20 flex translate-y-0 items-center justify-center gap-2 p-3 opacity-100 transition-all duration-300",
          className
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={actionClass}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={inWishlist}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const added = toggle(product._id);
            toast.success(added ? "Added to wishlist" : "Removed from wishlist");
          }}
        >
          <Heart
            className={cn("size-4", inWishlist && "fill-brand-primary text-brand-primary")}
          />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={actionClass}
          aria-label="Quick view"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuickViewOpen(true);
          }}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(actionClass, comparing && "border-brand-primary text-brand-primary")}
          aria-label="Compare product"
          aria-pressed={comparing}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addProduct(product);
            toast.success("Added to compare");
          }}
        >
          <GitCompare className="size-4" />
        </Button>
        {inStock ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(actionClass, "bg-brand-primary text-white hover:bg-brand-primary-hover hover:text-white")}
            aria-label="Add to cart"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const color = resolveProductColorOrDefault(
                product.colors,
                product.colors[0] ?? "#000000"
              );
              addToCart(product._id, color, 1, product);
              toast.success("Added to cart");
            }}
          >
            <ShoppingCart className="size-4" />
          </Button>
        ) : null}
      </div>

      <ProductQuickViewDialog
        productId={product._id as Id<"products">}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </>
  );
}
