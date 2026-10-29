import { internalMutation } from "./server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { adjustRecommendationCounts } from "./lib/maintainedAggregates";
import type { Doc } from "./_generated/dataModel";
async function analyticsDelta(ctx: MutationCtx, event: Pick<Doc<"recommendationEvents">, "sectionType" | "source" | "occurredAt">, conversions: number, revenue: number) {
 const date = new Date(event.occurredAt).toISOString().slice(0, 10), source = event.source ?? "personalized";
 const row = await ctx.db.query("recommendationAnalytics").withIndex("by_date_section", q => q.eq("date", date).eq("sectionType", event.sectionType)).filter(q => q.eq(q.field("source"), source)).first();
 if (row) await ctx.db.patch(row._id, { conversions: row.conversions + conversions, revenue: row.revenue + revenue, updatedAt: Date.now() });
 else await ctx.db.insert("recommendationAnalytics", { date, sectionType: event.sectionType, source, impressions: 0, clicks: 0, conversions, revenue, n8nUsed: false, updatedAt: Date.now() });
 if (conversions) await adjustRecommendationCounts(ctx, { totalConversions: conversions });
}
/** Attribution requires a verified customer's prior click and an authoritative paid line.
 * Refund policy: retain historical conversion count; reverse attributed revenue once.
 */
export const reconcileOrder = internalMutation({
 args: { orderId: v.id("orders"), cursor: v.optional(v.union(v.string(), v.null())) },
 handler: async (ctx, args) => {
  const order = await ctx.db.get(args.orderId); if (!order) return;
  if (order.paymentStatus === "refunded" || order.status === "refunded") {
   const page = await ctx.db.query("recommendationEvents").withIndex("by_order", q => q.eq("orderId", args.orderId)).paginate({ cursor: args.cursor ?? null, numItems: 40 });
   for (const event of page.page) { if (!event.revenue) continue; await analyticsDelta(ctx, event, 0, -event.revenue); await ctx.db.patch(event._id, { revenue: 0 }); }
   if (!page.isDone) await ctx.scheduler.runAfter(0, internal.recommendationAttribution.reconcileOrder, { orderId: args.orderId, cursor: page.continueCursor });
   return;
  }
  if (order.paymentStatus !== "paid" || ["cancelled", "failed", "expired"].includes(order.status)) return;
  const page = await ctx.db.query("orderItems").withIndex("by_order_id", q => q.eq("orderId", args.orderId)).paginate({ cursor: args.cursor ?? null, numItems: 40 });
  const paidAt = order.paidAt ?? order.createdAt;
  for (const item of page.page) {
   if (item.isPromotionGift) continue;
   const ledger = await ctx.db.query("aggregateContributions").withIndex("by_key_source", q => q.eq("key", "paid-recommendation-lines").eq("sourceId", item._id)).unique();
   if (ledger) continue;
   const click = await ctx.db.query("recommendationEvents").withIndex("by_customer_product", q => q.eq("customerKey", order.customerEmail.trim().toLowerCase()).eq("productId", item.productId).eq("eventType", "click").gte("occurredAt", paidAt - 7 * 86400000).lte("occurredAt", paidAt)).order("desc").first();
   if (!click) continue;
   const sourceKey = `paid:${args.orderId}:${item.productId}`;
   const previous = await ctx.db.query("recommendationEvents").withIndex("by_source_key", q => q.eq("sourceKey", sourceKey)).unique();
   const event = { eventType: "conversion" as const, sectionType: click.sectionType, source: click.source, productId: item.productId, orderId: args.orderId, sourceKey, occurredAt: paidAt, revenue: item.lineTotal };
   if (previous) await ctx.db.patch(previous._id, { revenue: (previous.revenue ?? 0) + item.lineTotal });
   else await ctx.db.insert("recommendationEvents", event);
   await analyticsDelta(ctx, previous ?? event, previous ? 0 : 1, item.lineTotal);
   await ctx.db.insert("aggregateContributions", { key: "paid-recommendation-lines", sourceId: item._id, countsJson: "{}" });
  }
  if (!page.isDone) await ctx.scheduler.runAfter(0, internal.recommendationAttribution.reconcileOrder, { orderId: args.orderId, cursor: page.continueCursor });
 },
});
