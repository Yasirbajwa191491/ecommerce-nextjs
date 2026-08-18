"use client";

import Image from "next/image";
import { useState } from "react";
import { MotionHoverStoryImage } from "@/components/motion";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = {
  src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
  alt: "Contemporary products in a modern home setting",
} as const;

type AboutImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

export function AboutImage({
  src,
  alt,
  priority = false,
  className,
}: AboutImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [imageAlt, setImageAlt] = useState(alt);

  return (
    <MotionHoverStoryImage className={cn("w-full", className)}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={1200}
        height={900}
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="h-auto w-full object-cover"
        onError={() => {
          if (imageSrc !== FALLBACK_IMAGE.src) {
            setImageSrc(FALLBACK_IMAGE.src);
            setImageAlt(FALLBACK_IMAGE.alt);
          }
        }}
      />
    </MotionHoverStoryImage>
  );
}
