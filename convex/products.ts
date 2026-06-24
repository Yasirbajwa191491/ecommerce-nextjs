import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserOrNull, requireAdmin } from "./lib/requireAdmin";
import { isAdminRole, normalizeRole } from "./lib/authRoles";
import {
  assertUniqueProductName,
  enrichProduct,
  enrichProducts,
  normalizeProductName,
  slugify,
} from "./lib/products";
import { getPrimaryImageUrl } from "./lib/productImages";
import { isProductActive } from "./lib/productActive";
import { paginateArray } from "./lib/pagination";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";
import { aggregateTopProducts } from "./lib/dashboardAggregates";
import { productImageValidator } from "./schema";
import {
  calculateFinalPrice,
  normalizeProductShippingCharges,
  validateProductDiscountPercent,
} from "./lib/pricing";
import { scheduleProductIntelligenceIfNeeded } from "./lib/ai/scheduleProductIntelligence";
import {
  deliveryOptionValidator,
  getDefaultDeliveryOptions,
  normalizeDeliveryOptions,
  type DeliveryOption,
  type WarrantyDuration,
  type WarrantyType,
  warrantyDurationValidator,
  warrantyTypeValidator,
} from "./lib/productValidators";
import {
  buildPromotionIndex,
  computeFilterFacets,
  filterCatalogProducts,
  promotionFilterSlugValidator,
  sortCatalogProducts,
  type PublicFilterArgs,
} from "./lib/catalogFilters";
import { COLOR_FAMILY_HEX } from "./lib/colorFamilies";

const productFields = {
  name: v.string(),
  company: v.string(),
  price: v.number(),
  currency: v.string(),
  sku: v.optional(v.string()),
  colors: v.array(v.string()),
  image: v.array(productImageValidator),
  primaryImageIndex: v.optional(v.number()),
  categoryId: v.id("productCategories"),
  featured: v.boolean(),
  shipping: v.boolean(),
  discountPercent: v.optional(v.number()),
  shippingCharges: v.optional(v.number()),
  stock: v.number(),
  description: v.string(),
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
  seoKeywords: v.optional(v.array(v.string())),
  highlights: v.optional(v.array(v.string())),
  active: v.optional(v.boolean()),
  warrantyAvailable: v.optional(v.boolean()),
  warrantyDuration: v.optional(warrantyDurationValidator),
  warrantyType: v.optional(warrantyTypeValidator),
  warrantyDetails: v.optional(v.string()),
  deliveryOptions: v.optional(v.array(deliveryOptionValidator)),
};

function normalizeProductPricingFields(args: {
  shipping: boolean;
  discountPercent?: number;
  shippingCharges?: number;
}) {
  const discountPercent = validateProductDiscountPercent(args.discountPercent);
  const shippingCharges = normalizeProductShippingCharges(
    args.shipping,
    args.shippingCharges
  );
  return { discountPercent, shippingCharges };
}

function normalizeProductExtendedFields(args: {
  shipping: boolean;
  discountPercent?: number;
  shippingCharges?: number;
  warrantyAvailable?: boolean;
  warrantyDuration?: WarrantyDuration;
  warrantyType?: WarrantyType;
  warrantyDetails?: string;
  deliveryOptions?: DeliveryOption[];
}) {
  const pricing = normalizeProductPricingFields(args);
  const deliveryOptions = normalizeDeliveryOptions(args.deliveryOptions);
  const warrantyAvailable = args.warrantyAvailable === true;

  return {
    ...pricing,
    warrantyAvailable,
    warrantyDuration: warrantyAvailable ? args.warrantyDuration : undefined,
    warrantyType: warrantyAvailable ? args.warrantyType : undefined,
    warrantyDetails:
      warrantyAvailable && args.warrantyDetails?.trim()
        ? args.warrantyDetails.trim()
        : undefined,
    deliveryOptions,
  };
}

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
  brands: v.optional(v.array(v.string())),
  colors: v.optional(v.array(v.string())),
  minRating: v.optional(v.number()),
  promotions: v.optional(v.array(promotionFilterSlugValidator)),
  sort: sortValidator,
  now: v.number(),
};

async function loadActiveProducts(ctx: QueryCtx) {
  const products = await ctx.db.query("products").collect();
  return products.filter(isProductActive);
}

async function loadActivePromotions(ctx: QueryCtx) {
  return await ctx.db
    .query("productPromotions")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect();
}

async function applyPublicFilters<
  T extends {
    _id: import("./_generated/dataModel").Id<"products">;
    name: string;
    company: string;
    price: number;
    discountPercent?: number | null;
    colors: string[];
    stock: number;
    stars: number;
    reviews: number;
    categoryId: import("./_generated/dataModel").Id<"productCategories">;
    active?: boolean | null;
    sortOrder?: number | null;
  },
>(ctx: QueryCtx, products: T[], args: PublicFilterArgs & { now: number }) {
  const promotions = await loadActivePromotions(ctx);
  const promotionIndex = buildPromotionIndex(products, promotions, args.now);
  const filtered = filterCatalogProducts(products, args, promotionIndex);
  return sortCatalogProducts(filtered, args.sort ?? "default");
}

async function isRequestAdmin(ctx: Parameters<typeof getAuthUserOrNull>[0]) {
  const user = await getAuthUserOrNull(ctx);
  if (!user || user.banned) return false;
  return isAdminRole(normalizeRole(user.role));
}

/** Distinct brand names from active products (company field), ranked by catalog size. */
export const listBrands = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      name: v.string(),
      slug: v.string(),
      productCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 24);
    const products = await loadActiveProducts(ctx);
    const brandCounts = new Map<string, { name: string; productCount: number }>();

    for (const product of products) {
      const name = product.company.trim();
      if (!name) continue;

      const key = name.toLowerCase();
      const existing = brandCounts.get(key);
      if (existing) {
        existing.productCount += 1;
      } else {
        brandCounts.set(key, { name, productCount: 1 });
      }
    }

    return Array.from(brandCounts.values())
      .sort(
        (a, b) =>
          b.productCount - a.productCount || a.name.localeCompare(b.name)
      )
      .slice(0, limit)
      .map((brand) => ({
        name: brand.name,
        slug: slugify(brand.name),
        productCount: brand.productCount,
      }));
  },
});

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
    const filtered = await applyPublicFilters(ctx, products, args);
    return filtered.length;
  },
});

/** Faceted filter counts for catalog sidebar. */
export const getPublicFilterFacets = query({
  args: {
    search: v.optional(v.string()),
    /** Scope facets to these products (e.g. hybrid search result set). Ignores `search`. */
    productIds: v.optional(v.array(v.id("products"))),
    categoryId: v.optional(v.id("productCategories")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    brands: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    minRating: v.optional(v.number()),
    promotions: v.optional(v.array(promotionFilterSlugValidator)),
    now: v.number(),
  },
  returns: v.object({
    brands: v.array(
      v.object({ name: v.string(), slug: v.string(), count: v.number() })
    ),
    colorFamilies: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        hex: v.optional(v.string()),
        count: v.number(),
      })
    ),
    promotions: v.array(
      v.object({
        slug: promotionFilterSlugValidator,
        label: v.string(),
        count: v.number(),
      })
    ),
    ratingBuckets: v.array(
      v.object({
        minRating: v.number(),
        label: v.string(),
        count: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    let products = await loadActiveProducts(ctx);
    if (args.productIds?.length) {
      const allowedIds = new Set(args.productIds);
      products = products.filter((product) => allowedIds.has(product._id));
    }
    const promotions = await loadActivePromotions(ctx);
    const promotionIndex = buildPromotionIndex(products, promotions, args.now);
    const { productIds: _productIds, ...facetArgs } = args;
    const facets = computeFilterFacets(products, promotionIndex, {
      ...facetArgs,
      search: args.productIds?.length ? undefined : facetArgs.search,
    });
    return {
      ...facets,
      colorFamilies: facets.colorFamilies.map((color) => ({
        ...color,
        hex: COLOR_FAMILY_HEX[color.name],
      })),
    };
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
    const filtered = await applyPublicFilters(ctx, products, args);
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

/** Public batch fetch preserving caller order (for hybrid search / similar products). */
export const listByIds = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const byId = new Map<
      string,
      Awaited<ReturnType<typeof enrichProduct>>
    >();
    for (const id of args.ids) {
      const product = await ctx.db.get(id);
      if (product && isProductActive(product)) {
        byId.set(id, await enrichProduct(ctx, product));
      }
    }
    return args.ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
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

/** Best sellers by paid order volume; falls back to highest-rated products. */
export const bestSellers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 24);
    const orders = await ctx.db.query("orders").collect();
    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    const topSales = await aggregateTopProducts(ctx, paidOrders, limit);

    if (topSales.length > 0) {
      const products = await Promise.all(
        topSales.map(async (entry) => {
          const product = await ctx.db.get(entry.productId);
          if (!product || !isProductActive(product)) return null;
          return product;
        })
      );
      const active = products.filter(
        (product): product is NonNullable<typeof product> => product !== null
      );
      if (active.length > 0) {
        return await enrichProducts(ctx, active);
      }
    }

    const fallback = (await loadActiveProducts(ctx))
      .sort((a, b) => b.reviews - a.reviews || b.stars - a.stars)
      .slice(0, limit);
    return await enrichProducts(ctx, fallback);
  },
});

/** Latest active products by creation time. */
export const newArrivals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 24);
    const products = (await loadActiveProducts(ctx))
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit);
    return await enrichProducts(ctx, products);
  },
});

/** Lightweight product search suggestions for header autocomplete. */
export const searchSuggestions = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.query.trim().toLowerCase();
    if (term.length < 2) return [];

    const limit = Math.min(Math.max(args.limit ?? 6, 1), 10);
    const products = await loadActiveProducts(ctx);
    const matches = products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.company.toLowerCase().includes(term)
      )
      .slice(0, limit);

    const enriched = await enrichProducts(ctx, matches);
    return enriched.map((product) => ({
      _id: product._id,
      name: product.name,
      company: product.company,
      imageUrl: getPrimaryImageUrl(product),
      price: product.price,
      discountPercent: product.discountPercent ?? 0,
      currency: product.currency ?? "USD",
      categoryName: product.category?.name ?? "Product",
    }));
  },
});

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    await assertUniqueProductName(ctx, args.name);
    const extended = normalizeProductExtendedFields(args);
    const activeProducts = await ctx.db.query("products").collect();
    const maxSortOrder = activeProducts
      .filter(isProductActive)
      .reduce((max, product) => Math.max(max, product.sortOrder ?? -1), -1);
    const nextSortOrder = maxSortOrder + 1;
    const productId = await ctx.db.insert("products", {
      ...args,
      discountPercent: extended.discountPercent,
      shippingCharges: extended.shippingCharges,
      warrantyAvailable: extended.warrantyAvailable,
      warrantyDuration: extended.warrantyDuration,
      warrantyType: extended.warrantyType,
      warrantyDetails: extended.warrantyDetails,
      deliveryOptions: extended.deliveryOptions,
      active: args.active ?? true,
      sortOrder: nextSortOrder,
      stars: 0,
      reviews: 0,
    });

    const now = Date.now();
    await insertAdminActivityLog(ctx, {
      type: "product_created",
      title: "Product created",
      description: `${args.name} was added to the catalog`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name || admin.email,
      relatedProductId: productId,
      createdAt: now,
    });

    await scheduleProductIntelligenceIfNeeded(ctx, productId, {
      name: args.name,
      company: args.company,
      description: args.description,
      categoryId: args.categoryId,
      price: args.price,
    });

    return productId;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    ...productFields,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const { id, ...data } = args;
    const category = await ctx.db.get(data.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    await assertUniqueProductName(ctx, data.name, id);
    const extended = normalizeProductExtendedFields(data);
    await ctx.db.patch(id, {
      ...data,
      discountPercent: extended.discountPercent,
      shippingCharges: extended.shippingCharges,
      warrantyAvailable: extended.warrantyAvailable,
      warrantyDuration: extended.warrantyDuration,
      warrantyType: extended.warrantyType,
      warrantyDetails: extended.warrantyDetails,
      deliveryOptions: extended.deliveryOptions,
      active: data.active ?? true,
    });

    const now = Date.now();
    await insertAdminActivityLog(ctx, {
      type: "product_updated",
      title: "Product updated",
      description: `${data.name} was updated`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name || admin.email,
      relatedProductId: id,
      createdAt: now,
    });

    await scheduleProductIntelligenceIfNeeded(ctx, id, {
      name: data.name,
      company: data.company,
      description: data.description,
      categoryId: data.categoryId,
      price: data.price,
    });

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

function filterDiscountedProducts<
  T extends { name: string; discountPercent?: number; categoryId?: string },
>(
  products: T[],
  search?: string,
  options?: {
    categoryId?: string;
    minDiscountPercent?: number;
  }
) {
  let discounted = products.filter((p) => (p.discountPercent ?? 0) > 0);

  if (options?.minDiscountPercent !== undefined) {
    discounted = discounted.filter(
      (p) => (p.discountPercent ?? 0) >= options.minDiscountPercent!
    );
  }

  if (options?.categoryId) {
    discounted = discounted.filter((p) => p.categoryId === options.categoryId);
  }

  if (!search?.trim()) return discounted;
  const term = search.trim().toLowerCase();
  return discounted.filter((p) => p.name.toLowerCase().includes(term));
}

function mapDiscountedProductPage(
  page: Awaited<ReturnType<typeof loadActiveProducts>>
) {
  return page.map((p) => {
    const discountPercent = p.discountPercent ?? 0;
    const discountedPrice = calculateFinalPrice(p.price, discountPercent);
    return {
      _id: p._id,
      name: p.name,
      imageUrl: getPrimaryImageUrl(p),
      price: p.price,
      discountedPrice,
      discountPercent,
      currency: p.currency ?? "USD",
    };
  });
}

/** Admin: fetch discounted product summaries by IDs (for AI product selection). */
export const getPromoProductsByIds = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const products = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return products
      .filter((p): p is NonNullable<typeof p> => p !== null && isProductActive(p))
      .map((p) => {
        const discountPercent = p.discountPercent ?? 0;
        return {
          _id: p._id,
          name: p.name,
          imageUrl: getPrimaryImageUrl(p),
          price: p.price,
          discountedPrice: calculateFinalPrice(p.price, discountPercent),
          discountPercent,
          currency: p.currency ?? "USD",
        };
      });
  },
});

/** Admin: discounted products for email campaign product picker. */
export const listDiscountedPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    categorySlug: v.optional(v.string()),
    minDiscountPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const products = await loadActiveProducts(ctx);

    let categoryId = args.categoryId;
    if (!categoryId && args.categorySlug) {
      const category = await ctx.db
        .query("productCategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      categoryId = category?._id;
    }

    const filtered = filterDiscountedProducts(products, args.search, {
      categoryId,
      minDiscountPercent: args.minDiscountPercent,
    });
    const sorted = filtered.sort(bySortOrder);

    const { page, isDone, continueCursor } = paginateArray(
      sorted,
      args.paginationOpts
    );

    return {
      page: mapDiscountedProductPage(page),
      isDone,
      continueCursor,
    };
  },
});
