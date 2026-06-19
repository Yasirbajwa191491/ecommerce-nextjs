"use client";

import ProductCard from "@/components/products/ProductCard";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { MotionSkeleton } from "@/components/motion";
import { PAGE_GUTTER } from "@/lib/layout-constants";
import type { Product } from "@/types/product";
import { productCardKey } from "@/lib/product-images";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductCarouselSectionProps = {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  description?: string;
  products: Product[] | undefined;
  action?: { label: string; href: string };
  className?: string;
  background?: "default" | "muted";
};

function ProductCarouselSkeleton() {
  return (
    <div className="mt-8 flex gap-4 overflow-hidden lg:mt-10">
      {Array.from({ length: 4 }).map((_, index) => (
        <MotionSkeleton
          key={index}
          shimmer
          className="h-[22rem] w-[min(280px,78vw)] shrink-0 rounded-2xl"
        />
      ))}
    </div>
  );
}

export function ProductCarouselSection({
  badge,
  badgeIcon,
  title,
  description,
  products,
  action,
  className,
  background = "default",
}: ProductCarouselSectionProps) {
  const isLoading = products === undefined;
  const isEmpty = products?.length === 0;

  return (
    <section
      className={cn(
        "py-10 sm:py-14 md:py-16",
        background === "muted" ? "bg-muted/30" : "bg-background",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge={badge}
          badgeIcon={badgeIcon}
          title={title}
          description={description}
          action={action}
        />

        {isLoading ? (
          <ProductCarouselSkeleton />
        ) : isEmpty ? (
          <ScrollReveal className="mt-8" variant="scale">
            <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-12 text-center">
              <p className="text-base font-semibold text-foreground">
                No products to show yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon as we add more to the catalog.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal className="relative mt-8 lg:mt-10" delay={160}>
            <Carousel
              opts={{
                align: "start",
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4">
                {products.map((product) => (
                  <CarouselItem
                    key={productCardKey(product)}
                    className="basis-[88%] pl-3 sm:basis-[55%] sm:pl-4 md:basis-[42%] lg:basis-[30%] xl:basis-[24%]"
                  >
                    <ProductCard {...product} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-1 size-8 border-border/80 bg-background shadow-md sm:-left-2 sm:size-9 md:flex" />
              <CarouselNext className="-right-1 size-8 border-border/80 bg-background shadow-md sm:-right-2 sm:size-9 md:flex" />
            </Carousel>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
