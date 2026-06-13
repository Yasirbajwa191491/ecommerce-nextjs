import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { slugify } from "./lib/products";
import { isProductActive } from "./lib/productActive";

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

async function findCategoryWithName(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"productCategories">
) {
  const key = normalizeCategoryName(name);
  if (!key) return null;
  const categories = await ctx.db.query("productCategories").collect();
  return (
    categories.find(
      (c) => normalizeCategoryName(c.name) === key && c._id !== excludeId
    ) ?? null
  );
}

async function assertUniqueCategoryName(
  ctx: MutationCtx,
  name: string,
  excludeId?: Id<"productCategories">
) {
  const existing = await findCategoryWithName(ctx, name, excludeId);
  if (existing) {
    throw new ConvexError("A category with this name already exists");
  }
}

const categoryFields = {
  name: v.string(),
  description: v.string(),
  slug: v.string(),
  active: v.boolean(),
};

function filterCategoriesBySearch<
  T extends { name: string; slug: string },
>(items: T[], search?: string) {
  if (!search?.trim()) return items;
  const term = search.trim().toLowerCase();
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term)
  );
}

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

/** Active categories with live product counts for homepage showcase. */
export const listWithProductCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    const sortedCategories = categories.sort((a, b) => a.sortOrder - b.sortOrder);
    const results = await Promise.all(
      sortedCategories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_category_id", (q) => q.eq("categoryId", category._id))
          .collect();
        const activeProducts = products.filter(isProductActive);
        const sampleImageUrl = activeProducts[0]?.image[0]?.url ?? null;

        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          productCount: activeProducts.length,
          sampleImageUrl,
        };
      })
    );

    return results.filter((category) => category.productCount > 0);
  },
});

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const categories = await ctx.db.query("productCategories").collect();
    return {
      active: categories.filter((c) => c.active).length,
      inactive: categories.filter((c) => !c.active).length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    active: v.boolean(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", args.active))
      .collect();
    const sorted = categories.sort((a, b) => a.sortOrder - b.sortOrder);
    const filtered = filterCategoriesBySearch(sorted, args.search);
    const { page, isDone, continueCursor } = paginateArray(
      filtered,
      args.paginationOpts
    );
    return { page, isDone, continueCursor };
  },
});

export const listTakenNames = query({
  args: { excludeId: v.optional(v.id("productCategories")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const categories = await ctx.db.query("productCategories").collect();
    return categories
      .filter((c) => c._id !== args.excludeId)
      .map((c) => normalizeCategoryName(c.name));
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
    await assertUniqueCategoryName(ctx, args.name);
    const activeCategories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const nextSortOrder =
      activeCategories.reduce(
        (max, category) => Math.max(max, category.sortOrder),
        -1
      ) + 1;
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
    await assertUniqueCategoryName(ctx, data.name, id);
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
    for (const id of unique) {
      const category = await ctx.db.get(id);
      if (!category) {
        throw new ConvexError("Category not found");
      }
      if (!category.active) {
        throw new ConvexError("Only active categories can be reordered");
      }
    }
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
