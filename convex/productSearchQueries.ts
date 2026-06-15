import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { isProductActive } from "./lib/productActive";
import { enrichProducts } from "./lib/products";
import { calculateFinalPrice } from "./lib/pricing";
import { productImageValidator } from "./schema";
import type { Id } from "./_generated/dataModel";

const EMBEDDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const searchProductCandidateValidator = v.object({
  _id: v.id("products"),
  name: v.string(),
  company: v.string(),
  price: v.number(),
  discountPercent: v.number(),
  currency: v.string(),
  stars: v.number(),
  reviews: v.number(),
  featured: v.boolean(),
  categoryId: v.id("productCategories"),
  categoryName: v.string(),
  keywords: v.array(v.string()),
  popularityScore: v.number(),
  imageUrl: v.string(),
});

export const getCachedQueryEmbedding = internalQuery({
  args: { queryNormalized: v.string() },
  returns: v.union(v.array(v.float64()), v.null()),
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("searchEmbeddingCache")
      .withIndex("by_query_normalized", (q) =>
        q.eq("queryNormalized", args.queryNormalized)
      )
      .unique();

    if (!cached) return null;
    if (Date.now() - cached.createdAt > EMBEDDING_CACHE_TTL_MS) {
      return null;
    }
    return cached.embedding;
  },
});

export const setCachedQueryEmbedding = internalMutation({
  args: {
    queryNormalized: v.string(),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("searchEmbeddingCache")
      .withIndex("by_query_normalized", (q) =>
        q.eq("queryNormalized", args.queryNormalized)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("searchEmbeddingCache", {
        queryNormalized: args.queryNormalized,
        embedding: args.embedding,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const logSearchEvent = internalMutation({
  args: {
    queryNormalized: v.string(),
    queryDisplay: v.string(),
    resultCount: v.number(),
    sessionId: v.optional(v.string()),
    source: v.union(v.literal("header"), v.literal("catalog")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("searchQueryEvents", {
      queryNormalized: args.queryNormalized,
      queryDisplay: args.queryDisplay,
      searchedAt: Date.now(),
      resultCount: args.resultCount,
      sessionId: args.sessionId,
      source: args.source,
    });
    return null;
  },
});

export const getActiveCategories = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      slug: v.string(),
    })
  ),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return categories.map((c) => ({ name: c.name, slug: c.slug }));
  },
});

export const getSearchCandidates = internalQuery({
  args: {},
  returns: v.object({
    candidates: v.array(searchProductCandidateValidator),
    maxReviews: v.number(),
  }),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const active = products.filter(isProductActive);

    let maxReviews = 0;
    for (const product of active) {
      maxReviews = Math.max(maxReviews, product.reviews);
    }

    const candidates: Array<{
      _id: Id<"products">;
      name: string;
      company: string;
      price: number;
      discountPercent: number;
      currency: string;
      stars: number;
      reviews: number;
      featured: boolean;
      categoryId: Id<"productCategories">;
      categoryName: string;
      keywords: string[];
      popularityScore: number;
      imageUrl: string;
    }> = [];

    for (const product of active) {
      const category = await ctx.db.get(product.categoryId);
      const intelligence = await ctx.db
        .query("productIntelligence")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .unique();

      const popularityScore =
        (product.featured ? 0.5 : 0) +
        Math.min(0.5, product.reviews / Math.max(maxReviews, 1));

      candidates.push({
        _id: product._id,
        name: product.name,
        company: product.company,
        price: product.price,
        discountPercent: product.discountPercent ?? 0,
        currency: product.currency ?? "USD",
        stars: product.stars,
        reviews: product.reviews,
        featured: product.featured,
        categoryId: product.categoryId,
        categoryName: category?.name ?? "Product",
        keywords: intelligence?.keywords ?? [],
        popularityScore,
        imageUrl: product.image[0]?.url ?? "",
      });
    }

    return { candidates, maxReviews };
  },
});

export const getProductEmbedding = internalQuery({
  args: { productId: v.id("products") },
  returns: v.union(v.array(v.float64()), v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product?.embedding?.length) return null;
    return product.embedding;
  },
});

export const enrichProductsByIds = internalQuery({
  args: { productIds: v.array(v.id("products")) },
  returns: v.array(
    v.object({
      _id: v.id("products"),
      name: v.string(),
      company: v.string(),
      imageUrl: v.string(),
      price: v.number(),
      discountPercent: v.number(),
      currency: v.string(),
      categoryId: v.id("productCategories"),
      categoryName: v.string(),
      stars: v.number(),
      reviews: v.number(),
      featured: v.boolean(),
      finalPrice: v.number(),
      stock: v.number(),
      shipping: v.boolean(),
      description: v.string(),
      images: v.array(productImageValidator),
    })
  ),
  handler: async (ctx, args) => {
    const products = [];
    for (const id of args.productIds) {
      const product = await ctx.db.get(id);
      if (product && isProductActive(product)) {
        products.push(product);
      }
    }
    const enriched = await enrichProducts(ctx, products);
    return enriched.map((product) => ({
      _id: product._id,
      name: product.name,
      company: product.company,
      imageUrl: product.image[0]?.url ?? "",
      price: product.price,
      discountPercent: product.discountPercent ?? 0,
      currency: product.currency ?? "USD",
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? "Product",
      stars: product.stars,
      reviews: product.reviews,
      featured: product.featured,
      finalPrice: calculateFinalPrice(
        product.price,
        product.discountPercent ?? 0
      ),
      stock: product.stock,
      shipping: product.shipping,
      description: product.description,
      images: product.image,
    }));
  },
});

export const getTrendingSearches = query({
  args: {
    period: v.optional(
      v.union(v.literal("today"), v.literal("7d"), v.literal("30d"))
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      query: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const period = args.period ?? "7d";
    const limit = Math.min(args.limit ?? 8, 20);
    const now = Date.now();
    const periodMs =
      period === "today"
        ? 24 * 60 * 60 * 1000
        : period === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
    const since = now - periodMs;

    const events = await ctx.db
      .query("searchQueryEvents")
      .withIndex("by_searched_at", (q) => q.gte("searchedAt", since))
      .collect();

    const counts = new Map<string, { display: string; count: number }>();
    for (const event of events) {
      const existing = counts.get(event.queryNormalized);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(event.queryNormalized, {
          display: event.queryDisplay,
          count: 1,
        });
      }
    }

    return [...counts.entries()]
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([, data]) => ({ query: data.display, count: data.count }));
  },
});

export const getSearchSuggestions = query({
  args: {},
  returns: v.array(
    v.object({
      label: v.string(),
      query: v.string(),
      type: v.union(
        v.literal("trending"),
        v.literal("curated"),
        v.literal("category")
      ),
    })
  ),
  handler: async (ctx) => {
    const suggestions: Array<{
      label: string;
      query: string;
      type: "trending" | "curated" | "category";
    }> = [];

    const now = Date.now();
    const since = now - 7 * 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("searchQueryEvents")
      .withIndex("by_searched_at", (q) => q.gte("searchedAt", since))
      .collect();

    const counts = new Map<string, { display: string; count: number }>();
    for (const event of events) {
      const existing = counts.get(event.queryNormalized);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(event.queryNormalized, {
          display: event.queryDisplay,
          count: 1,
        });
      }
    }

    const trending = [...counts.entries()]
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    for (const [, data] of trending) {
      suggestions.push({
        label: data.display,
        query: data.display,
        type: "trending",
      });
    }

    const curated = [
      { label: "Best Selling Products", query: "best selling products" },
      { label: "New Arrivals", query: "new arrivals" },
      { label: "Premium Collection", query: "premium collection" },
      { label: "Office Furniture", query: "office furniture" },
    ];

    for (const item of curated) {
      if (suggestions.length >= 8) break;
      if (!suggestions.some((s) => s.query.toLowerCase() === item.query)) {
        suggestions.push({ ...item, type: "curated" });
      }
    }

    if (suggestions.length < 6) {
      const categories = await ctx.db
        .query("productCategories")
        .withIndex("by_active_sort", (q) => q.eq("active", true))
        .take(3);
      for (const category of categories) {
        if (suggestions.length >= 8) break;
        if (
          !suggestions.some(
            (s) => s.query.toLowerCase() === category.name.toLowerCase()
          )
        ) {
          suggestions.push({
            label: category.name,
            query: category.name,
            type: "category",
          });
        }
      }
    }

    return suggestions.slice(0, 8);
  },
});
