import type { Doc } from "../_generated/dataModel";

export type ProductImage = Doc<"products">["image"][number];

export function resolvePrimaryImageIndex(
  product: Pick<Doc<"products">, "image" | "primaryImageIndex">
): number {
  const count = product.image.length;
  if (count === 0) return 0;
  const index = product.primaryImageIndex ?? 0;
  return Math.min(Math.max(0, index), count - 1);
}

export function getPrimaryImage(
  product: Pick<Doc<"products">, "image" | "primaryImageIndex">
): ProductImage | undefined {
  if (product.image.length === 0) return undefined;
  return product.image[resolvePrimaryImageIndex(product)];
}

export function getPrimaryImageUrl(
  product: Pick<Doc<"products">, "image" | "primaryImageIndex">,
  fallback = ""
): string {
  return getPrimaryImage(product)?.url ?? fallback;
}

export function orderImagesForDisplay(
  product: Pick<Doc<"products">, "image" | "primaryImageIndex">
): ProductImage[] {
  if (product.image.length <= 1) return [...product.image];
  const primaryIndex = resolvePrimaryImageIndex(product);
  if (primaryIndex === 0) return [...product.image];
  return [
    product.image[primaryIndex]!,
    ...product.image.filter((_, i) => i !== primaryIndex),
  ];
}
