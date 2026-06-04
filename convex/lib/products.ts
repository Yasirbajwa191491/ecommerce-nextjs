import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type ProductWithCategory = Doc<"products"> & {
  category: {
    _id: Id<"productCategories">;
    name: string;
    slug: string;
  } | null;
};

export async function enrichProduct(
  ctx: QueryCtx,
  product: Doc<"products">
): Promise<ProductWithCategory> {
  const category = await ctx.db.get(product.categoryId);
  return {
    ...product,
    category: category
      ? { _id: category._id, name: category.name, slug: category.slug }
      : null,
  };
}

export async function enrichProducts(
  ctx: QueryCtx,
  products: Doc<"products">[]
): Promise<ProductWithCategory[]> {
  return Promise.all(products.map((p) => enrichProduct(ctx, p)));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
