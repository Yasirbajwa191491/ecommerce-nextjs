import type { Id } from "@convex/_generated/dataModel";
import type { Product } from "@/types/product";

/** Minimal search result shape from hybrid/similar search actions. */
export type SearchResultProduct = {
  _id: Id<"products">;
  name: string;
  company: string;
  imageUrl: string;
  images?: { url: string; alt?: string }[];
  price: number;
  discountPercent: number;
  currency: string;
  categoryId: Id<"productCategories">;
  categoryName: string;
  stars: number;
  reviews: number;
  featured: boolean;
  finalPrice: number;
  stock: number;
  shipping: boolean;
  description: string;
  _creationTime?: number;
};

export function searchResultToProduct(item: SearchResultProduct): Product {
  return {
    _id: item._id,
    _creationTime: item._creationTime ?? 0,
    name: item.name,
    company: item.company,
    price: item.price,
    discountPercent: item.discountPercent,
    currency: item.currency,
    categoryId: item.categoryId,
    stars: item.stars,
    reviews: item.reviews,
    featured: item.featured,
    stock: item.stock,
    shipping: item.shipping,
    description: item.description,
    colors: [],
    image: item.images?.length
      ? item.images
      : item.imageUrl
        ? [{ url: item.imageUrl, alt: item.name }]
        : [],
    category: item.categoryName
      ? { _id: item.categoryId, name: item.categoryName, slug: "" }
      : null,
  } as Product;
}
