"use client";

import Image from "next/image";
import { isLightColor, normalizeHexColor } from "@/lib/color-presets";
import { cn } from "@/lib/utils";

type ProductImageThumbnailsProps = {
  images: { url: string }[];
  alt: string;
};

export function ProductImageThumbnails({
  images,
  alt,
}: ProductImageThumbnailsProps) {
  if (images.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[160px] flex-wrap gap-1">
      {images.map((img, index) => (
        <Image
          key={`${img.url}-${index}`}
          src={img.url}
          alt={`${alt} ${index + 1}`}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded border bg-muted/30 object-contain object-center p-0.5"
        />
      ))}
    </div>
  );
}

type ProductColorSwatchesProps = {
  colors: string[];
};

export function ProductColorSwatches({ colors }: ProductColorSwatchesProps) {
  if (colors.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[120px] flex-wrap gap-1">
      {colors.map((color, index) => {
        const hex = normalizeHexColor(color) ?? color;
        return (
          <span
            key={`${hex}-${index}`}
            title={hex}
            className={cn(
              "size-6 shrink-0 rounded-full border",
              isLightColor(hex) ? "border-border" : "border-transparent"
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
