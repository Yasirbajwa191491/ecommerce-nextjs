import { mutation } from "./server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { scheduleRecommendationRefresh } from "./lib/recommendations/scheduleRecommendationJob";
import {
  PYTHON_ML_RECOMMENDATION_STRATEGY_KEY,
  parsePythonMlStrategy,
} from "./lib/recommendations/pythonMlConfig";

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

export const schedulePythonMlShadowComparison = mutation({
  args: {},
  returns: v.object({
    scheduled: v.boolean(),
    reason: v.string(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const recent = await ctx.db
      .query("pythonMlShadowRuns")
      .withIndex("by_created")
      .order("desc")
      .take(1);
    const latest = recent[0];
    if (latest && latest.status === "running" && Date.now() - latest.createdAt < 5 * 60 * 1000) {
      return { scheduled: false, reason: "already_running" };
    }
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", PYTHON_ML_RECOMMENDATION_STRATEGY_KEY))
      .unique();
    const runId = await ctx.db.insert("pythonMlShadowRuns", {
      status: "running",
      requestedStrategy: parsePythonMlStrategy(setting?.value),
      modelAvailable: false,
      comparedCount: 0,
      fallbackCount: 0,
      summaryJson: "{}",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.recommendationActions.runPythonMlShadowComparison, {
      runId,
    });
    return { scheduled: true, reason: "queued" };
  },
});
