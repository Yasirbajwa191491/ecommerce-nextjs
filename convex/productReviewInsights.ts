import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  productInsightsStatusValidator,
  reviewTopicValidator,
} from "./lib/aiValidators";

const insightsValidator = v.union(
  v.object({
    summary: v.string(),
    topics: v.array(reviewTopicValidator),
    reviewCountAtGeneration: v.number(),
    generatedAt: v.number(),
    aiAnalysisStatus: productInsightsStatusValidator,
  }),
  v.null()
);

export const getByProductId = query({
  args: { productId: v.id("products") },
  returns: insightsValidator,
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("productReviewInsights")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    if (!insights || insights.aiAnalysisStatus === "pending") {
      return insights
        ? {
            summary: insights.summary,
            topics: insights.topics,
            reviewCountAtGeneration: insights.reviewCountAtGeneration,
            generatedAt: insights.generatedAt,
            aiAnalysisStatus: insights.aiAnalysisStatus,
          }
        : null;
    }

    if (insights.aiAnalysisStatus === "failed" && !insights.summary) {
      return {
        summary: insights.summary,
        topics: insights.topics,
        reviewCountAtGeneration: insights.reviewCountAtGeneration,
        generatedAt: insights.generatedAt,
        aiAnalysisStatus: insights.aiAnalysisStatus,
      };
    }

    return {
      summary: insights.summary,
      topics: insights.topics,
      reviewCountAtGeneration: insights.reviewCountAtGeneration,
      generatedAt: insights.generatedAt,
      aiAnalysisStatus: insights.aiAnalysisStatus,
    };
  },
});

export const listProductReviewTags = query({
  args: { productId: v.id("products") },
  returns: v.array(
    v.object({
      tagSlug: v.string(),
      tagLabel: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allRows = await ctx.db
      .query("reviewTagIndex")
      .filter(
        (q) =>
          q.and(
            q.eq(q.field("productId"), args.productId),
            q.eq(q.field("isApproved"), true)
          )
      )
      .collect();

    const counts = new Map<string, { tagLabel: string; count: number }>();
    for (const row of allRows) {
      const existing = counts.get(row.tagSlug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(row.tagSlug, { tagLabel: row.tagLabel, count: 1 });
      }
    }

    return Array.from(counts.entries())
      .map(([tagSlug, { tagLabel, count }]) => ({
        tagSlug,
        tagLabel,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.tagLabel.localeCompare(b.tagLabel));
  },
});

export const regenerate = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(
      0,
      internal.reviewAiActions.regenerateProductInsights,
      { productId: args.productId, force: true }
    );

    return null;
  },
});
