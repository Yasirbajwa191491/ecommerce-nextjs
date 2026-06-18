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
  const isList = variant === "list";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-white",
        isList
          ? "aspect-square h-44 w-44 rounded-xl sm:h-56 sm:w-56"
          : cn(
              "w-full",
              isCatalog ? "aspect-[4/3]" : "aspect-[4/5]"
            ),
        className
      )}
    >
      {isCatalog || isList ? (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={productImageClassName({
            interactive,
            variant: isList ? "list" : "catalog",
          })}
        />
      ) : (
        <div className="absolute inset-3 sm:inset-4">
          <Image
            key={src}
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
