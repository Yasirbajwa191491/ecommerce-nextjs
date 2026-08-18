export type ProductImageEntry = {
  url: string;
  alt?: string;
};

export type ProductWithImages = {
  name: string;
  image: ProductImageEntry[];
  primaryImageIndex?: number;
};

export function resolvePrimaryImageIndex(
  product: Pick<ProductWithImages, "image" | "primaryImageIndex">
): number {
  const count = product.image.length;
  if (count === 0) return 0;
  const index = product.primaryImageIndex ?? 0;
  return Math.min(Math.max(0, index), count - 1);
}

export function getPrimaryImage(
  product: Pick<ProductWithImages, "image" | "primaryImageIndex">
): ProductImageEntry | undefined {
  if (product.image.length === 0) return undefined;
  return product.image[resolvePrimaryImageIndex(product)];
}

export function getPrimaryImageUrl(
  product: Pick<ProductWithImages, "image" | "primaryImageIndex">,
  fallback = ""
): string {
  return getPrimaryImage(product)?.url ?? fallback;
}

export function getPrimaryImageAlt(
  product: Pick<ProductWithImages, "image" | "name" | "primaryImageIndex">
): string {
  const primary = getPrimaryImage(product);
  return primary?.alt?.trim() || product.name;
}
