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

/** Public catalog — capped list with category join (max 100). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("desc").take(100);
    return await enrichProducts(ctx, products);
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
    const baseQuery = args.categoryId
      ? ctx.db
          .query("products")
          .withIndex("by_category_id", (iq) =>
            iq.eq("categoryId", args.categoryId!)
          )
      : ctx.db.query("products");
    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    let page = await enrichProducts(ctx, result.page);
    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      page = page.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.company.toLowerCase().includes(term) ||
          p.category?.name.toLowerCase().includes(term)
      );
    }
    return { ...result, page };
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
    return await ctx.db.insert("products", args);
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
