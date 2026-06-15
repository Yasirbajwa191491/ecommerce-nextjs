"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { embedProductText } from "./lib/ai/productIntelligence";
import { parseSearchQuery } from "./lib/search/queryParser";
import {
  computeKeywordScore,
  passesPriceFilters,
  passesStarFilter,
  rankSearchCandidates,
  tokenizeQuery,
  type SearchProductCandidate,
} from "./lib/search/hybridRank";
import type { Id } from "./_generated/dataModel";

import type { ActionCtx } from "./_generated/server";

type SearchResultItem = {
  _id: Id<"products">;
  name: string;
  company: string;
  imageUrl: string;
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
};

type HybridSearchResult = {
  products: SearchResultItem[];
  totalCount: number;
  nextCursor?: number;
  isSimilarFallback: boolean;
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
});

const hybridSearchResultValidator = v.object({
  products: v.array(searchResultItemValidator),
  totalCount: v.number(),
  nextCursor: v.optional(v.number()),
  isSimilarFallback: v.boolean(),
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

    if (keywordScore > 0 || semanticScore > 0) {
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
  },
  returns: hybridSearchResultValidator,
  handler: async (ctx, args): Promise<HybridSearchResult> => {
    const trimmed = args.query.trim();
    if (!trimmed) {
      return { products: [], totalCount: 0, isSimilarFallback: false };
    }

    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const cursor = args.cursor ?? 0;
    const queryNormalized = trimmed.toLowerCase();

    const categories = await ctx.runQuery(
      internal.productSearchQueries.getActiveCategories,
      {}
    );
    const parsed = parseSearchQuery(trimmed, categories);
    const queryTerms = tokenizeQuery(parsed.embeddingQuery);

    const { candidates: catalog, maxReviews } = (await ctx.runQuery(
      internal.productSearchQueries.getSearchCandidates,
      {}
    )) as SearchCandidatesResult;

    const semanticScores = new Map<string, number>();
    const embedding = await getQueryEmbedding(
      ctx,
      queryNormalized,
      parsed.embeddingQuery
    );

    if (embedding) {
      try {
        const vectorResults = await ctx.vectorSearch("products", "by_embedding", {
          vector: embedding,
          limit: 50,
        });

        for (const hit of vectorResults) {
          semanticScores.set(hit._id as string, hit._score);
        }
      } catch {
        // Fall through to keyword-only
      }
    }

    const candidateMap = buildCandidateMap(catalog, queryTerms, semanticScores);

    if (candidateMap.size === 0 && semanticScores.size > 0) {
      for (const product of catalog) {
        const semanticScore = semanticScores.get(product._id) ?? 0;
        if (semanticScore > 0) {
          candidateMap.set(product._id, {
            ...product,
            keywordScore: 0,
            semanticScore,
          });
        }
      }
    }

    if (candidateMap.size === 0) {
      for (const product of catalog) {
        const keywordScore = computeKeywordScore(product, queryTerms);
        if (keywordScore > 0) {
          candidateMap.set(product._id, {
            ...product,
            keywordScore,
            semanticScore: 0,
          });
        }
      }
    }

    let ranked = rankSearchCandidates(candidateMap, {
      categoryHint: parsed.categoryHint,
      maxReviews,
      query: parsed.embeddingQuery,
    });

    ranked = ranked.filter(
      (p) =>
        passesPriceFilters(p, parsed.maxPrice, parsed.minPrice) &&
        passesStarFilter(p, parsed.minStars)
    );

    let isSimilarFallback = false;
    if (ranked.length === 0 && semanticScores.size > 0) {
      isSimilarFallback = true;
      const fallbackMap = new Map<
        string,
        SearchProductCandidate & { semanticScore: number; keywordScore: number }
      >();
      for (const product of catalog) {
        const semanticScore = semanticScores.get(product._id) ?? 0;
        if (semanticScore > 0) {
          fallbackMap.set(product._id, {
            ...product,
            keywordScore: 0,
            semanticScore,
          });
        }
      }
      ranked = rankSearchCandidates(fallbackMap, {
        categoryHint: parsed.categoryHint,
        maxReviews,
        query: parsed.embeddingQuery,
      });
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
      source: args.source ?? "header",
    });

    return {
      products,
      totalCount,
      nextCursor,
      isSimilarFallback,
    };
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

    const embedding = await ctx.runQuery(
      internal.productSearchQueries.getProductEmbedding,
      { productId: args.productId }
    );

    if (!embedding) return [];

    const sourceProduct = await ctx.runQuery(
      internal.productAiQueries.getProductForIntelligence,
      { productId: args.productId }
    );

    let vectorResults: Array<{ _id: string; _score: number }> = [];
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
      {}
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
