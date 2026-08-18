import type { Metadata } from "next";
import type { Product } from "@/types/product";
import { getPrimaryImageUrl, getPrimaryImageAlt } from "@/lib/product-images";
import { createPageMetadata } from "@/lib/seo";

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function buildProductPageMetadata(product: Product): Metadata {
  const title = product.seoTitle?.trim() || product.name;
  const description =
    product.seoDescription?.trim() ||
    (product.description?.trim()
      ? truncateText(product.description, 160)
      : `Shop ${product.name} at our store.`);

  const base = createPageMetadata({
    title,
    description,
    path: `/product/${product._id}`,
  });

  const keywords = product.seoKeywords?.filter(Boolean);
  const imageUrl = getPrimaryImageUrl(product, "");
  const primaryAlt = getPrimaryImageAlt(product);

  return {
    ...base,
    ...(keywords?.length ? { keywords } : {}),
    openGraph: {
      ...base.openGraph,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl, alt: primaryAlt }] } : {}),
    },
    twitter: {
      ...base.twitter,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
