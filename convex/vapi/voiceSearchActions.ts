"use node";

import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { embedProductText } from "../lib/ai/productIntelligence";
import { parseSearchQuery } from "../lib/search/queryParser";
import {
  computeKeywordScore,
  passesPriceFilters,
  passesStarFilter,
  rankSearchCandidates,
  tokenizeQuery,
  type SearchProductCandidate,
} from "../lib/search/hybridRank";
import type { Id } from "../_generated/dataModel";
import { calculateFinalPrice } from "../lib/pricing";
import { getSiteUrl } from "../lib/siteUrl";
import {
  buildBundleFromCandidates,
  parseBundleBudget,
  pickBundleItem,
  resolveBundleSlots,
  toRankedProduct,
  type BundleCandidate,
} from "./bundleBuilder";

type SearchCandidatesResult = {
  candidates: SearchProductCandidate[];
  maxReviews: number;
};

const vapiProductSummaryValidator = v.object({
  id: v.string(),
  name: v.string(),
  finalPrice: v.number(),
  currency: v.string(),
  category: v.union(v.string(), v.null()),
  rating: v.number(),
  reviewsCount: v.number(),
  url: v.string(),
  inStock: v.boolean(),
});

async function runHybridSearch(
  ctx: ActionCtx,
  query: string,
  limit: number,
  maxPrice?: number
) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { products: [], totalCount: 0 };
  }

  const categories = await ctx.runQuery(
    internal.productSearchQueries.getActiveCategories,
    {}
  );
  const parsed = parseSearchQuery(trimmed, categories);
  const effectiveMaxPrice = maxPrice ?? parsed.maxPrice;
  const queryTerms = tokenizeQuery(parsed.embeddingQuery);
  const queryNormalized = trimmed.toLowerCase();

  const { candidates: catalog, maxReviews } = (await ctx.runQuery(
    internal.productSearchQueries.getSearchCandidates,
    {}
  )) as SearchCandidatesResult;

  const semanticScores = new Map<string, number>();
  let embedding: number[] | null = null;

  const cached = await ctx.runQuery(
    internal.productSearchQueries.getCachedQueryEmbedding,
    { queryNormalized }
  );
  if (cached) {
    embedding = cached;
  } else {
    try {
      embedding = await embedProductText(parsed.embeddingQuery);
      await ctx.runMutation(internal.productSearchQueries.setCachedQueryEmbedding, {
        queryNormalized,
        embedding,
      });
    } catch {
      embedding = null;
    }
  }

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
      // keyword-only fallback
    }
  }

  const candidateMap = new Map<
    string,
    SearchProductCandidate & { semanticScore: number; keywordScore: number }
  >();

  for (const product of catalog) {
    const keywordScore = computeKeywordScore(product, queryTerms);
    const semanticScore = semanticScores.get(product._id) ?? 0;
    if (keywordScore > 0 || semanticScore > 0) {
      candidateMap.set(product._id, { ...product, keywordScore, semanticScore });
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
      passesPriceFilters(p, effectiveMaxPrice, parsed.minPrice) &&
      passesStarFilter(p, parsed.minStars)
  );

  const page = ranked.slice(0, limit);
  const baseUrl = getSiteUrl().replace(/\/$/, "");

  const products = page.map((p) => ({
    id: p._id,
    name: p.name,
    finalPrice: calculateFinalPrice(p.price, p.discountPercent ?? 0),
    currency: "USD",
    category: p.categoryName,
    rating: p.stars,
    reviewsCount: p.reviews,
    url: `${baseUrl}/product/${p._id}`,
    inStock: true,
  }));

  return { products, totalCount: ranked.length };
}

export const searchProductsHybrid = internalAction({
  args: {
    query: v.string(),
    budget: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    products: v.array(vapiProductSummaryValidator),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
    return await runHybridSearch(ctx, args.query, limit, args.budget);
  },
});

export const buildProductBundle = internalAction({
  args: {
    query: v.string(),
    budget: v.optional(v.number()),
  },
  returns: v.object({
    answer: v.string(),
    bundle: v.array(
      v.object({
        title: v.string(),
        price: v.number(),
        reason: v.string(),
        productId: v.string(),
      })
    ),
    total: v.number(),
    budget: v.number(),
    remainingBudget: v.number(),
  }),
  handler: async (ctx, args) => {
    const categories = await ctx.runQuery(
      internal.productSearchQueries.getActiveCategories,
      {}
    );
    const { budget, cleanedQuery } = parseBundleBudget(
      args.query,
      args.budget,
      categories
    );
    const slots = resolveBundleSlots(cleanedQuery || args.query);
    const usedProductIds = new Set<string>();
    const picked: BundleCandidate[] = [];
    let remainingBudget = budget;

    for (const slot of slots) {
      const slotBudget = Math.min(
        remainingBudget,
        Math.max(budget * slot.budgetShare, budget * 0.1)
      );
      if (slotBudget <= 0) continue;

      const slotQuery = slot.searchQuery || cleanedQuery || args.query;
      const searchResult = await runHybridSearch(
        ctx,
        slotQuery,
        12,
        slotBudget
      );

      const ranked = searchResult.products.map((p) =>
        toRankedProduct({
          _id: p.id,
          name: p.name,
          price: p.finalPrice,
          discountPercent: 0,
          categoryName: p.category ?? "",
          stars: p.rating,
          reviews: p.reviewsCount,
          stock: p.inStock ? 1 : 0,
        })
      );

      const item = pickBundleItem(ranked, slot, slotBudget, usedProductIds);
      if (item) {
        picked.push(item);
        usedProductIds.add(item.productId);
        remainingBudget -= item.finalPrice;
      }
    }

    return buildBundleFromCandidates(picked, budget, args.query);
  },
});
