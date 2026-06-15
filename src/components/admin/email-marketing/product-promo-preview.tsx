"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PromoProduct = {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  currency: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ProductPromoPreview({
  products,
  productPromoText,
  ctaText = "Shop Now",
}: {
  products: PromoProduct[];
  productPromoText?: string;
  ctaText?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products selected. Attach discounted products to add a promotional section.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {productPromoText?.trim() ? (
        <p className="text-center text-sm text-muted-foreground">{productPromoText}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <div
          key={product._id}
          className="flex gap-4 rounded-lg border bg-background p-4"
        >
          <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold leading-tight">{product.name}</p>
            <Badge variant="destructive">{product.discountPercent}% OFF</Badge>
            <p className="text-sm">
              <span className="text-muted-foreground line-through">
                {formatMoney(product.price, product.currency)}
              </span>{" "}
              <span className="font-semibold">
                {formatMoney(product.discountedPrice, product.currency)}
              </span>
            </p>
            <Button type="button" size="sm" variant="default">
              {ctaText}
            </Button>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
