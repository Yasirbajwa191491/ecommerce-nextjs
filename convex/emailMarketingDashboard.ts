import { query } from "./server";
import { requireAdmin } from "./lib/requireAdmin";
export const getKpis = query({ args: {}, handler: async ctx => {
 await requireAdmin(ctx);
 const row = await ctx.db.query("maintainedAggregates").withIndex("by_key", q => q.eq("key", "security-analytics")).unique();
 if (!row?.ready) throw new Error("Analytics initialization is in progress");
 const c = JSON.parse(row.countsJson) as Record<string, number>;
 return { totalSubscribers: c.totalSubscribers ?? 0, totalCampaignsSent: c.totalCampaignsSent ?? 0,
 emailsSentToday: c[`sent:${new Date().toISOString().slice(0, 10)}`] ?? 0, totalTemplates: c.totalTemplates ?? 0,
 averageOpenRate: c.totalSent ? (c.totalOpened ?? 0) / c.totalSent * 100 : null,
 averageClickRate: c.totalSent ? (c.totalClicked ?? 0) / c.totalSent * 100 : null };
} });
