import { cn } from "@/lib/utils";

export type ProductImageVariant = "catalog" | "detail" | "list";

type ProductImageClassOptions = {
  interactive?: boolean;
  variant?: ProductImageVariant;
};

/** Catalog = uniform cropped tiles. Detail = full image visible. */
export function productImageClassName(
  options: ProductImageClassOptions | boolean = {}
) {
  const normalized =
    typeof options === "boolean" ? { interactive: options } : options;
  const { interactive = false, variant = "detail" } = normalized;

  return cn(
    variant === "catalog" || variant === "list"
      ? "object-cover object-center"
      : "object-contain object-top",
    interactive && "transition-transform duration-500 group-hover:scale-[1.03]"
  );
}
