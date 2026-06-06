import { query } from "./_generated/server";
import { isProductActive } from "./lib/productActive";

const EXCLUDED_ORDER_STATUSES = new Set(["expired", "failed"]);

export const getPublicStats = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const productsAvailable = products.filter(isProductActive).length;

    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const productCategories = categories.length;

    const orders = await ctx.db.query("orders").collect();
    const processedOrders = orders.filter(
      (order) => !EXCLUDED_ORDER_STATUSES.has(order.status)
    );
    const ordersProcessed = processedOrders.length;

    const customerEmails = new Set(
      processedOrders.map((order) => order.customerEmail.toLowerCase())
    );

    return {
      productsAvailable,
      ordersProcessed,
      happyCustomers: customerEmails.size,
      productCategories,
    };
  },
});
