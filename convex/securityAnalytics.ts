import { internalMutation } from "./server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { updateContribution } from "./lib/securityAnalytics";
const tables = ["products", "productCategories", "orders", "subscribers", "emailCampaigns", "emailTemplates", "emailCampaignRecipients"] as const;
export const backfill = internalMutation({
 args: { tableIndex: v.optional(v.number()), cursor: v.optional(v.union(v.string(), v.null())) },
 handler: async (ctx, args) => {
  const index = args.tableIndex ?? 0;
  if (index === 0 && !args.cursor) {
    const row = await ctx.db.query("maintainedAggregates").withIndex("by_key", q => q.eq("key", "security-analytics")).unique();
    if (!row) await ctx.db.insert("maintainedAggregates", { key: "security-analytics", countsJson: "{}", ready: false, updatedAt: Date.now() });
  }
  const table = tables[index]; if (!table) return;
  const page = await ctx.db.query(table).paginate({ numItems: 40, cursor: args.cursor ?? null });
  for (const doc of page.page) await updateContribution(ctx, table, doc._id, doc);
  if (!page.isDone) await ctx.scheduler.runAfter(0, internal.securityAnalytics.backfill, { tableIndex: index, cursor: page.continueCursor });
  else if (index < tables.length - 1) await ctx.scheduler.runAfter(0, internal.securityAnalytics.backfill, { tableIndex: index + 1 });
  else { const row = await ctx.db.query("maintainedAggregates").withIndex("by_key", q => q.eq("key", "security-analytics")).unique(); if (row) await ctx.db.patch(row._id, { ready: true }); }
 },
});
