"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateRecommendationInsights } from "./lib/ai/recommendationAiProvider";

export const generateProfileInsights = internalAction({
  args: {
    identityType: v.union(v.literal("visitor"), v.literal("customer")),
    identityKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(
      internal.recommendationQueries.getProfileByIdentity,
      {
        identityType: args.identityType,
        identityKey: args.identityKey,
      }
    );
    if (!profile) return null;

    const settings = await ctx.runQuery(
      internal.recommendationQueries.getRecommendationSettingsInternal,
      {}
    );

    const contextText = [
      `Identity: ${args.identityType}:${args.identityKey}`,
      `Segments: ${profile.segments.join(", ")}`,
      `Interest tags: ${profile.interestTags.join(", ")}`,
      `Favorite types: ${profile.favoriteProductTypes.join(", ")}`,
      `Orders: ${profile.orderCount}`,
      `Total spent: ${profile.totalSpent}`,
      `Recently viewed: ${profile.recentlyViewedProductIds.join(", ")}`,
    ].join("\n");

    const insights = await generateRecommendationInsights(settings, contextText);
    if (!insights) return null;

    await ctx.runMutation(internal.recommendationMutations.saveRecommendationProfile, {
      identityType: args.identityType,
      identityKey: args.identityKey,
      aiInterestSummary: insights.interestSummary,
      segments: insights.segments,
    });

    return null;
  },
});
