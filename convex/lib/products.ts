import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

export async function findProductWithName(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"products">
) {
  const key = normalizeProductName(name);
  if (!key) return null;
  const products = await ctx.db.query("products").collect();
  return (
    products.find(
      (p) => normalizeProductName(p.name) === key && p._id !== excludeId
    ) ?? null
  );
}

export async function assertUniqueProductName(
  ctx: MutationCtx,
  name: string,
  excludeId?: Id<"products">
) {
  const existing = await findProductWithName(ctx, name, excludeId);
  if (existing) {
    throw new ConvexError("A product with this name already exists");
  }
}

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
