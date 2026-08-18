import type { Product } from "@/types/product";

export type ProductImageEntry = Product["image"][number];

export function resolvePrimaryImageIndex(
  product: Pick<Product, "image" | "primaryImageIndex">
): number {
  const count = product.image.length;
  if (count === 0) return 0;
  const index = product.primaryImageIndex ?? 0;
  return Math.min(Math.max(0, index), count - 1);
}

export function getPrimaryImage(
  product: Pick<Product, "image" | "primaryImageIndex">
): ProductImageEntry | undefined {
  if (product.image.length === 0) return undefined;
  return product.image[resolvePrimaryImageIndex(product)];
}

export function getPrimaryImageUrl(
  product: Pick<Product, "image" | "primaryImageIndex">,
  fallback = "/next.svg"
): string {
  return getPrimaryImage(product)?.url ?? fallback;
}

export function getPrimaryImageAlt(
  product: Pick<Product, "image" | "name" | "primaryImageIndex">
): string {
  const primary = getPrimaryImage(product);
  return primary?.alt?.trim() || product.name;
}

export function orderImagesForDisplay(
  product: Pick<Product, "image" | "primaryImageIndex">
): ProductImageEntry[] {
  if (product.image.length <= 1) return [...product.image];
  const primaryIndex = resolvePrimaryImageIndex(product);
  if (primaryIndex === 0) return [...product.image];
  return [
    product.image[primaryIndex]!,
    ...product.image.filter((_, i) => i !== primaryIndex),
  ];
}

/** Stable React key that changes when the storefront primary image changes. */
export function productCardKey(
  product: Pick<Product, "_id" | "image" | "primaryImageIndex">
): string {
  return `${product._id}:${getPrimaryImageUrl(product, "")}`;
}
