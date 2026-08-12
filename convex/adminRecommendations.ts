import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { scheduleRecommendationRefresh } from "./lib/recommendations/scheduleRecommendationJob";

export const scheduleCoOccurrenceRebuild = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await scheduleRecommendationRefresh(ctx, {
      jobType: "co_occurrence_rebuild",
      triggeredBy: "admin",
    });
    return null;
  },
});

export const scheduleProfileBackfill = mutation({
  args: {
    identityType: v.union(v.literal("visitor"), v.literal("customer")),
    identityKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await scheduleRecommendationRefresh(ctx, {
      identityType: args.identityType,
      identityKey: args.identityKey,
      jobType: "profile_refresh",
      triggeredBy: "admin",
    });
    await ctx.scheduler.runAfter(
      0,
      internal.recommendationAiActions.generateProfileInsights,
      {
        identityType: args.identityType,
        identityKey: args.identityKey,
      }
    );
    return null;
  },
});
