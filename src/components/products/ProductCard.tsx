"use client";

import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import { ProductPrice } from "@/components/products/product-price";
import { ProductStars } from "@/components/products/product-stars";
import { cn } from "@/lib/utils";

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
        href={`/singleproduct/${product._id}`}
        className="group flex items-stretch gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-[#6254f3]/30 hover:shadow-md sm:gap-5 sm:p-5"
      >
        <div className="relative w-48 shrink-0 self-stretch overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/40 sm:w-60 md:w-64 lg:w-72 xl:w-80">
          <div className="relative h-full min-h-[10rem] w-full sm:min-h-[11rem]">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 192px, (max-width: 768px) 240px, (max-width: 1024px) 288px, 320px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

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
      href={`/singleproduct/${product._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-[#6254f3]/20 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-muted/80 to-muted/30">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#6254f3] uppercase shadow-sm backdrop-blur-sm">
          {categoryName}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4 sm:p-4">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {product.company}
        </p>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">
          {product.name}
        </h3>
        <ProductStars rating={product.stars} />
        <div className="border-t border-border/50 pt-2.5">
          <ProductPrice price={product.price} currency={product.currency} />
        </div>
      </div>
    </Link>
  );
}
