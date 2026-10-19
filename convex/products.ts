import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
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
import { decodeScanCursor, encodeScanCursor, paginateMatching } from "./lib/indexedScan";
import { readAggregate, adjustCatalogCounts } from "./lib/maintainedAggregates";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";
import { productImageValidator } from "./schema";
import {
  calculateFinalPrice,
  normalizeProductShippingCharges,
  validateProductDiscountPercent,
} from "./lib/pricing";
import { scheduleProductIntelligenceIfNeeded } from "./lib/ai/scheduleProductIntelligence";
import { scheduleImageEmbeddingIfNeeded } from "./lib/ai/scheduleImageEmbedding";
import { scheduleRagProductReindex } from "./lib/rag/schedule";
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
  type PromotionFilterSlug,
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
    v.literal("popular"),
    v.literal("newest"),
    v.literal("lowest"),
    v.literal("highest"),
    v.literal("rating"),
    v.literal("a-z"),
    v.literal("z-a")
  )
);

export type ProductSort =
  | "default"
  | "popular"
  | "newest"
  | "lowest"
  | "highest"
  | "rating"
  | "a-z"
  | "z-a";

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
  currency: v.optional(v.string()),
  /** Scope catalog to these products (e.g. hybrid search result set). Ignores `search`. */
  productIds: v.optional(v.array(v.id("products"))),
  search: v.optional(v.string()),
  categoryId: v.optional(v.id("productCategories")),
  minPrice: v.optional(v.number()),
  maxPrice: v.optional(v.number()),
  brands: v.optional(v.array(v.string())),
  colors: v.optional(v.array(v.string())),
  minRating: v.optional(v.number()),
  promotions: v.optional(v.array(promotionFilterSlugValidator)),
  inStockOnly: v.optional(v.boolean()),
  sort: sortValidator,
  now: v.number(),
};

function scopeProductsByIds<
  T extends { _id: import("./_generated/dataModel").Id<"products"> },
>(products: T[], productIds?: import("./_generated/dataModel").Id<"products">[]) {
  if (productIds === undefined) return products;
  if (productIds.length === 0) return [];
  const allowedIds = new Set(productIds);
  return products.filter((product) => allowedIds.has(product._id));
}

function toCatalogFilterArgs(args: {
  currency?: string;
  productIds?: import("./_generated/dataModel").Id<"products">[];
  search?: string;
  categoryId?: import("./_generated/dataModel").Id<"productCategories">;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  colors?: string[];
  minRating?: number;
  promotions?: PromotionFilterSlug[];
  inStockOnly?: boolean;
  sort?: PublicFilterArgs["sort"];
  now: number;
}) {
  const { productIds: _productIds, search, ...rest } = args;
  return {
    ...rest,
    search: args.productIds !== undefined ? undefined : search,
  };
}

const CATALOG_SCAN_LIMIT = 800;

async function forEachProduct(
  ctx: QueryCtx,
  visit: (product: Doc<"products">) => void,
  limit = CATALOG_SCAN_LIMIT
): Promise<void> {
  let cursor: string | null = null;
  let scanned = 0;
  while (scanned < limit) {
    const batch = await ctx.db.query("products").order("desc").paginate({
      numItems: 50,
      cursor,
    });
    for (const product of batch.page) {
      scanned += 1;
      visit(product);
      if (scanned >= limit) return;
    }
    if (batch.isDone) return;
    cursor = batch.continueCursor;
  }
}

async function loadActivePromotions(ctx: QueryCtx) {
  return await ctx.db
    .query("productPromotions")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .take(100);
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
    _creationTime?: number;
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
    const brandCounts = new Map<string, { name: string; productCount: number }>();
    await forEachProduct(ctx, (product) => {
      if (!isProductActive(product)) return;
      const name = product.company.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = brandCounts.get(key);
      if (existing) existing.productCount += 1;
      else brandCounts.set(key, { name, productCount: 1 });
    });

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
    const products: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) products.push(product);
    }, 150);
    const sorted = products.sort(bySortOrder).slice(0, 100);
    return await enrichProducts(ctx, sorted);
  },
});

/** Min/max price of active catalog (small payload for filter UI). */
export const getPublicPriceBounds = query({
  args: {},
  handler: async (ctx) => {
    const prices: number[] = [];
    await forEachProduct(ctx, (product) => {
      if (!isProductActive(product)) return;
      prices.push(calculateFinalPrice(product.price, product.discountPercent ?? 0));
    });
    if (prices.length === 0) return { minPrice: 0, maxPrice: 0 };
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  },
});

/** Comparable ranges only; mobile never labels PKR amounts as dollars. */
export const getPublicCurrencyPriceBounds = query({
  args: {},
  returns: v.array(v.object({ currency: v.string(), minPrice: v.number(), maxPrice: v.number(), count: v.number() })),
  handler: async (ctx) => {
    const ranges = new Map<string, { currency: string; minPrice: number; maxPrice: number; count: number }>();
    await forEachProduct(ctx, (product) => {
      if (!isProductActive(product)) return;
      const currency = (product.currency ?? "USD").trim().toUpperCase();
      const price = calculateFinalPrice(product.price, product.discountPercent ?? 0);
      const previous = ranges.get(currency);
      ranges.set(currency, { currency, minPrice: Math.min(previous?.minPrice ?? price, price), maxPrice: Math.max(previous?.maxPrice ?? price, price), count: (previous?.count ?? 0) + 1 });
    });
    return [...ranges.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  },
});

/** Total count for current public filters (pagination UI). */
export const countPublicFiltered = query({
  args: publicFilterArgs,
  handler: async (ctx, args) => {
    const products: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) products.push(product);
    });
    const scoped = scopeProductsByIds(products, args.productIds);
    const filtered = await applyPublicFilters(ctx, scoped, toCatalogFilterArgs(args));
    return filtered.length;
  },
});

/** Faceted filter counts for catalog sidebar. */
export const getPublicFilterFacets = query({
  args: {
    currency: v.optional(v.string()),
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
    inStockOnly: v.optional(v.boolean()),
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
    const products: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (!isProductActive(product)) return;
      if (args.productIds !== undefined && !args.productIds.includes(product._id)) return;
      products.push(product);
    });
    const promotions = await loadActivePromotions(ctx);
    const promotionIndex = buildPromotionIndex(products, promotions, args.now);
    const { productIds: _productIds, ...facetArgs } = args;
    const facets = computeFilterFacets(products, promotionIndex, {
      ...facetArgs,
      search: args.productIds !== undefined ? undefined : facetArgs.search,
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
    const promotions = await loadActivePromotions(ctx);
    const { paginationOpts, productIds, ...filterArgs } = args;
    if (productIds !== undefined) {
      const selected: Doc<"products">[] = [];
      for (const productId of productIds.slice(0, 200)) {
        const product = await ctx.db.get(productId);
        if (product && isProductActive(product)) selected.push(product);
      }
      const filtered = await applyPublicFilters(ctx, selected, toCatalogFilterArgs({
        ...filterArgs,
        productIds,
        now: args.now,
      }));
      const start = decodeScanCursor(paginationOpts.cursor).offset;
      const pageSize = Math.min(Math.max(paginationOpts.numItems, 1), 100);
      const page = filtered.slice(start, start + pageSize);
      const next = start + page.length;
      return {
        page: await enrichProducts(ctx, page),
        isDone: next >= filtered.length,
        continueCursor: encodeScanCursor({ cursor: null, offset: next }),
      };
    }

    const sort = args.sort ?? "default";
    const currency = args.currency?.trim().toUpperCase() ??
      ((args.minPrice !== undefined || args.maxPrice !== undefined) ? "USD" : undefined);
    // Use the catalog indexes so sort applies to every page, not just loaded cards.
    // Price sorts group currencies by requiring the mobile picker before comparison.
    const orderedQuery = () => {
      switch (sort) {
        case "lowest": return currency
          ? ctx.db.query("products").withIndex("by_currency_final_price", (q) => q.eq("currency", currency)).order("asc")
          : ctx.db.query("products").withIndex("by_currency_final_price").order("asc");
        case "highest": return currency
          ? ctx.db.query("products").withIndex("by_currency_final_price", (q) => q.eq("currency", currency)).order("desc")
          : ctx.db.query("products").withIndex("by_currency_final_price").order("desc");
        case "rating": return ctx.db.query("products").withIndex("by_stars").order("desc");
        case "popular": return ctx.db.query("products").withIndex("by_reviews").order("desc");
        case "a-z": return ctx.db.query("products").withIndex("by_name").order("asc");
        case "z-a": return ctx.db.query("products").withIndex("by_name").order("desc");
        case "newest": return ctx.db.query("products").order("desc");
        default: return currency
          ? ctx.db.query("products").withIndex("by_currency_sort", (q) => q.eq("currency", currency)).order("asc")
          : ctx.db.query("products").withIndex("by_sort_order").order("asc");
      }
    };
    const result = await paginateMatching(
      (opts) => orderedQuery().paginate(opts),
      paginationOpts,
      (product) => {
        if (!isProductActive(product)) return false;
        const promotionIndex = buildPromotionIndex([product], promotions, args.now);
        return (
          filterCatalogProducts([product], toCatalogFilterArgs(filterArgs), promotionIndex)
            .length === 1
        );
      }
    );
    return {
      page: await enrichProducts(ctx, result.page),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const stored = await readAggregate<{ active?: number; inactive?: number }>(ctx, "catalog", {});
    if ((stored.active ?? 0) + (stored.inactive ?? 0) > 0) {
      return { active: stored.active ?? 0, inactive: stored.inactive ?? 0 };
    }
    let active = 0;
    let inactive = 0;
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) active += 1;
      else inactive += 1;
    });
    return { active, inactive };
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
    const { paginationOpts, ...filters } = args;
    const result = await paginateMatching(
      (opts) => ctx.db.query("products").order("desc").paginate(opts),
      paginationOpts,
      (product) => filterProducts([product], filters).length === 1
    );
    return {
      page: await enrichProducts(ctx, result.page),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
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
    const products: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (product._id !== args.excludeId) products.push(product);
    });
    return products.map((product) => normalizeProductName(product.name));
  },
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(24);
    const activeFeatured = products.filter(isProductActive).sort(bySortOrder).slice(0, 6);
    return await enrichProducts(ctx, activeFeatured);
  },
});

/** Best sellers by paid order volume; falls back to highest-rated products. */
export const bestSellers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 24);
    const topSales = await ctx.db
      .query("productSalesTotals")
      .withIndex("by_units_sold")
      .order("desc")
      .take(limit);
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

    const fallback: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) fallback.push(product);
    }, limit * 4);
    fallback.sort((a, b) => b.reviews - a.reviews || b.stars - a.stars);
    return await enrichProducts(ctx, fallback.slice(0, limit));
  },
});

/** Latest active products by creation time. */
export const newArrivals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 24);
    const products: Doc<"products">[] = [];
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) products.push(product);
    }, limit * 4);
    return await enrichProducts(ctx, products.slice(0, limit));
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
    const matches: Doc<"products">[] = [];
    const seen = new Set<string>();
    const hits = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => q.search("name", term))
      .take(limit);
    for (const product of hits) {
      if (!isProductActive(product) || seen.has(product._id)) continue;
      seen.add(product._id);
      matches.push(product);
    }
    if (matches.length < limit) {
      await forEachProduct(ctx, (product) => {
        if (matches.length >= limit || !isProductActive(product) || seen.has(product._id)) return;
        if (
          product.name.toLowerCase().includes(term) ||
          product.company.toLowerCase().includes(term)
        ) {
          seen.add(product._id);
          matches.push(product);
        }
      }, 200);
    }

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
    let maxSortOrder = -1;
    await forEachProduct(ctx, (product) => {
      if (isProductActive(product)) {
        maxSortOrder = Math.max(maxSortOrder, product.sortOrder ?? -1);
      }
    });
    const nextSortOrder = maxSortOrder + 1;
    const active = args.active ?? true;
    const finalPrice = calculateFinalPrice(args.price, extended.discountPercent ?? 0);
    const productId = await ctx.db.insert("products", {
      ...args,
      discountPercent: extended.discountPercent,
      shippingCharges: extended.shippingCharges,
      warrantyAvailable: extended.warrantyAvailable,
      warrantyDuration: extended.warrantyDuration,
      warrantyType: extended.warrantyType,
      warrantyDetails: extended.warrantyDetails,
      deliveryOptions: extended.deliveryOptions,
      active: active,
      sortOrder: nextSortOrder,
      finalPrice,
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

    await scheduleImageEmbeddingIfNeeded(ctx, productId);
    await scheduleRagProductReindex(ctx, productId);
    await adjustCatalogCounts(ctx, active ? { active: 1 } : { inactive: 1 });

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
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Product not found");
    const category = await ctx.db.get(data.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    await assertUniqueProductName(ctx, data.name, id);
    const extended = normalizeProductExtendedFields(data);
    const nextActive = data.active ?? true;
    await ctx.db.patch(id, {
      ...data,
      discountPercent: extended.discountPercent,
      shippingCharges: extended.shippingCharges,
      warrantyAvailable: extended.warrantyAvailable,
      warrantyDuration: extended.warrantyDuration,
      warrantyType: extended.warrantyType,
      warrantyDetails: extended.warrantyDetails,
      deliveryOptions: extended.deliveryOptions,
      active: nextActive,
      finalPrice: calculateFinalPrice(data.price, extended.discountPercent ?? 0),
    });
    if (isProductActive(existing) !== nextActive) {
      await adjustCatalogCounts(
        ctx,
        nextActive ? { active: 1, inactive: -1 } : { active: -1, inactive: 1 }
      );
    }

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

    await scheduleImageEmbeddingIfNeeded(ctx, id);
    await scheduleRagProductReindex(ctx, id);

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
    if (!isProductActive(product)) return;
    await ctx.db.patch(args.id, { active: false });
    await adjustCatalogCounts(ctx, { active: -1, inactive: 1 });
    await scheduleRagProductReindex(ctx, args.id);
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
    if (isProductActive(product)) return;
    let maxSortOrder = -1;
    await forEachProduct(ctx, (item) => {
      if (isProductActive(item)) {
        maxSortOrder = Math.max(maxSortOrder, item.sortOrder ?? -1);
      }
    });
    await ctx.db.patch(args.id, {
      active: true,
      sortOrder: maxSortOrder + 1,
    });
    await adjustCatalogCounts(ctx, { active: 1, inactive: -1 });
    await scheduleRagProductReindex(ctx, args.id);
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

function mapDiscountedProductPage(page: Doc<"products">[]) {
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
    let categoryId = args.categoryId;
    if (!categoryId && args.categorySlug) {
      const category = await ctx.db
        .query("productCategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      categoryId = category?._id;
    }

    const result = await paginateMatching(
      (opts) => ctx.db.query("products").order("desc").paginate(opts),
      args.paginationOpts,
      (product) =>
        filterDiscountedProducts([product], args.search, {
          categoryId,
          minDiscountPercent: args.minDiscountPercent,
        }).length === 1
    );

    return {
      page: mapDiscountedProductPage(result.page),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
