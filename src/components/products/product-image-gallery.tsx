"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { productImageClassName } from "@/lib/product-image-styles";
import { cn } from "@/lib/utils";

type ProductImage = {
  url: string;
};

type ProductImageGalleryProps = {
  images: ProductImage[];
  alt: string;
};

export function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const galleryImages =
    images.length > 0 ? images : [{ url: "/next.svg" }];
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      const total = galleryImages.length;
      setActiveIndex(((index % total) + total) % total);
    },
    [galleryImages.length]
  );

  useEffect(() => {
    if (activeIndex >= galleryImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, galleryImages.length]);

  const activeImage = galleryImages[activeIndex];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
      {galleryImages.length > 1 ? (
        <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={activeIndex === index}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted/30 transition-all sm:size-[4.5rem] lg:size-[4.75rem]",
                activeIndex === index
                  ? "border-[#6254f3] ring-2 ring-[#6254f3]/20"
                  : "border-border/60 hover:border-[#6254f3]/40"
              )}
            >
              <div className="absolute inset-1.5">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="76px"
                  className={productImageClassName({ variant: "detail" })}
                />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative order-1 min-w-0 flex-1 lg:order-2">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-sm">
          <ProductImageFrame
            src={activeImage.url}
            alt={alt}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            variant="detail"
            className="rounded-none bg-gradient-to-br from-muted/50 to-muted/20 sm:min-h-[28rem] lg:min-h-[32rem]"
          />

          {galleryImages.length > 1 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute top-1/2 left-3 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute top-1/2 right-3 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
              >
                <ChevronRight className="size-5" />
              </Button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {activeIndex + 1} / {galleryImages.length}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
