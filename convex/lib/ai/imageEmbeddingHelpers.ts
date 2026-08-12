import type { Doc } from "../../_generated/dataModel";
import { getPrimaryImageUrl } from "../productImages";

export function computeImageContentHash(
  product: Pick<Doc<"products">, "image" | "primaryImageIndex">
): string | null {
  const url = getPrimaryImageUrl(product);
  if (!url) return null;
  return simpleHash(url.trim().toLowerCase());
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `img_${Math.abs(hash).toString(36)}`;
}

export function buildImageEmbeddingIdempotencyKey(
  productId: string,
  contentHash: string
): string {
  return `image_embed:${productId}:${contentHash}`;
}
