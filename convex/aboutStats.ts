import { query } from "./server";
export const getPublicStats = query({ args: {}, handler: async ctx => {
 const row = await ctx.db.query("maintainedAggregates").withIndex("by_key", q => q.eq("key", "security-analytics")).unique();
 if (!row?.ready) return null;
 const counts = JSON.parse(row.countsJson) as Record<string, number>;
 return { productsAvailable: counts.productsAvailable ?? 0, ordersProcessed: counts.ordersProcessed ?? 0,
 happyCustomers: counts.happyCustomers ?? 0, productCategories: counts.productCategories ?? 0 };
} });
