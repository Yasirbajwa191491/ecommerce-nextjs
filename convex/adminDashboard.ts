import { query } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { getLowStockThresholdValue } from "./lib/settingsHelpers";
import { isProductActive } from "./lib/productActive";
import {
  aggregateTopCategories,
  aggregateTopProducts,
  computeKpis,
  computeOrderStatusBreakdown,
  computePaymentMethodBreakdown,
  computePaymentStatusBreakdown,
  computeRecentOrders,
  computeTrendSeries,
  dashboardRangeArgs,
  fetchActivityFeed,
  fetchOrdersInRange,
} from "./lib/dashboardAggregates";
import {
  buildTrendBuckets,
  resolveBucketGranularity,
  resolveDashboardRange,
  resolvePreviousPeriod,
} from "./lib/dashboardRange";

const rangeArgs = dashboardRangeArgs;

export const getKpis = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const previousRange = resolvePreviousPeriod(currentRange);

    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrdersInRange(ctx, currentRange),
      fetchOrdersInRange(ctx, previousRange),
    ]);

    return computeKpis(currentOrders, previousOrders);
  },
});

export const getTrends = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const orders = await fetchOrdersInRange(ctx, currentRange);
    const granularity = resolveBucketGranularity(args.range, currentRange);
    const buckets = buildTrendBuckets(currentRange, granularity);

    const currency =
      orders.find((o) => o.paymentStatus === "paid")?.currency ?? "USD";

    return {
      currency,
      granularity,
      revenueSeries: computeTrendSeries(orders, buckets, "revenue"),
      ordersSeries: computeTrendSeries(orders, buckets, "orders"),
    };
  },
});

export const getBreakdowns = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const orders = await fetchOrdersInRange(ctx, currentRange);

    return {
      orderStatus: computeOrderStatusBreakdown(orders),
      paymentMethod: computePaymentMethodBreakdown(orders),
      paymentStatus: computePaymentStatusBreakdown(orders),
    };
  },
});

export const getTopProducts = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const orders = await fetchOrdersInRange(ctx, currentRange);
    const products = await aggregateTopProducts(ctx, orders, 10);
    const currency =
      orders.find((o) => o.paymentStatus === "paid")?.currency ?? "USD";
    return { currency, products };
  },
});

export const getTopCategories = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const orders = await fetchOrdersInRange(ctx, currentRange);
    const categories = await aggregateTopCategories(ctx, orders, 10);
    const currency =
      orders.find((o) => o.paymentStatus === "paid")?.currency ?? "USD";
    return { currency, categories };
  },
});

export const getRecentOrders = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    const orders = await fetchOrdersInRange(ctx, currentRange);
    return computeRecentOrders(orders, 10);
  },
});

export const getLowStock = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const threshold = await getLowStockThresholdValue(ctx);
    const products = await ctx.db.query("products").collect();

    const lowStock = products
      .filter((p) => isProductActive(p) && p.stock <= threshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 20)
      .map((p) => ({
        productId: p._id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        status: p.stock === 0 ? ("out_of_stock" as const) : ("low_stock" as const),
      }));

    return { threshold, products: lowStock };
  },
});

export const getActivity = query({
  args: rangeArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const currentRange = resolveDashboardRange(
      args.range,
      args.dateFrom,
      args.dateTo
    );
    return await fetchActivityFeed(ctx, currentRange, 15);
  },
});
