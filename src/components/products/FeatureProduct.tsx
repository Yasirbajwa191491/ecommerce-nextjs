"use client";

import { useProducts } from "@/hooks/useProducts";
import ProductCard from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeatureProduct() {
  const { featureProducts, isLoading } = useProducts();

  return (
    <section className="bg-muted/30 py-10 sm:py-14 md:py-16 lg:py-20">
      <div
        className="mx-auto w-full max-w-[1600px]"
        style={{
          paddingLeft: "clamp(1rem, 3vw, 3rem)",
          paddingRight: "clamp(1rem, 3vw, 3rem)",
        }}
      >
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10 md:mb-12 lg:mx-0 lg:text-left">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#6254f3] uppercase sm:text-sm">
            Check now!
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Our Feature Services
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Handpicked favorites from our catalog — quality pieces for every
            room and lifestyle.
          </p>
        </div>

        {isLoading ? (
          <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:grid-cols-3 lg:gap-6 xl:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-[18rem] w-full rounded-2xl sm:h-[19rem]"
              />
            ))}
          </div>
        ) : featureProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-16 text-center">
            <p className="text-lg font-semibold text-foreground">
              No featured products yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Mark products as featured in admin to showcase them here.
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:grid-cols-3 lg:gap-6 xl:gap-8">
            {featureProducts.map((product) => (
              <ProductCard key={product._id} {...product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
