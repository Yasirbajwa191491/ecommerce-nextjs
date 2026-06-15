import type { Id } from "../../convex/_generated/dataModel";
import type { HybridSearchProduct } from "@/hooks/use-hybrid-product-search";
import type { Product } from "@/types/product";

/** Map hybrid search hits to catalog cards when full listByIds data is not ready yet. */
export function mapHybridSearchProductsToCatalog(
  items: HybridSearchProduct[]
): Product[] {
  return items.map((item) => ({
    _id: item._id as Id<"products">,
    _creationTime: 0,
    name: item.name,
    company: item.company,
    price: item.price,
    currency: item.currency,
    discountPercent: item.discountPercent,
    stars: item.stars,
    reviews: item.reviews,
    featured: item.featured,
    description: item.description,
    stock: item.stock,
    shipping: item.shipping,
    colors: [],
    image: [{ url: item.imageUrl, alt: item.name }],
    categoryId: item.categoryId as Id<"productCategories">,
    category: {
      _id: item.categoryId as Id<"productCategories">,
      name: item.categoryName,
      slug: "",
    },
    active: true,
    sortOrder: 0,
  }));
}
