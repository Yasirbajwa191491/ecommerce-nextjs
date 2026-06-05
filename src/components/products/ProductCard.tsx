"use client";

import Link from "next/link";
import { productPath } from "@/lib/product-url";
import { Product } from "@/types/product";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductPrice } from "@/components/products/product-price";
import { ProductStars } from "@/components/products/product-stars";

type ProductCardProps = Product & {
  view?: "grid" | "list";
};

export default function ProductCard({
  view = "grid",
  ...product
}: ProductCardProps) {
  const imageUrl = product.image[0]?.url ?? "/next.svg";
  const categoryName = product.category?.name ?? "Product";

  if (view === "list") {
    return (
      <Link
        href={productPath(product._id)}
        className="group flex items-stretch gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-[#6254f3]/30 hover:shadow-md sm:gap-5 sm:p-5"
      >
        <ProductImageFrame
          src={imageUrl}
          alt={product.name}
          sizes="(max-width: 640px) 112px, 128px"
          interactive
          variant="catalog"
          className="w-28 rounded-xl sm:w-32"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="rounded-full bg-[#6254f3]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#6254f3] uppercase">
                {categoryName}
              </span>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {product.company}
              </span>
            </div>
            <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {product.name}
            </h3>
            {product.description ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
            <ProductStars rating={product.stars} className="mt-0.5" />
          </div>

          <div className="flex shrink-0 flex-col justify-center border-t border-border/50 pt-3 sm:w-36 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 sm:text-right md:w-40">
            <ProductPrice
              price={product.price}
              currency={product.currency}
              className="sm:justify-end"
            />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={productPath(product._id)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-[#6254f3]/20 hover:shadow-lg"
    >
      <div className="relative shrink-0">
        <ProductImageFrame
          src={imageUrl}
          alt={product.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          interactive
          variant="catalog"
          className="rounded-none"
        />
        <span className="absolute top-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#6254f3] uppercase shadow-sm backdrop-blur-sm">
          {categoryName}
        </span>
      </div>

      <div className="flex min-h-[8rem] flex-1 flex-col gap-2 p-4">
        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {product.company}
        </p>
        <h3 className="line-clamp-2 h-[2.75rem] text-base font-semibold leading-snug tracking-tight text-foreground">
          {product.name}
        </h3>
        <div className="h-5">
          <ProductStars rating={product.stars} />
        </div>
        <div className="mt-auto border-t border-border/50 pt-2.5">
          <ProductPrice price={product.price} currency={product.currency} />
        </div>
      </div>
    </Link>
  );
}
