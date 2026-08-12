import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  recommendationIdentityTypeValidator,
  recommendationCacheReturnValidator,
  recommendationSectionTypeValidator,
  recommendationSettingsReturnValidator,
  scoreMapValidator,
  customerRecommendationProfileReturnValidator,
  marketingAudienceExportValidator,
} from "./lib/recommendations/validators";
import { buildCacheKey } from "./lib/recommendations/identity";
import { getRecommendationSettings } from "./lib/recommendations/settings";
import {
  getCandidateProductIds,
  loadCandidateProducts,
  getCoOccurrenceCandidates,
} from "./lib/recommendations/sections";
import { buildScoredProducts } from "./lib/recommendations/scoring";
import { isProductActive } from "./lib/productActive";

export const getProfileByIdentity = internalQuery({
  args: {
    identityType: recommendationIdentityTypeValidator,
    identityKey: v.string(),
  },
  returns: v.union(customerRecommendationProfileReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerRecommendationProfiles")
      .withIndex("by_identity", (q) =>
        q.eq("identityType", args.identityType).eq("identityKey", args.identityKey)
      )
      .unique();
  },
});

export const getRecommendationCache = internalQuery({
  args: { cacheKey: v.string() },
  returns: v.union(recommendationCacheReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("recommendationCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();

    if (!cached) return null;
    if (cached.expiresAt < Date.now()) return null;
    return {
      productIds: cached.productIds,
      scores: cached.scores,
      source: cached.source,
    };
  },
});

export const listWishlistProductIds = query({
  args: {
    visitorId: v.string(),
    customerEmail: v.optional(v.string()),
  },
  returns: v.array(v.id("products")),
  handler: async (ctx, args) => {
    const customerKey = args.customerEmail?.trim().toLowerCase();
    const identityType = customerKey ? ("customer" as const) : ("visitor" as const);
    const identityKey = customerKey ?? args.visitorId;

    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_identity_added", (q) =>
        q.eq("identityType", identityType).eq("identityKey", identityKey)
      )
      .order("desc")
      .take(50);

    return items.map((item) => item.productId);
  },
});

export const getRecommendationStats = query({
  args: {},
  returns: v.object({
    profileCount: v.number(),
    cacheCount: v.number(),
    pendingJobs: v.number(),
    totalImpressions: v.number(),
    totalClicks: v.number(),
    totalConversions: v.number(),
  }),
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("customerRecommendationProfiles")
      .take(1000);
    const cache = await ctx.db.query("recommendationCache").take(1000);
    const jobs = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(100);
    const analytics = await ctx.db.query("recommendationAnalytics").take(1000);

    return {
      profileCount: profiles.length,
      cacheCount: cache.length,
      pendingJobs: jobs.length,
      totalImpressions: analytics.reduce((sum, row) => sum + row.impressions, 0),
      totalClicks: analytics.reduce((sum, row) => sum + row.clicks, 0),
      totalConversions: analytics.reduce((sum, row) => sum + row.conversions, 0),
    };
  },
});

export const listRecommendationAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      sectionType: recommendationSectionTypeValidator,
      source: v.string(),
      impressions: v.number(),
      clicks: v.number(),
      conversions: v.number(),
      revenue: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 30, 100);
    const rows = await ctx.db
      .query("recommendationAnalytics")
      .withIndex("by_date")
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      date: row.date,
      sectionType: row.sectionType,
      source: row.source,
      impressions: row.impressions,
      clicks: row.clicks,
      conversions: row.conversions,
      revenue: row.revenue,
    }));
  },
});

export const listRecentRecommendationJobs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("recommendationJobs"),
      jobType: v.string(),
      status: v.string(),
      identityKey: v.optional(v.string()),
      processedBy: v.optional(v.string()),
      error: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const jobs = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(limit);

    const recent = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "complete"))
      .order("desc")
      .take(limit);

    return [...jobs, ...recent]
      .slice(0, limit)
      .map((job) => ({
        _id: job._id,
        jobType: job.jobType,
        status: job.status,
        identityKey: job.identityKey,
        processedBy: job.processedBy,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));
  },
});

export const getRecommendationStatsInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("customerRecommendationProfiles")
      .take(1000);
    const cache = await ctx.db.query("recommendationCache").take(1000);
    const jobs = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(100);
    const analytics = await ctx.db.query("recommendationAnalytics").take(1000);

    return {
      profileCount: profiles.length,
      cacheCount: cache.length,
      pendingJobs: jobs.length,
      totalImpressions: analytics.reduce((sum, row) => sum + row.impressions, 0),
      totalClicks: analytics.reduce((sum, row) => sum + row.clicks, 0),
      totalConversions: analytics.reduce((sum, row) => sum + row.conversions, 0),
    };
  },
});

export const exportMarketingAudiencesInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: marketingAudienceExportValidator,
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 1000);
    const profiles = await ctx.db
      .query("customerRecommendationProfiles")
      .withIndex("by_last_activity")
      .order("desc")
      .take(limit);

    const audiences = profiles
      .filter(
        (profile) =>
          profile.identityType === "customer" &&
          Boolean(profile.email?.trim())
      )
      .map((profile) => ({
        email: profile.email,
        identityKey: profile.identityKey,
        segments: profile.segments,
        interestTags: profile.interestTags,
        orderCount: profile.orderCount,
        totalSpent: profile.totalSpent,
        lastActivityAt: profile.lastActivityAt,
      }));

    const segmentSummary: Record<string, number> = {};
    for (const profile of profiles) {
      for (const segment of profile.segments) {
        segmentSummary[segment] = (segmentSummary[segment] ?? 0) + 1;
      }
      for (const tag of profile.interestTags) {
        segmentSummary[tag] = (segmentSummary[tag] ?? 0) + 1;
      }
    }

    return {
      exportedAt: Date.now(),
      audienceCount: audiences.length,
      audiences,
      segmentSummary,
    };
  },
});

export const getDueRecommendationJobs = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("recommendationJobs"),
      jobType: v.string(),
      identityKey: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobs = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_next_retry", (q) => q.eq("status", "retry_scheduled"))
      .take(args.limit);

    const pending = await ctx.db
      .query("recommendationJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(args.limit);

    return [...pending, ...jobs.filter((job) => (job.nextRetryAt ?? 0) <= now)]
      .slice(0, args.limit)
      .map((job) => ({
        _id: job._id,
        jobType: job.jobType,
        identityKey: job.identityKey,
      }));
  },
});

export const generateInsightsForProfile = internalQuery({
  args: { contextText: v.string() },
  returns: v.union(
    v.object({
      interestSummary: v.string(),
      segments: v.array(v.string()),
      rankedProductIds: v.array(v.string()),
      explanations: v.any(),
    }),
    v.null()
  ),
  handler: async () => {
    return null;
  },
});

export function resolveIdentity(
  visitorId: string,
  customerEmail?: string
): {
  identityType: "visitor" | "customer";
  identityKey: string;
  cacheKeyPrefix: string;
} {
  const customerKey = customerEmail?.trim().toLowerCase();
  if (customerKey) {
    return {
      identityType: "customer",
      identityKey: customerKey,
      cacheKeyPrefix: buildCacheKey("identity", "customer", customerKey),
    };
  }
  return {
    identityType: "visitor",
    identityKey: visitorId,
    cacheKeyPrefix: buildCacheKey("identity", "visitor", visitorId),
  };
}

export type RecommendationProfile = Doc<"customerRecommendationProfiles">;

export const getJobById = internalQuery({
  args: { jobId: v.id("recommendationJobs") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getRecommendationSettingsInternal = internalQuery({
  args: {},
  returns: recommendationSettingsReturnValidator,
  handler: async (ctx) => {
    return await getRecommendationSettings(ctx);
  },
});

export const getSectionCandidateIds = internalQuery({
  args: {
    sectionType: recommendationSectionTypeValidator,
    profileId: v.optional(v.id("customerRecommendationProfiles")),
    productId: v.optional(v.id("products")),
    cartProductIds: v.optional(v.array(v.id("products"))),
    recentlyViewedProductIds: v.optional(v.array(v.id("products"))),
    limit: v.number(),
  },
  returns: v.array(v.id("products")),
  handler: async (ctx, args) => {
    const profile = args.profileId ? await ctx.db.get(args.profileId) : null;
    return await getCandidateProductIds(
      ctx,
      args.sectionType,
      profile,
      {
        productId: args.productId,
        cartProductIds: args.cartProductIds,
        recentlyViewedProductIds: args.recentlyViewedProductIds,
      },
      args.limit
    );
  },
});

export const getCoOccurrenceScoresForProducts = internalQuery({
  args: { anchorProductIds: v.array(v.id("products")) },
  returns: scoreMapValidator,
  handler: async (ctx, args) => {
    const scores = await getCoOccurrenceCandidates(ctx, args.anchorProductIds, 50);
    return Object.fromEntries(scores);
  },
});

export const scoreCandidateProducts = internalQuery({
  args: {
    candidateIds: v.array(v.id("products")),
    profileId: v.optional(v.id("customerRecommendationProfiles")),
    similarityScores: scoreMapValidator,
    coOccurrenceScores: scoreMapValidator,
    limit: v.number(),
  },
  returns: v.object({
    productIds: v.array(v.id("products")),
    scores: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const profile = args.profileId ? await ctx.db.get(args.profileId) : null;
    const settings = await getRecommendationSettings(ctx);
    const products = await loadCandidateProducts(ctx, args.candidateIds);

    let maxReviews = 0;
    for (const product of products) {
      maxReviews = Math.max(maxReviews, product.reviews);
    }

    const similarityMap = new Map<string, number>(
      Object.entries(args.similarityScores as Record<string, number>)
    );
    const coMap = new Map<string, number>(
      Object.entries(args.coOccurrenceScores as Record<string, number>)
    );
    const maxCo = Math.max(0, ...Array.from(coMap.values()));

    const scored = buildScoredProducts(products, {
      profile,
      similarityScores: similarityMap,
      coOccurrenceScores: coMap,
      aiAdjustments: new Map(),
      maxReviews,
      weights: settings.scoringWeights,
      maxCoOccurrence: maxCo || 1,
    });

    const top = scored.slice(0, args.limit);
    return {
      productIds: top.map((item) => item.productId),
      scores: top.map((item) => item.score),
    };
  },
});

export const getFallbackProductIds = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("products")),
  handler: async (ctx, args) => {
    const featured = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(args.limit * 2);

    const ids = featured.filter(isProductActive).map((p) => p._id);
    if (ids.length >= args.limit) return ids.slice(0, args.limit);

    const products = await ctx.db.query("products").collect();
    const best = products
      .filter(isProductActive)
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, args.limit)
      .map((p) => p._id);

    return [...new Set([...ids, ...best])].slice(0, args.limit);
  },
});
