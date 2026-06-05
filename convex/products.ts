import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { enrichProduct, enrichProducts } from "./lib/products";
import { productImageValidator } from "./schema";

const productFields = {
  name: v.string(),
  company: v.string(),
  price: v.number(),
  colors: v.array(v.string()),
  image: v.array(productImageValidator),
  categoryId: v.id("productCategories"),
  featured: v.boolean(),
  shipping: v.boolean(),
  stock: v.number(),
  reviews: v.number(),
  stars: v.number(),
  description: v.string(),
};

const bySortOrder = (a: { sortOrder?: number | null }, b: { sortOrder?: number | null }) =>
  (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);

/** Public catalog — capped list with category join (max 100). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const sorted = [...products].sort(bySortOrder).slice(0, 100);
    return await enrichProducts(ctx, sorted);
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await ctx.db.query("products").order("desc").paginate(args.paginationOpts);
    let page = result.page;
    if (args.categoryId) {
      page = page.filter((p) => p.categoryId === args.categoryId);
    }
    page = [...page].sort(bySortOrder);
    let enriched = await enrichProducts(ctx, page);
    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      enriched = enriched.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.company.toLowerCase().includes(term) ||
          p.category?.name.toLowerCase().includes(term)
      );
    }
    return { ...result, page: enriched };
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;
    return await enrichProduct(ctx, product);
  },
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(6);
    return await enrichProducts(ctx, products);
  },
});

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    const all = await ctx.db.query("products").collect();
    const maxSortOrder = all.reduce(
      (max, product) => Math.max(max, product.sortOrder ?? -1),
      -1
    );
    const nextSortOrder = maxSortOrder + 1;
    return await ctx.db.insert("products", { ...args, sortOrder: nextSortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    ...productFields,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    const category = await ctx.db.get(data.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    await ctx.db.patch(id, data);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const unique = Array.from(new Set(args.orderedIds));
    for (let i = 0; i < unique.length; i += 1) {
      await ctx.db.patch(unique[i], { sortOrder: i });
    }
  },
});
