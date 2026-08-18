"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { ProductPrice } from "@/components/products/product-price";
import { ProductStockBadge } from "@/components/products/product-stock-badge";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/context/cart_context";
import { useWishlist } from "@/hooks/use-wishlist";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import { getPrimaryImageUrl } from "@/lib/product-images";
import { productPath } from "@/lib/product-url";
import {
  CONTENT_SECTION_PADDING_Y,
  PAGE_GUTTER,
  PRIMARY_BUTTON_CLASS,
} from "@/lib/layout-constants";
import { SHOP_LINE_ITEM_TITLE, SHOP_PAGE_LEAD, SHOP_PAGE_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { MotionSkeleton } from "@/components/motion";
import Image from "next/image";

export function WishlistView() {
  const { ids, remove } = useWishlist();
  const { addToCart } = useCartContext();
  const products = useQuery(
    api.products.listByIds,
    ids.length ? { ids: ids as Id<"products">[] } : "skip"
  );

  return (
    <div className={cn("min-h-[60vh] bg-muted/20", CONTENT_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <header className="mb-8">
          <h1 className={SHOP_PAGE_TITLE}>Your Wishlist</h1>
          <p className={SHOP_PAGE_LEAD}>
            Save products you love and add them to cart when you are ready.
          </p>
        </header>

        {!ids.length ? (
          <ShopEmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here."
            action={{ href: "/products", label: "Browse products" }}
          />
        ) : products === undefined ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MotionSkeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {products.map((product) => (
              <li
                key={product._id}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
              >
                <Link
                  href={productPath(product._id)}
                  className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  <Image
                    src={getPrimaryImageUrl(product)}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={productPath(product._id)} className={SHOP_LINE_ITEM_TITLE}>
                    {product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{product.company}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <ProductPrice
                      price={product.price}
                      discountPercent={product.discountPercent ?? 0}
                      currency={product.currency}
                      size="sm"
                    />
                    <ProductStockBadge stock={product.stock} variant="compact" />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Button
                    type="button"
                    disabled={product.stock <= 0}
                    className={cn(PRIMARY_BUTTON_CLASS, "h-10 px-5 text-sm")}
                    onClick={() => {
                      const color = resolveProductColorOrDefault(
                        product.colors,
                        product.colors[0] ?? "#000000"
                      );
                      addToCart(product._id, color, 1, product);
                      toast.success("Added to cart");
                    }}
                  >
                    <ShoppingCart className="size-4" />
                    Add to cart
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 rounded-full"
                    onClick={() => {
                      remove(product._id);
                      toast.success("Removed from wishlist");
                    }}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
