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
  alt?: string;
};

type ProductImageGalleryProps = {
  images: ProductImage[];
  fallbackAlt: string;
  variant?: "detail" | "list";
};

export function ProductImageGallery({
  images,
  fallbackAlt,
  variant = "detail",
}: ProductImageGalleryProps) {
  const isList = variant === "list";
  const galleryImages =
    images.length > 0 ? images : [{ url: "/next.svg" }];
  const [activeIndex, setActiveIndex] = useState(0);
  const imageFingerprint = galleryImages.map((image) => image.url).join("|");

  const goTo = useCallback(
    (index: number) => {
      const total = galleryImages.length;
      setActiveIndex(((index % total) + total) % total);
    },
    [galleryImages.length]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [imageFingerprint]);

  useEffect(() => {
    if (activeIndex >= galleryImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, galleryImages.length]);

  const activeImage = galleryImages[activeIndex];
  const activeAlt = activeImage.alt?.trim() || fallbackAlt;

  return (
    <div
      className={cn(
        "flex",
        isList
          ? "shrink-0 flex-row gap-2 sm:gap-2.5"
          : "flex-col gap-4 lg:flex-row lg:gap-5"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {galleryImages.length > 1 ? (
        <div
          className={cn(
            isList
              ? "flex w-11 shrink-0 flex-col gap-1.5 overflow-y-auto sm:w-12 sm:gap-2"
              : "order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
          )}
        >
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex(index);
              }}
              aria-label={`View image ${index + 1}`}
              aria-current={activeIndex === index}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-lg border-2 bg-muted/30 transition-all",
                isList
                  ? "size-11 sm:size-12"
                  : "size-16 sm:size-[4.5rem] lg:size-[4.75rem] rounded-xl",
                activeIndex === index
                  ? "border-[#6254f3] ring-2 ring-[#6254f3]/20"
                  : "border-border/60 hover:border-[#6254f3]/40"
              )}
            >
              <div className={cn("absolute", isList ? "inset-1" : "inset-1.5")}>
                <Image
                  src={image.url}
                  alt={
                    image.alt?.trim() ||
                    `View ${fallbackAlt} image ${index + 1}`
                  }
                  fill
                  sizes={isList ? "48px" : "76px"}
                  className={productImageClassName({ variant: "detail" })}
                />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          isList
            ? "relative shrink-0"
            : "relative order-1 min-w-0 flex-1 lg:order-2"
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden border border-border/60",
            isList ? "rounded-xl" : "rounded-2xl shadow-sm"
          )}
        >
          <ProductImageFrame
            src={activeImage.url}
            alt={activeAlt}
            priority={!isList}
            sizes={
              isList
                ? "(max-width: 640px) 176px, 224px"
                : "(max-width: 1024px) 100vw, 55vw"
            }
            interactive={isList}
            variant={isList ? "list" : "detail"}
            className={
              isList
                ? "rounded-none"
                : "rounded-none bg-gradient-to-br from-muted/50 to-muted/20 sm:min-h-[28rem] lg:min-h-[32rem]"
            }
          />

          {galleryImages.length > 1 && !isList ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  goTo(activeIndex - 1);
                }}
                className="absolute top-1/2 left-3 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  goTo(activeIndex + 1);
                }}
                className="absolute top-1/2 right-3 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
              >
                <ChevronRight className="size-5" />
              </Button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {activeIndex + 1} / {galleryImages.length}
              </div>
            </>
          ) : null}

          {galleryImages.length > 1 && isList ? (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-sm font-medium text-white backdrop-blur-sm">
              {activeIndex + 1} / {galleryImages.length}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
