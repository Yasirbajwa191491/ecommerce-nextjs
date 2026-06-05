import Image from "next/image";
import { productImageClassName, type ProductImageVariant } from "@/lib/product-image-styles";
import { cn } from "@/lib/utils";

type ProductImageFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  interactive?: boolean;
  priority?: boolean;
  variant?: ProductImageVariant;
  className?: string;
};

export function ProductImageFrame({
  src,
  alt,
  sizes,
  interactive = false,
  priority = false,
  variant = "catalog",
  className,
}: ProductImageFrameProps) {
  const isCatalog = variant === "catalog";

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-white",
        isCatalog ? "aspect-[4/3]" : "aspect-[4/5]",
        className
      )}
    >
      {isCatalog ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={productImageClassName({ interactive, variant: "catalog" })}
        />
      ) : (
        <div className="absolute inset-3 sm:inset-4">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className={productImageClassName({ interactive, variant: "detail" })}
          />
        </div>
      )}
    </div>
  );
}
