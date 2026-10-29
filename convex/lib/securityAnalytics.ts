import type { MutationCtx } from "../_generated/server";
import { tokenHash } from "./capabilities";
export type AnalyticsSource = "products" | "productCategories" | "orders" | "subscribers" | "emailCampaigns" | "emailTemplates" | "emailCampaignRecipients";
export function contribution(table: AnalyticsSource, doc: Record<string, unknown> | null): Record<string, number> {
 if (!doc) return {};
 switch (table) {
  case "products": return { productsAvailable: doc.active !== false ? 1 : 0 };
  case "productCategories": return { productCategories: doc.active === true ? 1 : 0 };
  case "orders": return { ordersProcessed: ["expired", "failed"].includes(String(doc.status)) ? 0 : 1 };
  case "subscribers": return { totalSubscribers: doc.active === true ? 1 : 0 };
  case "emailCampaigns": return { totalCampaignsSent: doc.status === "sent" ? 1 : 0 };
  case "emailTemplates": return { totalTemplates: 1 };
  case "emailCampaignRecipients": return { totalSent: ["sent", "delivered"].includes(String(doc.status)) ? 1 : 0,
    totalOpened: doc.openedAt !== undefined ? 1 : 0, totalClicked: doc.clickedAt !== undefined ? 1 : 0,
    ...(typeof doc.sentAt === "number" ? { [`sent:${new Date(doc.sentAt).toISOString().slice(0, 10)}`]: 1 } : {}) };
 }
}
export async function updateContribution(ctx: MutationCtx, table: AnalyticsSource, id: string, doc: Record<string, unknown> | null) {
 const key = "security-analytics", sourceId = `${table}:${id}`;
 const existing = await ctx.db.query("aggregateContributions").withIndex("by_key_source", q => q.eq("key", key).eq("sourceId", sourceId)).unique();
 const previous = JSON.parse(existing?.countsJson ?? "{}") as Record<string, number>, next = contribution(table, doc);
 const groupKey = table === "orders" && next.ordersProcessed && typeof doc?.customerEmail === "string" ? `customer:${await tokenHash(doc.customerEmail.toLowerCase())}` : undefined;
 let customerDelta = 0;
 for (const [group, delta] of [[existing?.groupKey, -1], [groupKey, 1]] as const) {
  if (!group || existing?.groupKey === groupKey) continue;
  const row = await ctx.db.query("aggregateGroups").withIndex("by_key", q => q.eq("key", group)).unique();
  const old = row?.count ?? 0, count = old + delta;
  if (old === 0 && count > 0) customerDelta++;
  if (old > 0 && count === 0) customerDelta--;
  if (row) await ctx.db.patch(row._id, { count }); else await ctx.db.insert("aggregateGroups", { key: group, count });
 }
 const aggregate = await ctx.db.query("maintainedAggregates").withIndex("by_key", q => q.eq("key", key)).unique();
 const counts = JSON.parse(aggregate?.countsJson ?? "{}") as Record<string, number>;
 for (const field of new Set([...Object.keys(previous), ...Object.keys(next)])) counts[field] = (counts[field] ?? 0) + (next[field] ?? 0) - (previous[field] ?? 0);
 counts.happyCustomers = (counts.happyCustomers ?? 0) + customerDelta;
 if (aggregate) await ctx.db.patch(aggregate._id, { countsJson: JSON.stringify(counts), updatedAt: Date.now() });
 else await ctx.db.insert("maintainedAggregates", { key, countsJson: JSON.stringify(counts), ready: false, updatedAt: Date.now() });
 if (existing) await ctx.db.patch(existing._id, { countsJson: JSON.stringify(next), groupKey });
 else await ctx.db.insert("aggregateContributions", { key, sourceId, countsJson: JSON.stringify(next), groupKey });
}
