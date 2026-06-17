import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { copilotIntentValidator } from "./lib/ai/copilotTypes";
import { buildBusinessContext } from "./lib/ai/businessIntelligence";

export const getBusinessContext = internalQuery({
  args: {
    intents: v.array(copilotIntentValidator),
    referenceNow: v.number(),
    question: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await buildBusinessContext(
      ctx,
      args.intents,
      args.referenceNow,
      args.question
    );
  },
});

export const getRevenueStats = query({
  args: { referenceNow: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { getRevenueStats: getStats } = await import(
      "./lib/ai/businessIntelligence"
    );
    return await getStats(ctx, args.referenceNow);
  },
});

export const getTrendingProducts = query({
  args: { referenceNow: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { getTrendingProducts: getTrending } = await import(
      "./lib/ai/businessIntelligence"
    );
    return await getTrending(ctx, args.referenceNow);
  },
});

export const getInventoryInsights = query({
  args: { referenceNow: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { getInventoryInsights: getInventory } = await import(
      "./lib/ai/businessIntelligence"
    );
    return await getInventory(ctx, args.referenceNow);
  },
});

export const getReviewInsights = query({
  args: { referenceNow: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { getReviewInsights: getReviews } = await import(
      "./lib/ai/businessIntelligence"
    );
    return await getReviews(ctx, args.referenceNow);
  },
});
