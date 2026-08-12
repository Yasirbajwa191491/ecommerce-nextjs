import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS,
  PROVIDER_CIRCUIT_BREAKER_THRESHOLD,
} from "./lib/ai/constants";

const providerStatusValidator = v.union(
  v.literal("healthy"),
  v.literal("degraded"),
  v.literal("down")
);

export const getProvider = internalQuery({
  args: { provider: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      provider: v.string(),
      status: providerStatusValidator,
      lastFailureAt: v.optional(v.number()),
      consecutiveFailures: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("providerHealth")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .unique();
    if (!row) return null;
    return {
      provider: row.provider,
      status: row.status,
      lastFailureAt: row.lastFailureAt,
      consecutiveFailures: row.consecutiveFailures,
    };
  },
});

export const recordSuccess = internalMutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("providerHealth")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "healthy",
        consecutiveFailures: 0,
        lastSuccessAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("providerHealth", {
        provider: args.provider,
        status: "healthy",
        failureCount: 0,
        consecutiveFailures: 0,
        lastSuccessAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const recordFailure = internalMutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("providerHealth")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .unique();

    if (existing) {
      const consecutiveFailures = existing.consecutiveFailures + 1;
      const status =
        consecutiveFailures >= PROVIDER_CIRCUIT_BREAKER_THRESHOLD
          ? "down"
          : "degraded";
      await ctx.db.patch(existing._id, {
        status,
        failureCount: existing.failureCount + 1,
        consecutiveFailures,
        lastFailureAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("providerHealth", {
        provider: args.provider,
        status: "degraded",
        failureCount: 1,
        consecutiveFailures: 1,
        lastFailureAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const listAll = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      provider: v.string(),
      status: providerStatusValidator,
      failureCount: v.number(),
      consecutiveFailures: v.number(),
      lastSuccessAt: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("providerHealth").take(20);
    return rows.map((r) => ({
      provider: r.provider,
      status: r.status,
      failureCount: r.failureCount,
      consecutiveFailures: r.consecutiveFailures,
      lastSuccessAt: r.lastSuccessAt,
      lastFailureAt: r.lastFailureAt,
    }));
  },
});

export { PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS };
