"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { embedProductText } from "./lib/ai/productIntelligence";
import { parseSearchQuery } from "./lib/search/queryParser";
import {
  applyHardSearchConstraints,
  computeKeywordScore,
  rankSearchCandidates,
  tokenizeQuery,
  isRelevantSearchCandidate,
  type SearchProductCandidate,
} from "./lib/search/hybridRank";
import type { Id } from "./_generated/dataModel";

import type { ActionCtx } from "./_generated/server";
import { productImageValidator } from "./schema";

type SearchResultItem = {
  _id: Id<"products">;
  name: string;
  company: string;
  imageUrl: string;
  images: Array<{ url: string; alt?: string }>;
  price: number;
  discountPercent: number;
  currency: string;
  categoryId: Id<"productCategories">;
  categoryName: string;
  stars: number;
  reviews: number;
  featured: boolean;
  finalPrice: number;
  stock: number;
  shipping: boolean;
  description: string;
  _creationTime: number;
};

type HybridSearchResult = {
  products: SearchResultItem[];
  totalCount: number;
  nextCursor?: number;
  isSimilarFallback: boolean;
  /** All ranked product ids — used to scope catalog sidebar facets during search. */
  resultProductIds: Id<"products">[];
};

type SearchCandidatesResult = {
  candidates: SearchProductCandidate[];
  maxReviews: number;
};

const searchResultItemValidator = v.object({
  _id: v.id("products"),
  name: v.string(),
  company: v.string(),
  imageUrl: v.string(),
  images: v.array(productImageValidator),
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
  _creationTime: v.number(),
});

const hybridSearchResultValidator = v.object({
  products: v.array(searchResultItemValidator),
  totalCount: v.number(),
  nextCursor: v.optional(v.number()),
  isSimilarFallback: v.boolean(),
  resultProductIds: v.array(v.id("products")),
});

async function getQueryEmbedding(
  ctx: ActionCtx,
  queryNormalized: string,
  embeddingQuery: string
): Promise<number[] | null> {
  const cached = await ctx.runQuery(
    internal.productSearchQueries.getCachedQueryEmbedding,
    { queryNormalized }
  );
  if (cached) return cached;

  try {
    const embedding = await embedProductText(embeddingQuery);
    await ctx.runMutation(internal.productSearchQueries.setCachedQueryEmbedding, {
      queryNormalized,
      embedding,
    });
    return embedding;
  } catch {
    return null;
  }
}

function buildCandidateMap(
  catalog: SearchProductCandidate[],
  queryTerms: string[],
  semanticScores: Map<string, number>
) {
  const map = new Map<
    string,
    SearchProductCandidate & { semanticScore: number; keywordScore: number }
  >();

  for (const product of catalog) {
    const keywordScore = computeKeywordScore(product, queryTerms);
    const semanticScore = semanticScores.get(product._id) ?? 0;

    if (isRelevantSearchCandidate(product, queryTerms, semanticScore)) {
      map.set(product._id, {
        ...product,
        keywordScore,
        semanticScore,
      });
    }
  }

  return map;
}

export const searchHybrid = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
    source: v.optional(v.union(v.literal("header"), v.literal("catalog"))),
    sessionId: v.optional(v.string()),
    visitorId: v.optional(v.string()),
    customerKey: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    minPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    maxPrice: v.optional(v.number()),
    brands: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    minRating: v.optional(v.number()),
    promotions: v.optional(
      v.array(
        v.union(
          v.literal("on_sale"),
          v.literal("discounted"),
          v.literal("bogo"),
          v.literal("free_gift"),
          v.literal("buy_x_get_y"),
          v.literal("limited_time")
        )
      )
    ),
    inStockOnly: v.optional(v.boolean()),
  },
  returns: hybridSearchResultValidator,
  handler: async (ctx, args): Promise<HybridSearchResult> => {
    const trimmed = args.query.trim();
    if (!trimmed) {
      return {
        products: [],
        totalCount: 0,
        isSimilarFallback: false,
        resultProductIds: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const cursor = Math.max(0, Math.floor(args.cursor ?? 0));
    const queryNormalized = trimmed.toLowerCase();

    const categories = await ctx.runQuery(
      internal.productSearchQueries.getActiveCategories,
      {}
    );
    const parsed = parseSearchQuery(trimmed, categories);
    const queryTerms = tokenizeQuery(parsed.embeddingQuery);

    const semanticScores = new Map<string, number>();
    const embedding = await getQueryEmbedding(
      ctx,
      queryNormalized,
      parsed.embeddingQuery
    );
    const includeIds: Id<"products">[] = [];

    if (embedding) {
      try {
        const vectorResults = await ctx.vectorSearch("products", "by_embedding", {
          vector: embedding,
          limit: 50,
        });

        for (const hit of vectorResults) {
          semanticScores.set(hit._id as string, hit._score);
          includeIds.push(hit._id as Id<"products">);
        }
      } catch {
        // Fall through to keyword-only
      }
    }

    const { candidates: catalog, maxReviews } = (await ctx.runQuery(
      internal.productSearchQueries.getSearchCandidates,
      { searchTerms: queryTerms, includeIds }
    )) as SearchCandidatesResult;

    const candidateMap = buildCandidateMap(catalog, queryTerms, semanticScores);

    let ranked = rankSearchCandidates(candidateMap, {
      categoryHint: parsed.categoryHint,
      maxReviews,
      query: parsed.embeddingQuery,
    });

    const minPrice =
      args.minPrice !== undefined && parsed.minPrice !== undefined
        ? Math.max(args.minPrice, parsed.minPrice)
        : (args.minPrice ?? parsed.minPrice);
    const maxPrice =
      args.maxPrice !== undefined && parsed.maxPrice !== undefined
        ? Math.min(args.maxPrice, parsed.maxPrice)
        : (args.maxPrice ?? parsed.maxPrice);
    const minStars =
      args.minRating !== undefined && parsed.minStars !== undefined
        ? Math.max(args.minRating, parsed.minStars)
        : (args.minRating ?? parsed.minStars);
    const currencyConflict = Boolean(args.currency && parsed.currency && args.currency.toUpperCase() !== parsed.currency);
    const currency = parsed.currency ?? args.currency;
    // Bare numeric budgets cannot compare incomparable amounts. Existing callers without
    // a selected currency retain the legacy USD budget interpretation; browsing stays mixed.
    const budgetCurrency = currency ?? ((minPrice !== undefined || maxPrice !== undefined) ? "USD" : undefined);
    const hardConstraints = { minPrice, maxPrice, minStars, currency: budgetCurrency, categoryHint: parsed.categoryHint, productTypeTerms: parsed.productTypeTerms };

    ranked = applyHardSearchConstraints(ranked, hardConstraints);

    if (currencyConflict) ranked = [];
    // Recommendations are a separate opt-in surface, never a no-match fallback.
    const isSimilarFallback = false;

    const hasCatalogFilters = Boolean(
      args.categoryId ||
        args.brands?.length ||
        args.colors?.length ||
        args.promotions?.length ||
        args.inStockOnly
    );
    if (hasCatalogFilters && ranked.length > 0) {
      const allowedIds = new Set(
        await ctx.runQuery(internal.productSearchQueries.filterSearchProductIds, {
          productIds: ranked.map((product) => product._id as Id<"products">),
          categoryId: args.categoryId,
          minPrice,
          currency: budgetCurrency,
          maxPrice,
          brands: args.brands,
          colors: args.colors,
          minRating: minStars,
          promotions: args.promotions,
          inStockOnly: args.inStockOnly,
          now: Date.now(),
        })
      );
      ranked = ranked.filter((product) => allowedIds.has(product._id as Id<"products">));
    }

    const totalCount = ranked.length;
    const page = ranked.slice(cursor, cursor + limit);
    const nextCursor =
      cursor + limit < totalCount ? cursor + limit : undefined;

    const enriched = (await ctx.runQuery(
      internal.productSearchQueries.enrichProductsByIds,
      { productIds: page.map((p) => p._id as Id<"products">) }
    )) as SearchResultItem[];

    const enrichedById = new Map(enriched.map((p) => [p._id, p]));
    const products = page
      .map((p) => enrichedById.get(p._id as Id<"products">))
      .filter((p): p is SearchResultItem => p !== undefined);

    await ctx.runMutation(internal.productSearchQueries.logSearchEvent, {
      queryNormalized,
      queryDisplay: trimmed,
      resultCount: totalCount,
      sessionId: args.sessionId,
      visitorId: args.visitorId,
      customerKey: args.customerKey,
      source: args.source ?? "header",
    });

    return {
      products,
      totalCount,
      nextCursor,
      isSimilarFallback,
      resultProductIds: ranked.map((p) => p._id as Id<"products">),
    };
  },
});

export const similarProducts = internalAction({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultItemValidator),
  handler: async (ctx, args): Promise<SearchResultItem[]> => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 16);

    const embedding = await ctx.runQuery(
      internal.productSearchQueries.getProductEmbedding,
      { productId: args.productId }
    );

    if (!embedding) return [];

    const sourceProduct = await ctx.runQuery(
      internal.productAiQueries.getProductForIntelligence,
      { productId: args.productId }
    );

    let vectorResults: Array<{ _id: Id<"products">; _score: number }> = [];
    try {
      vectorResults = await ctx.vectorSearch("products", "by_embedding", {
        vector: embedding,
        limit: limit * 3,
      });
    } catch {
      return [];
    }

    const { candidates: catalog, maxReviews } = (await ctx.runQuery(
      internal.productSearchQueries.getSearchCandidates,
      {
        searchTerms: tokenizeQuery(sourceProduct?.name ?? ""),
        includeIds: vectorResults.map((hit) => hit._id),
      }
    )) as SearchCandidatesResult;
    const catalogById = new Map(catalog.map((p) => [p._id, p]));

    const candidateMap = new Map<
      string,
      SearchProductCandidate & { semanticScore: number; keywordScore: number }
    >();

    for (const hit of vectorResults) {
      if (hit._id === args.productId) continue;
      const product = catalogById.get(hit._id as string);
      if (!product) continue;
      candidateMap.set(hit._id as string, {
        ...product,
        semanticScore: hit._score,
        keywordScore: 0,
      });
    }

    const ranked = rankSearchCandidates(candidateMap, {
      categoryHint: sourceProduct?.categoryName,
      maxReviews,
      query: sourceProduct?.name ?? "",
    }).slice(0, limit);

    return (await ctx.runQuery(
      internal.productSearchQueries.enrichProductsByIds,
      { productIds: ranked.map((p) => p._id as Id<"products">) }
    )) as SearchResultItem[];
  },
});

export const getSimilarProducts = action({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultItemValidator),
  handler: async (ctx, args): Promise<SearchResultItem[]> => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 16);
    const resolved = await ctx.runQuery(internal.contentRecommendations.resolveForProduct, {
      productId: args.productId,
      limit,
    });
    if (resolved.applied && resolved.productIds.length > 0) {
      const products = (await ctx.runQuery(internal.productSearchQueries.enrichProductsByIds, {
        productIds: resolved.productIds,
      })) as SearchResultItem[];
      if (products.length > 0) return products;
    }
    return await ctx.runAction(internal.productSearch.similarProducts, {
      productId: args.productId,
      limit,
    });
  },
});
