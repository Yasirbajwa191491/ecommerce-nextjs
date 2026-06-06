import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserOrNull, requireAdmin } from "./lib/requireAdmin";
import { isAdminRole, normalizeRole } from "./lib/authRoles";
import {
  assertUniqueProductName,
  enrichProduct,
  enrichProducts,
  normalizeProductName,
} from "./lib/products";
import { isProductActive } from "./lib/productActive";
import { paginateArray } from "./lib/pagination";
import { productImageValidator } from "./schema";

const productFields = {
  name: v.string(),
  company: v.string(),
  price: v.number(),
  currency: v.string(),
  sku: v.optional(v.string()),
  colors: v.array(v.string()),
  image: v.array(productImageValidator),
  categoryId: v.id("productCategories"),
  featured: v.boolean(),
  shipping: v.boolean(),
  stock: v.number(),
  reviews: v.number(),
  stars: v.number(),
  description: v.string(),
  active: v.optional(v.boolean()),
};

const bySortOrder = (
  a: { sortOrder?: number | null },
  b: { sortOrder?: number | null }
) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);

function matchesActiveFilter(product: { active?: boolean | null }, active: boolean) {
  return isProductActive(product) === active;
}

const sortValidator = v.optional(
  v.union(
    v.literal("default"),
    v.literal("lowest"),
    v.literal("highest"),
    v.literal("a-z"),
    v.literal("z-a")
  )
);

export type ProductSort = "default" | "lowest" | "highest" | "a-z" | "z-a";

function sortProducts<
  T extends { name: string; price: number; sortOrder?: number | null },
>(products: T[], sort: ProductSort = "default") {
  const sorted = [...products];
  switch (sort) {
    case "highest":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "a-z":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "z-a":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "lowest":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "default":
    default:
      sorted.sort(bySortOrder);
      break;
  }
  return sorted;
}

function filterProducts<
  T extends {
    name: string;
    company: string;
    price: number;
    stock: number;
    stars: number;
    categoryId: string;
    active?: boolean | null;
    sortOrder?: number | null;
  },
>(
  products: T[],
  args: {
    active: boolean;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    minStars?: number;
  }
) {
  let filtered = products.filter((p) => matchesActiveFilter(p, args.active));

  if (args.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === args.categoryId);
  }

  if (args.search?.trim()) {
    const term = args.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term)
    );
  }

  if (args.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= args.minPrice!);
  }
  if (args.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= args.maxPrice!);
  }
  if (args.minStock !== undefined) {
    filtered = filtered.filter((p) => p.stock >= args.minStock!);
  }
  if (args.maxStock !== undefined) {
    filtered = filtered.filter((p) => p.stock <= args.maxStock!);
  }
  if (args.minStars !== undefined) {
    filtered = filtered.filter((p) => p.stars >= args.minStars!);
  }

  return filtered;
}

const publicFilterArgs = {
  search: v.optional(v.string()),
  categoryId: v.optional(v.id("productCategories")),
  minPrice: v.optional(v.number()),
  maxPrice: v.optional(v.number()),
  sort: sortValidator,
};

async function loadActiveProducts(ctx: QueryCtx) {
  const products = await ctx.db.query("products").collect();
  return products.filter(isProductActive);
}

function applyPublicFilters<
  T extends {
    name: string;
    company: string;
    price: number;
    stock: number;
    stars: number;
    categoryId: string;
    active?: boolean | null;
    sortOrder?: number | null;
  },
>(
  products: T[],
  args: {
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: ProductSort;
  }
) {
  const filtered = filterProducts(products, {
    active: true,
    search: args.search,
    categoryId: args.categoryId,
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
  });
  return sortProducts(filtered, args.sort ?? "default");
}

async function isRequestAdmin(ctx: Parameters<typeof getAuthUserOrNull>[0]) {
  const user = await getAuthUserOrNull(ctx);
  if (!user || user.banned) return false;
  return isAdminRole(normalizeRole(user.role));
}

/** Public catalog — capped list with category join (max 100). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await loadActiveProducts(ctx);
    const sorted = products.sort(bySortOrder).slice(0, 100);
    return await enrichProducts(ctx, sorted);
  },
});

/** Min/max price of active catalog (small payload for filter UI). */
export const getPublicPriceBounds = query({
  args: {},
  handler: async (ctx) => {
    const products = await loadActiveProducts(ctx);
    if (products.length === 0) {
      return { minPrice: 0, maxPrice: 0 };
    }
    const prices = products.map((p) => p.price);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  },
});

/** Total count for current public filters (pagination UI). */
export const countPublicFiltered = query({
  args: publicFilterArgs,
  handler: async (ctx, args) => {
    const products = await loadActiveProducts(ctx);
    return applyPublicFilters(products, args).length;
  },
});

/** Paginated public catalog — filters/sorts server-side, returns one page only. */
export const listPublicPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ...publicFilterArgs,
  },
  handler: async (ctx, args) => {
    const products = await loadActiveProducts(ctx);
    const filtered = applyPublicFilters(products, args);
    const { page, isDone, continueCursor } = paginateArray(
      filtered,
      args.paginationOpts
    );
    const enriched = await enrichProducts(ctx, page);
    return { page: enriched, isDone, continueCursor };
  },
});

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    return {
      active: products.filter((p) => isProductActive(p)).length,
      inactive: products.filter((p) => !isProductActive(p)).length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    active: v.boolean(),
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minStock: v.optional(v.number()),
    maxStock: v.optional(v.number()),
    minStars: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    const filtered = filterProducts(products, args).sort(bySortOrder);
    const { page, isDone, continueCursor } = paginateArray(
      filtered,
      args.paginationOpts
    );
    const enriched = await enrichProducts(ctx, page);
    return { page: enriched, isDone, continueCursor };
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;
    const admin = await isRequestAdmin(ctx);
    if (!admin && !isProductActive(product)) return null;
    return await enrichProduct(ctx, product);
  },
});

export const listTakenNames = query({
  args: { excludeId: v.optional(v.id("products")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    return products
      .filter((p) => p._id !== args.excludeId)
      .map((p) => normalizeProductName(p.name));
  },
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    const activeFeatured = products.filter(isProductActive).sort(bySortOrder).slice(0, 6);
    return await enrichProducts(ctx, activeFeatured);
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
    await assertUniqueProductName(ctx, args.name);
    const activeProducts = await ctx.db.query("products").collect();
    const maxSortOrder = activeProducts
      .filter(isProductActive)
      .reduce((max, product) => Math.max(max, product.sortOrder ?? -1), -1);
    const nextSortOrder = maxSortOrder + 1;
    return await ctx.db.insert("products", {
      ...args,
      active: args.active ?? true,
      sortOrder: nextSortOrder,
    });
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
    await assertUniqueProductName(ctx, data.name, id);
    await ctx.db.patch(id, { ...data, active: data.active ?? true });
    return id;
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveImageUrlFromStorage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError("Uploaded image could not be processed");
    }
    return { url };
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new ConvexError("Product not found");
    }
    await ctx.db.patch(args.id, { active: false });
  },
});

export const restore = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new ConvexError("Product not found");
    }
    const activeProducts = await ctx.db.query("products").collect();
    const maxSortOrder = activeProducts
      .filter(isProductActive)
      .reduce((max, p) => Math.max(max, p.sortOrder ?? -1), -1);
    await ctx.db.patch(args.id, {
      active: true,
      sortOrder: maxSortOrder + 1,
    });
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const unique = Array.from(new Set(args.orderedIds));
    for (const id of unique) {
      const product = await ctx.db.get(id);
      if (!product) {
        throw new ConvexError("Product not found");
      }
      if (!isProductActive(product)) {
        throw new ConvexError("Only active products can be reordered");
      }
    }
    for (let i = 0; i < unique.length; i += 1) {
      await ctx.db.patch(unique[i], { sortOrder: i });
    }
  },
});
