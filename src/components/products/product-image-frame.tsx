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
          ? "aspect-square h-36 w-36 rounded-xl sm:h-44 sm:w-44 xl:h-52 xl:w-52"
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
