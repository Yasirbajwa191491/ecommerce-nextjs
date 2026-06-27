import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const recordMetric = internalMutation({
  args: {
    provider: v.string(),
    type: v.string(),
    success: v.boolean(),
    isFallback: v.optional(v.boolean()),
    durationMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const date = todayKey();
    const existing = await ctx.db
      .query("reviewAiMetrics")
      .withIndex("by_date_provider_type", (q) =>
        q.eq("date", date).eq("provider", args.provider).eq("type", args.type)
      )
      .unique();

    const duration = args.durationMs ?? 0;

    if (existing) {
      await ctx.db.patch(existing._id, {
        successCount: existing.successCount + (args.success ? 1 : 0),
        failureCount: existing.failureCount + (args.success ? 0 : 1),
        fallbackCount:
          existing.fallbackCount + (args.isFallback && args.success ? 1 : 0),
        totalDurationMs: existing.totalDurationMs + duration,
        sampleCount: existing.sampleCount + 1,
      });
    } else {
      await ctx.db.insert("reviewAiMetrics", {
        date,
        provider: args.provider,
        type: args.type,
        successCount: args.success ? 1 : 0,
        failureCount: args.success ? 0 : 1,
        fallbackCount: args.isFallback && args.success ? 1 : 0,
        totalDurationMs: duration,
        sampleCount: 1,
      });
    }

    return null;
  },
});

export const getAggregatedMetrics = internalQuery({
  args: { days: v.optional(v.number()) },
  returns: v.object({
    totalGenerations: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    fallbackActivations: v.number(),
    avgDurationMs: v.number(),
    byProvider: v.array(
      v.object({
        provider: v.string(),
        count: v.number(),
        successCount: v.number(),
        failureCount: v.number(),
      })
    ),
    geminiFailures: v.number(),
  }),
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const rows = await ctx.db.query("reviewAiMetrics").take(5000);
    const recent = rows.filter((r) => r.date >= cutoffKey);

    let totalGenerations = 0;
    let successCount = 0;
    let failureCount = 0;
    let fallbackActivations = 0;
    let totalDurationMs = 0;
    let sampleCount = 0;
    let geminiFailures = 0;

    const providerMap = new Map<
      string,
      { count: number; successCount: number; failureCount: number }
    >();

    for (const row of recent) {
      const rowTotal = row.successCount + row.failureCount;
      totalGenerations += rowTotal;
      successCount += row.successCount;
      failureCount += row.failureCount;
      fallbackActivations += row.fallbackCount;
      totalDurationMs += row.totalDurationMs;
      sampleCount += row.sampleCount;

      if (row.provider === "gemini") {
        geminiFailures += row.failureCount;
      }

      const existing = providerMap.get(row.provider) ?? {
        count: 0,
        successCount: 0,
        failureCount: 0,
      };
      existing.count += rowTotal;
      existing.successCount += row.successCount;
      existing.failureCount += row.failureCount;
      providerMap.set(row.provider, existing);
    }

    const byProvider = [...providerMap.entries()].map(([provider, stats]) => ({
      provider,
      ...stats,
    }));

    return {
      totalGenerations,
      successCount,
      failureCount,
      fallbackActivations,
      avgDurationMs: sampleCount > 0 ? Math.round(totalDurationMs / sampleCount) : 0,
      byProvider,
      geminiFailures,
    };
  },
});
