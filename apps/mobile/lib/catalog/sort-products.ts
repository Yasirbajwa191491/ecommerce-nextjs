import type { CatalogSort } from "@/lib/catalog/filters";
import type { Product } from "@/types/product";

function finalPrice(product: Product): number {
  const discount = product.discountPercent ?? 0;
  return discount > 0 ? product.price * (1 - discount / 100) : product.price;
}

export function sortProductsClient(products: Product[], sort: CatalogSort): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "lowest":
      sorted.sort((a, b) => finalPrice(a) - finalPrice(b));
      break;
    case "highest":
      sorted.sort((a, b) => finalPrice(b) - finalPrice(a));
      break;
    case "a-z":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "z-a":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "popular":
      sorted.sort(
        (a, b) =>
          b.reviews - a.reviews ||
          b.stars - a.stars ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      break;
    case "newest":
      sorted.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
      break;
    case "rating":
      sorted.sort(
        (a, b) =>
          b.stars - a.stars || b.reviews - a.reviews || a.name.localeCompare(b.name)
      );
      break;
    default:
      sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      break;
  }
  return sorted;
}
