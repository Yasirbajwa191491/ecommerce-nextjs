"use node";

import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { buildCacheKey } from "./lib/recommendations/identity";
import {
  rankSimilarityFromOrder,
  rankVectorSimilarity,
} from "./lib/recommendations/scoring";
import {
  recommendationSectionTypeValidator,
  sectionRecommendationReturnValidator,
} from "./lib/recommendations/validators";

type SectionType = Infer<typeof recommendationSectionTypeValidator>;

type SimilarProductResult = {
  _id: Id<"products">;
};

export const processRecommendationJob = internalAction({
  args: { jobId: v.id("recommendationJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.recommendationQueries.getJobById, {
      jobId: args.jobId,
    });
    if (!job || job.status === "complete" || job.status === "failed") {
      return null;
    }

    await ctx.runMutation(internal.recommendationMutations.markJobProcessing, {
      jobId: args.jobId,
      processedBy: "convex",
    });

    try {
      if (job.jobType === "co_occurrence_rebuild") {
        const batch = await ctx.runMutation(
          internal.recommendationMutations.rebuildCoOccurrenceBatch,
          { batchSize: 50 }
        );
        if (!batch.isDone && batch.nextCursor) {
          await ctx.scheduler.runAfter(
            1000,
            internal.recommendationActions.processRecommendationJob,
            { jobId: args.jobId }
          );
          return null;
        }
      } else if (
        job.identityType &&
        job.identityKey &&
        (job.jobType === "profile_refresh" || job.jobType === "embedding_refresh")
      ) {
        await ctx.runMutation(
          internal.recommendationMutations.rebuildProfileInternal,
          {
            identityType: job.identityType,
            identityKey: job.identityKey,
          }
        );
        if (job.jobType === "embedding_refresh") {
          await ctx.runMutation(
            internal.recommendationMutations.applyEmbeddingInternal,
            {
              identityType: job.identityType,
              identityKey: job.identityKey,
            }
          );
        }
      } else if (
        job.identityType &&
        job.identityKey &&
        job.jobType === "ai_insights"
      ) {
        await ctx.runAction(internal.recommendationAiActions.generateProfileInsights, {
          identityType: job.identityType,
          identityKey: job.identityKey,
        });
      } else if (
        job.identityType &&
        job.identityKey &&
        job.jobType === "cache_refresh"
      ) {
        await ctx.runAction(internal.recommendationActions.refreshAllSectionCaches, {
          identityType: job.identityType,
          identityKey: job.identityKey,
          productId: job.productId,
        });
      }

      await ctx.runMutation(internal.recommendationMutations.markJobComplete, {
        jobId: args.jobId,
        processedBy: "convex",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed";
      await ctx.runMutation(internal.recommendationMutations.markJobFailed, {
        jobId: args.jobId,
        error: message,
      });
    }

    return null;
  },
});

export const refreshAllSectionCaches = internalAction({
  args: {
    identityType: v.union(v.literal("visitor"), v.literal("customer")),
    identityKey: v.string(),
    productId: v.optional(v.id("products")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sections: SectionType[] = [
      "recommended_for_you",
      "recently_viewed",
      "trending_in_interests",
    ];

    for (const sectionType of sections) {
      await ctx.runAction(internal.recommendationActions.computeSectionRecommendations, {
        sectionType,
        visitorId: args.identityType === "visitor" ? args.identityKey : "",
        customerEmail:
          args.identityType === "customer" ? args.identityKey : undefined,
        productId: args.productId,
        limit: 8,
        writeCache: true,
      });
    }

    return null;
  },
});

export const computeSectionRecommendations = internalAction({
  args: {
    sectionType: recommendationSectionTypeValidator,
    visitorId: v.string(),
    customerEmail: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    cartProductIds: v.optional(v.array(v.id("products"))),
    recentlyViewedProductIds: v.optional(v.array(v.id("products"))),
    limit: v.optional(v.number()),
    writeCache: v.optional(v.boolean()),
  },
  returns: sectionRecommendationReturnValidator,
  handler: async (ctx, args): Promise<{
    productIds: Id<"products">[];
    scores: number[];
    source: string;
    cacheKey?: string;
  }> => {
    const settings = await ctx.runQuery(
      internal.recommendationQueries.getRecommendationSettingsInternal,
      {}
    );

    const customerKey = args.customerEmail?.trim().toLowerCase();
    const identityType = customerKey ? ("customer" as const) : ("visitor" as const);
    const identityKey =
      customerKey || args.visitorId || `anonymous:${Date.now()}`;
    const limit = Math.min(args.limit ?? settings.maxPerSection, 16);

    const cacheKey = buildCacheKey(args.sectionType, identityType, identityKey, {
      productId: args.productId,
      cartProductIds: args.cartProductIds,
    });

    if (args.writeCache !== false) {
      const cached = await ctx.runQuery(
        internal.recommendationQueries.getRecommendationCache,
        { cacheKey }
      );
      if (cached) {
        return {
          productIds: cached.productIds,
          scores: cached.scores,
          source: cached.source,
          cacheKey,
        };
      }
    }

    const profile = await ctx.runQuery(
      internal.recommendationQueries.getProfileByIdentity,
      { identityType, identityKey }
    );

    const candidateIds = await ctx.runQuery(
      internal.recommendationQueries.getSectionCandidateIds,
      {
        sectionType: args.sectionType,
        profileId: profile?._id,
        productId: args.productId,
        cartProductIds: args.cartProductIds,
        recentlyViewedProductIds: args.recentlyViewedProductIds,
        limit,
      }
    );

    let similarityScores = new Map<string, number>();
    const coOccurrenceScores = await ctx.runQuery(
      internal.recommendationQueries.getCoOccurrenceScoresForProducts,
      {
        anchorProductIds: [
          ...(args.cartProductIds ?? []),
          ...(args.productId ? [args.productId] : []),
          ...(profile?.recentlyViewedProductIds ?? []).slice(0, 3),
        ],
      }
    );

    if (profile?.embedding?.length) {
      try {
        const vectorResults = await ctx.vectorSearch("products", "by_embedding", {
          vector: profile.embedding,
          limit: 50,
        });
        for (const hit of vectorResults) {
          similarityScores.set(hit._id as string, rankVectorSimilarity(hit._score));
        }
      } catch {
        similarityScores = new Map();
      }
    }

    if (args.productId && args.sectionType === "because_you_viewed") {
      const similar = (await ctx.runAction(api.productSearch.getSimilarProducts, {
        productId: args.productId,
        limit,
      })) as SimilarProductResult[];
      const similarIds = similar.map((item) => item._id);
      similarityScores = new Map(
        similar.map((item) => [
          item._id as string,
          rankSimilarityFromOrder(item._id, similarIds),
        ])
      );
    }

    const scored = await ctx.runQuery(
      internal.recommendationQueries.scoreCandidateProducts,
      {
        candidateIds,
        profileId: profile?._id,
        similarityScores: Object.fromEntries(similarityScores),
        coOccurrenceScores,
        limit,
      }
    );

    let source: "personalized" | "similar" | "popular" | "fallback" = "personalized";
    if (!profile && scored.productIds.length === 0) {
      source = "fallback";
    } else if (!profile?.embedding?.length && scored.productIds.length > 0) {
      source = "popular";
    }

    if (scored.productIds.length === 0) {
      const fallback = await ctx.runQuery(
        internal.recommendationQueries.getFallbackProductIds,
        { limit }
      );
      if (args.writeCache !== false) {
        await ctx.runMutation(internal.recommendationMutations.saveRecommendationCache, {
          cacheKey,
          sectionType: args.sectionType,
          productIds: fallback,
          scores: fallback.map((_id: Id<"products">, index: number) =>
            1 - index / Math.max(fallback.length, 1)
          ),
          source: "fallback",
          expiresAt: Date.now() + settings.cacheTtlMs,
        });
      }
      return {
        productIds: fallback,
        scores: fallback.map((_id: Id<"products">, index: number) =>
          1 - index / Math.max(fallback.length, 1)
        ),
        source: "fallback",
        cacheKey,
      };
    }

    if (args.writeCache !== false) {
      await ctx.runMutation(internal.recommendationMutations.saveRecommendationCache, {
        cacheKey,
        sectionType: args.sectionType,
        productIds: scored.productIds,
        scores: scored.scores,
        source,
        expiresAt: Date.now() + settings.cacheTtlMs,
      });
    }

    return {
      productIds: scored.productIds,
      scores: scored.scores,
      source,
      cacheKey,
    };
  },
});

export const rankForVoice = internalAction({
  args: {
    visitorId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    category: v.optional(v.string()),
    maxBudget: v.optional(v.number()),
    preference: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.id("products")),
  handler: async (ctx, args): Promise<Id<"products">[]> => {
    const result = await ctx.runAction(
      internal.recommendationActions.computeSectionRecommendations,
      {
        sectionType: "recommended_for_you",
        visitorId: args.visitorId ?? "",
        customerEmail: args.customerEmail,
        limit: args.limit ?? 8,
        writeCache: false,
      }
    );

    if (result.productIds.length > 0) {
      return result.productIds;
    }

    return [];
  },
});
