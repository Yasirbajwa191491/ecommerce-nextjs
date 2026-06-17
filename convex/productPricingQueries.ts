import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  aggregateTopProducts,
  fetchOrdersInRange,
} from "./lib/dashboardAggregates";
import {
  resolveDashboardRange,
  resolvePreviousPeriod,
} from "./lib/dashboardRange";
import { isProductActive } from "./lib/productActive";

export const getProductPricingSignals = internalQuery({
  args: {
    productId: v.optional(v.id("products")),
    categoryId: v.optional(v.id("productCategories")),
    referenceNow: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const currentRange = resolveDashboardRange(
      "month",
      undefined,
      undefined,
      args.referenceNow
    );
    const previousRange = resolvePreviousPeriod(currentRange);
    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrdersInRange(ctx, currentRange),
      fetchOrdersInRange(ctx, previousRange),
    ]);

    let product = null;
    if (args.productId) {
      product = await ctx.db.get(args.productId);
    }

    const categoryId = product?.categoryId ?? args.categoryId;
    const allProducts = await ctx.db.query("products").collect();
    const activeProducts = allProducts.filter(isProductActive);
    const categoryPeers = categoryId
      ? activeProducts.filter(
          (p) =>
            p.categoryId === categoryId &&
            (!args.productId || p._id !== args.productId)
        )
      : [];

    const peerPrices = categoryPeers.map((p) => p.price).sort((a, b) => a - b);

    let salesData = null;
    if (args.productId) {
      const [currentTop, previousTop] = await Promise.all([
        aggregateTopProducts(ctx, currentOrders, 50),
        aggregateTopProducts(ctx, previousOrders, 50),
      ]);
      const current = currentTop.find((p) => p.productId === args.productId);
      const previous = previousTop.find((p) => p.productId === args.productId);
      const previousUnits = previous?.unitsSold ?? 0;
      salesData = {
        unitsSold: current?.unitsSold ?? 0,
        revenue: current?.revenue ?? 0,
        orderCount: current?.orderCount ?? 0,
        previousUnitsSold: previousUnits,
        unitsGrowthPercent:
          previousUnits > 0
            ? ((current?.unitsSold ?? 0) - previousUnits) / previousUnits
            : (current?.unitsSold ?? 0) > 0
              ? 1
              : 0,
      };
    }

    let reviewInsights = null;
    if (args.productId) {
      const insights = await ctx.db
        .query("productReviewInsights")
        .withIndex("by_product", (q) => q.eq("productId", args.productId!))
        .unique();
      if (insights) {
        reviewInsights = {
          summary: insights.summary,
          topics: insights.topics.map((t) => t.name),
          reviewCount: insights.reviewCountAtGeneration,
        };
      }
    }

    let categoryName = "";
    if (categoryId) {
      const category = await ctx.db.get(categoryId);
      categoryName = category?.name ?? "";
    }

    return {
      product: product
        ? {
            _id: product._id,
            name: product.name,
            price: product.price,
            currency: product.currency ?? "USD",
            discountPercent: product.discountPercent ?? 0,
            stock: product.stock,
            stars: product.stars,
            reviews: product.reviews,
            featured: product.featured,
            description: product.description,
            highlights: product.highlights ?? [],
          }
        : null,
      salesData,
      reviewInsights,
      categoryName,
      peerPrices: peerPrices.slice(0, 10),
      peerPriceStats:
        peerPrices.length > 0
          ? {
              min: peerPrices[0]!,
              max: peerPrices[peerPrices.length - 1]!,
              median:
                peerPrices[Math.floor(peerPrices.length / 2)] ?? peerPrices[0]!,
              count: peerPrices.length,
            }
          : null,
      hasSalesHistory: (salesData?.unitsSold ?? 0) > 0,
    };
  },
});
