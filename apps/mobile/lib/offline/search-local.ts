import type { Product } from "@/types/product";
import { getAllCachedProducts } from "@/lib/offline/product-store";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function searchCachedProducts(query: string, limit = 20): Product[] {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const matches: Product[] = [];
  for (const product of getAllCachedProducts()) {
    const haystack = [
      product.name,
      product.company,
      product.category?.name,
      product.description,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();

    if (haystack.includes(needle)) {
      matches.push(product);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
