"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  MIN_REVIEWS_FOR_SUMMARY,
  shouldRegenerateInsights,
} from "./lib/ai/constants";
import { getReviewAIProvider } from "./lib/ai/getProvider";
import {
  analyzeReview,
  extractReviewTopics,
  generateReviewReply,
  summarizeReviews,
} from "./lib/ai/reviewIntelligence";

export const processReview = internalAction({
  args: { reviewId: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
      reviewId: args.reviewId,
    });

    if (!review) return null;

    await ctx.runMutation(internal.reviewAi.setAnalysisStatus, {
      reviewId: args.reviewId,
      status: "processing",
    });

    try {
      const provider = getReviewAIProvider();
      const results = await analyzeReview(provider, {
        title: review.title,
        content: review.content,
      });

      await ctx.runMutation(internal.reviewAi.applyReviewResults, {
        reviewId: args.reviewId,
        results,
      });

      if (review.isApproved) {
        await ctx.runAction(internal.reviewAiActions.regenerateProductInsights, {
          productId: review.productId,
          force: false,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI analysis failed";
      await ctx.runMutation(internal.reviewAi.setAnalysisStatus, {
        reviewId: args.reviewId,
        status: "failed",
        error: message,
      });
    }

    return null;
  },
});

export const regenerateProductInsights = internalAction({
  args: {
    productId: v.id("products"),
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.reviewAiQueries.getApprovedReviewTexts,
      { productId: args.productId }
    );

    if (data.texts.length < MIN_REVIEWS_FOR_SUMMARY) {
      return null;
    }

    if (
      !args.force &&
      !shouldRegenerateInsights(
        data.texts.length,
        data.previousReviewCount
      )
    ) {
      return null;
    }

    await ctx.runMutation(internal.reviewAi.setProductInsightsPending, {
      productId: args.productId,
    });

    try {
      const provider = getReviewAIProvider();
      const [summary, topics] = await Promise.all([
        summarizeReviews(provider, data.texts),
        extractReviewTopics(provider, data.texts),
      ]);

      await ctx.runMutation(internal.reviewAi.upsertProductInsights, {
        productId: args.productId,
        summary,
        topics,
        reviewCountAtGeneration: data.texts.length,
        status: "complete",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Insights generation failed";
      await ctx.runMutation(internal.reviewAi.upsertProductInsights, {
        productId: args.productId,
        summary: "",
        topics: [],
        reviewCountAtGeneration: data.texts.length,
        status: "failed",
      });
      console.error("Product insights failed:", message);
    }

    return null;
  },
});

export const generateReply = internalAction({
  args: { reviewId: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
      reviewId: args.reviewId,
    });

    if (!review) return null;

    try {
      const provider = getReviewAIProvider();
      const reply = await generateReviewReply(provider, {
        rating: review.rating,
        title: review.title,
        content: review.content,
        customerName: review.customerName,
      });

      await ctx.runMutation(internal.reviewAi.setReplyDraft, {
        reviewId: args.reviewId,
        draft: reply.trim(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Reply generation failed";
      throw new Error(message);
    }

    return null;
  },
});
