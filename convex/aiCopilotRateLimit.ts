import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { checkAndIncrementRateLimit } from "./lib/rateLimit";

const AI_COPILOT_MAX_REQUESTS = 20;
const AI_COPILOT_WINDOW_MS = 15 * 60 * 1000;

export const checkCopilotRateLimit = internalMutation({
  args: { adminUserId: v.string() },
  returns: v.union(
    v.object({ allowed: v.literal(true) }),
    v.object({ allowed: v.literal(false), retryAfterMs: v.number() })
  ),
  handler: async (ctx, args) => {
    const result = await checkAndIncrementRateLimit(
      ctx,
      `ai-copilot:${args.adminUserId}`,
      {
        maxAttempts: AI_COPILOT_MAX_REQUESTS,
        windowMs: AI_COPILOT_WINDOW_MS,
      }
    );
    if (result.allowed) {
      return { allowed: true as const };
    }
    return { allowed: false as const, retryAfterMs: result.retryAfterMs };
  },
});

const CACHE_TTL_MS = 5 * 60 * 1000;

export const setAnalyticsCache = internalMutation({
  args: {
    cacheKey: v.string(),
    payload: v.string(),
    referenceNow: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiCopilotAnalyticsCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();

    const expiresAt = args.referenceNow + CACHE_TTL_MS;
    if (existing) {
      await ctx.db.patch(existing._id, {
        payload: args.payload,
        expiresAt,
      });
    } else {
      await ctx.db.insert("aiCopilotAnalyticsCache", {
        cacheKey: args.cacheKey,
        payload: args.payload,
        expiresAt,
      });
    }
    return null;
  },
});
