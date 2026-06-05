import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { slugify } from "./lib/products";

const categoryFields = {
  name: v.string(),
  description: v.string(),
  slug: v.string(),
  active: v.boolean(),
};

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("productCategories")
      .withIndex("by_sort_order")
      .paginate(args.paginationOpts);

    if (!args.search?.trim()) {
      return result;
    }

    const term = args.search.trim().toLowerCase();
    return {
      ...result,
      page: result.page.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.slug.toLowerCase().includes(term)
      ),
    };
  },
});

export const getById = query({
  args: { id: v.id("productCategories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: categoryFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug || slugify(args.name);
    const existing = await ctx.db
      .query("productCategories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      throw new ConvexError("A category with this slug already exists");
    }
    const last = await ctx.db
      .query("productCategories")
      .withIndex("by_sort_order")
      .order("desc")
      .first();
    const nextSortOrder = (last?.sortOrder ?? -1) + 1;
    return await ctx.db.insert("productCategories", {
      ...args,
      slug,
      active: args.active ?? true,
      sortOrder: nextSortOrder,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("productCategories"),
    ...categoryFields,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    const slug = data.slug || slugify(data.name);
    const existing = await ctx.db
      .query("productCategories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing && existing._id !== id) {
      throw new ConvexError("A category with this slug already exists");
    }
    await ctx.db.patch(id, { ...data, slug });
    return id;
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("productCategories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const unique = Array.from(new Set(args.orderedIds));
    for (let i = 0; i < unique.length; i += 1) {
      await ctx.db.patch(unique[i], { sortOrder: i });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("productCategories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const used = await ctx.db
      .query("products")
      .withIndex("by_category_id", (q) => q.eq("categoryId", args.id))
      .first();
    if (used) {
      throw new ConvexError("Cannot delete a category that has products");
    }
    await ctx.db.delete(args.id);
  },
});
