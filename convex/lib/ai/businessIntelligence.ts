import type { QueryCtx } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import {
  aggregateTopCategories,
  aggregateTopProducts,
  computeKpis,
  computeOrderStatusBreakdown,
  computePaymentMethodBreakdown,
  computePaymentStatusBreakdown,
  computeRecentOrders,
  computeTrendSeries,
  fetchOrdersInRange,
} from "../dashboardAggregates";
import {
  buildTrendBuckets,
  resolveBucketGranularity,
  resolveDashboardRange,
  resolvePreviousPeriod,
  type DateRange,
} from "../dashboardRange";
import { computeReviewAnalytics } from "../reviewAggregates";
import { getLowStockThresholdValue } from "../settingsHelpers";
import { isProductActive } from "../productActive";
import { calculateFinalPrice } from "../pricing";
import { BEHAVIORAL_SEGMENT_KEYS } from "../emailSegments";
import type { CopilotIntent } from "./copilotTypes";

const PRODUCT_LIMIT = 10;
const REVIEW_SAMPLE_LIMIT = 20;
const SEARCH_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function weekRange(referenceNow: number): DateRange {
  return resolveDashboardRange("week", undefined, undefined, referenceNow);
}

function monthRange(referenceNow: number): DateRange {
  return resolveDashboardRange("month", undefined, undefined, referenceNow);
}

function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

async function getProductSalesByPeriod(
  ctx: QueryCtx,
  currentRange: DateRange,
  previousRange: DateRange,
  limit = PRODUCT_LIMIT
) {
  const [currentOrders, previousOrders] = await Promise.all([
    fetchOrdersInRange(ctx, currentRange),
    fetchOrdersInRange(ctx, previousRange),
  ]);

  const [currentProducts, previousProducts] = await Promise.all([
    aggregateTopProducts(ctx, currentOrders, 50),
    aggregateTopProducts(ctx, previousOrders, 50),
  ]);

  const previousById = new Map(
    previousProducts.map((p) => [p.productId, p])
  );

  const enriched = currentProducts.map((current) => {
    const previous = previousById.get(current.productId);
    const previousRevenue = previous?.revenue ?? 0;
    const previousUnits = previous?.unitsSold ?? 0;
    return {
      productId: current.productId,
      productName: current.productName,
      sku: current.sku,
      unitsSold: current.unitsSold,
      revenue: current.revenue,
      orderCount: current.orderCount,
      previousUnitsSold: previousUnits,
      previousRevenue,
      revenueGrowthPercent: growthPercent(current.revenue, previousRevenue),
      unitsGrowthPercent: growthPercent(current.unitsSold, previousUnits),
    };
  });

  return {
    currentRange,
    previousRange,
    products: enriched.slice(0, limit),
    allCurrentProducts: enriched,
  };
}

export async function getRevenueStats(ctx: QueryCtx, referenceNow: number) {
  const currentRange = monthRange(referenceNow);
  const previousRange = resolvePreviousPeriod(currentRange);
  const [currentOrders, previousOrders] = await Promise.all([
    fetchOrdersInRange(ctx, currentRange),
    fetchOrdersInRange(ctx, previousRange),
  ]);
  const kpis = computeKpis(currentOrders, previousOrders);

  const weekCurrent = weekRange(referenceNow);
  const weekOrders = await fetchOrdersInRange(ctx, weekCurrent);
  const paidWeekOrders = weekOrders.filter((o) => o.paymentStatus === "paid");

  let bestDay: { date: string; revenue: number } | null = null;
  const dayRevenue = new Map<string, number>();
  for (const order of paidWeekOrders) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    dayRevenue.set(key, (dayRevenue.get(key) ?? 0) + order.total);
  }
  for (const [date, revenue] of dayRevenue.entries()) {
    if (!bestDay || revenue > bestDay.revenue) {
      bestDay = { date, revenue };
    }
  }

  return {
    period: "month",
    currency: kpis.currency,
    totalRevenue: kpis.totalRevenue,
    totalOrders: kpis.totalOrders,
    paidOrders: kpis.paidOrders,
    averageOrderValue: kpis.averageOrderValue,
    totalCustomers: kpis.totalCustomers,
    bestSalesDayThisWeek: bestDay,
  };
}

export async function getSalesTrends(ctx: QueryCtx, referenceNow: number) {
  const currentRange = monthRange(referenceNow);
  const orders = await fetchOrdersInRange(ctx, currentRange);
  const granularity = resolveBucketGranularity("month", currentRange);
  const buckets = buildTrendBuckets(currentRange, granularity);
  const currency =
    orders.find((o) => o.paymentStatus === "paid")?.currency ?? "USD";

  return {
    currency,
    granularity,
    revenueSeries: computeTrendSeries(orders, buckets, "revenue"),
    ordersSeries: computeTrendSeries(orders, buckets, "orders"),
  };
}

export async function getTopSellingProducts(
  ctx: QueryCtx,
  referenceNow: number
) {
  const weekSales = await getProductSalesByPeriod(
    ctx,
    weekRange(referenceNow),
    resolvePreviousPeriod(weekRange(referenceNow)),
    PRODUCT_LIMIT
  );
  const monthSales = await getProductSalesByPeriod(
    ctx,
    monthRange(referenceNow),
    resolvePreviousPeriod(monthRange(referenceNow)),
    PRODUCT_LIMIT
  );

  const primaryProducts =
    weekSales.products.length > 0 ? weekSales.products : monthSales.products;
  const primaryPeriod = weekSales.products.length > 0 ? "week" : "month";

  const topByUnits = [...primaryProducts].sort(
    (a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue
  );
  const topByRevenue = [...primaryProducts].sort(
    (a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold
  );

  return {
    primaryPeriod,
    topProductsThisWeek: weekSales.products,
    topProductsThisMonth: monthSales.products,
    mostSellingByUnits: topByUnits[0] ?? null,
    mostSellingByRevenue: topByRevenue[0] ?? null,
    topProducts: topByUnits.slice(0, PRODUCT_LIMIT),
  };
}

export async function getTrendingProducts(ctx: QueryCtx, referenceNow: number) {
  const topSelling = await getTopSellingProducts(ctx, referenceNow);
  const currentRange = weekRange(referenceNow);
  const previousRange = resolvePreviousPeriod(currentRange);
  const sales = await getProductSalesByPeriod(
    ctx,
    currentRange,
    previousRange,
    PRODUCT_LIMIT
  );

  const productSource =
    sales.allCurrentProducts.length > 0
      ? sales.allCurrentProducts
      : topSelling.topProductsThisMonth;

  const since = referenceNow - SEARCH_PERIOD_MS;
  const searchEvents = await ctx.db
    .query("searchQueryEvents")
    .withIndex("by_searched_at", (q) => q.gte("searchedAt", since))
    .collect();

  const searchCounts = new Map<string, number>();
  for (const event of searchEvents) {
    searchCounts.set(
      event.queryNormalized,
      (searchCounts.get(event.queryNormalized) ?? 0) + 1
    );
  }

  const trending = [...productSource]
    .map((product) => {
      const searchMentions = [...searchCounts.entries()].filter(([query]) =>
        query.includes(product.productName.toLowerCase().slice(0, 12))
      ).length;

      const growthScore =
        (product.revenueGrowthPercent ?? 0) * 0.5 +
        (product.unitsGrowthPercent ?? 0) * 0.3 +
        searchMentions * 5;

      return {
        ...product,
        searchMentions,
        trendScore: growthScore,
        signals: [
          product.revenueGrowthPercent !== null &&
          product.revenueGrowthPercent > 0
            ? `Revenue up ${product.revenueGrowthPercent.toFixed(1)}%`
            : null,
          product.unitsGrowthPercent !== null && product.unitsGrowthPercent > 0
            ? `Units up ${product.unitsGrowthPercent.toFixed(1)}%`
            : null,
          searchMentions > 0 ? `${searchMentions} related searches` : null,
        ].filter((s): s is string => Boolean(s)),
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, PRODUCT_LIMIT);

  return {
    period: topSelling.primaryPeriod,
    topSelling,
    products: trending.length > 0 ? trending : topSelling.topProducts,
  };
}

export async function getLowPerformingProducts(
  ctx: QueryCtx,
  referenceNow: number
) {
  const currentRange = weekRange(referenceNow);
  const previousRange = resolvePreviousPeriod(currentRange);
  const sales = await getProductSalesByPeriod(
    ctx,
    currentRange,
    previousRange,
    50
  );

  const declining = sales.allCurrentProducts
    .filter(
      (p) =>
        (p.revenueGrowthPercent !== null && p.revenueGrowthPercent < -10) ||
        (p.previousUnitsSold > 0 &&
          p.unitsSold < p.previousUnitsSold * 0.7)
    )
    .sort(
      (a, b) =>
        (a.revenueGrowthPercent ?? 0) - (b.revenueGrowthPercent ?? 0)
    )
    .slice(0, PRODUCT_LIMIT);

  return {
    period: "week",
    products: declining,
  };
}

function mapStockProduct(
  product: Doc<"products">,
  categoryName?: string
) {
  return {
    productId: product._id,
    name: product.name,
    sku: product.sku,
    stock: product.stock,
    price: product.price,
    currency: product.currency ?? "USD",
    categoryName: categoryName ?? "Unknown",
    stars: product.stars,
    reviews: product.reviews,
    featured: product.featured,
  };
}

async function loadActiveProductsWithCategories(ctx: QueryCtx) {
  const [products, categories] = await Promise.all([
    ctx.db.query("products").collect(),
    ctx.db.query("productCategories").collect(),
  ]);
  const categoryMap = new Map(categories.map((c) => [c._id, c]));
  const activeProducts = products.filter(isProductActive);

  return {
    products,
    categories,
    activeProducts,
    categoryMap,
  };
}

function summarizeOrders(orders: Doc<"orders">[]) {
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  return {
    total: orders.length,
    paidCount: paidOrders.length,
    totalRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
    currency: paidOrders[0]?.currency ?? orders[0]?.currency ?? "USD",
    statusBreakdown: computeOrderStatusBreakdown(orders),
    paymentStatusBreakdown: computePaymentStatusBreakdown(orders),
    paymentMethodBreakdown: computePaymentMethodBreakdown(orders),
    recentOrders: computeRecentOrders(orders, 8),
  };
}

export async function getInventoryInsights(
  ctx: QueryCtx,
  referenceNow: number
) {
  const threshold = await getLowStockThresholdValue(ctx);
  const { activeProducts, categoryMap } =
    await loadActiveProductsWithCategories(ctx);

  const stockSorted = [...activeProducts].sort((a, b) => b.stock - a.stock);
  const highestStockProducts = stockSorted
    .slice(0, PRODUCT_LIMIT)
    .map((p) =>
      mapStockProduct(p, categoryMap.get(p.categoryId)?.name)
    );

  const lowStock = activeProducts
    .filter((p) => p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, PRODUCT_LIMIT)
    .map((p) => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      status: p.stock === 0 ? ("out_of_stock" as const) : ("low_stock" as const),
    }));

  const monthOrders = await fetchOrdersInRange(
    ctx,
    resolveDashboardRange("month", undefined, undefined, referenceNow)
  );
  const salesByProduct = await aggregateTopProducts(ctx, monthOrders, 50);
  const salesMap = new Map(
    salesByProduct.map((p) => [p.productId, p.unitsSold])
  );

  const reorderCandidates = activeProducts
    .map((p) => {
      const monthlyUnits = salesMap.get(p._id) ?? 0;
      const dailyVelocity = monthlyUnits / 30;
      const daysOfCover =
        dailyVelocity > 0 ? p.stock / dailyVelocity : p.stock > 0 ? 999 : 0;
      return {
        productId: p._id,
        name: p.name,
        stock: p.stock,
        monthlyUnitsSold: monthlyUnits,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        daysOfCover: Number(daysOfCover.toFixed(1)),
        reorderPriority:
          p.stock === 0
            ? "critical"
            : daysOfCover < 7
              ? "high"
              : daysOfCover < 14
                ? "medium"
                : "low",
      };
    })
    .filter((p) => p.reorderPriority !== "low")
    .sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        priority[a.reorderPriority as keyof typeof priority] -
        priority[b.reorderPriority as keyof typeof priority]
      );
    })
    .slice(0, PRODUCT_LIMIT);

  const totalStockUnits = activeProducts.reduce((sum, p) => sum + p.stock, 0);
  const outOfStockCount = activeProducts.filter((p) => p.stock === 0).length;

  return {
    threshold,
    stockSummary: {
      activeProductCount: activeProducts.length,
      totalStockUnits,
      averageStock:
        activeProducts.length > 0
          ? Number((totalStockUnits / activeProducts.length).toFixed(1))
          : 0,
      outOfStockCount,
      lowStockCount: lowStock.length,
      highestStockLevel: highestStockProducts[0]?.stock ?? 0,
    },
    highestStockProducts,
    lowStock,
    reorderCandidates,
  };
}

export async function getProductCatalogInsights(ctx: QueryCtx) {
  const { products, categories, activeProducts, categoryMap } =
    await loadActiveProductsWithCategories(ctx);

  const stockSorted = [...activeProducts].sort((a, b) => b.stock - a.stock);
  const highestStockProducts = stockSorted
    .slice(0, PRODUCT_LIMIT)
    .map((p) =>
      mapStockProduct(p, categoryMap.get(p.categoryId)?.name)
    );
  const lowestStockProducts = [...activeProducts]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, PRODUCT_LIMIT)
    .map((p) =>
      mapStockProduct(p, categoryMap.get(p.categoryId)?.name)
    );

  const featuredProducts = activeProducts
    .filter((p) => p.featured)
    .slice(0, PRODUCT_LIMIT)
    .map((p) =>
      mapStockProduct(p, categoryMap.get(p.categoryId)?.name)
    );

  const productsByCategory = categories
    .map((category) => {
      const categoryProducts = activeProducts.filter(
        (p) => p.categoryId === category._id
      );
      const totalStock = categoryProducts.reduce((sum, p) => sum + p.stock, 0);
      return {
        categoryId: category._id,
        categoryName: category.name,
        active: category.active,
        productCount: categoryProducts.length,
        totalStock,
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  const prices = activeProducts.map((p) =>
    calculateFinalPrice(p.price, p.discountPercent ?? 0)
  );
  const totalStockUnits = activeProducts.reduce((sum, p) => sum + p.stock, 0);

  return {
    summary: {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      inactiveProducts: products.length - activeProducts.length,
      featuredCount: activeProducts.filter((p) => p.featured).length,
      totalStockUnits,
      averageStock:
        activeProducts.length > 0
          ? Number((totalStockUnits / activeProducts.length).toFixed(1))
          : 0,
      outOfStockCount: activeProducts.filter((p) => p.stock === 0).length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
    },
    highestStockProducts,
    lowestStockProducts,
    featuredProducts,
    productsByCategory,
  };
}

export async function getOrderInsights(ctx: QueryCtx, referenceNow: number) {
  const [monthOrders, weekOrders] = await Promise.all([
    fetchOrdersInRange(ctx, monthRange(referenceNow)),
    fetchOrdersInRange(ctx, weekRange(referenceNow)),
  ]);

  return {
    thisMonth: summarizeOrders(monthOrders),
    thisWeek: summarizeOrders(weekOrders),
  };
}

export async function getStoreSnapshot(ctx: QueryCtx, referenceNow: number) {
  const { activeProducts, categories } =
    await loadActiveProductsWithCategories(ctx);
  const monthOrders = await fetchOrdersInRange(ctx, monthRange(referenceNow));

  const stockSorted = [...activeProducts].sort((a, b) => b.stock - a.stock);

  return {
    products: {
      total: activeProducts.length,
      totalStockUnits: activeProducts.reduce((sum, p) => sum + p.stock, 0),
      outOfStock: activeProducts.filter((p) => p.stock === 0).length,
    },
    categories: {
      total: categories.length,
      active: categories.filter((c) => c.active).length,
    },
    orders: {
      thisMonth: monthOrders.length,
      paidThisMonth: monthOrders.filter((o) => o.paymentStatus === "paid")
        .length,
    },
    highestStockProducts: stockSorted.slice(0, 5).map((p) => ({
      name: p.name,
      stock: p.stock,
      sku: p.sku,
    })),
    lowestStockProducts: [...activeProducts]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        stock: p.stock,
        sku: p.sku,
      })),
  };
}

export async function getReviewInsights(ctx: QueryCtx, referenceNow: number) {
  const analytics = await computeReviewAnalytics(ctx);
  const monthStart = resolveDashboardRange(
    "month",
    undefined,
    undefined,
    referenceNow
  ).from;

  const recentReviews = await ctx.db
    .query("productReviews")
    .withIndex("by_approval_created", (q) => q.eq("isApproved", true))
    .order("desc")
    .take(100);

  const monthReviews = recentReviews.filter((r) => r.createdAt >= monthStart);
  const samples = monthReviews.slice(0, REVIEW_SAMPLE_LIMIT).map((r) => ({
    productId: r.productId,
    rating: r.rating,
    title: r.title,
    content: r.content.slice(0, 200),
    sentiment: r.aiSentiment ?? null,
    tags: r.aiTags ?? [],
  }));

  const ratingBreakdown = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: monthReviews.filter((r) => r.rating === rating).length,
  }));

  const tagCounts = new Map<string, number>();
  for (const review of monthReviews) {
    for (const tag of review.aiTags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  return {
    storeAnalytics: analytics,
    monthReviewCount: monthReviews.length,
    averageMonthRating:
      monthReviews.length > 0
        ? monthReviews.reduce((sum, r) => sum + r.rating, 0) /
          monthReviews.length
        : 0,
    ratingBreakdown,
    topTags,
    sampleReviews: samples,
  };
}

export async function getSubscriberInsights(ctx: QueryCtx) {
  const subscribers = await ctx.db
    .query("subscribers")
    .withIndex("by_active_subscribed", (q) => q.eq("active", true))
    .collect();

  const profiles = await ctx.db.query("subscriberInterestProfiles").collect();

  const countByTag = (tag: string) =>
    profiles.filter((s) => s.interestTags.includes(tag)).length;

  return {
    totalActiveSubscribers: subscribers.length,
    segmentCounts: {
      highValue: countByTag(BEHAVIORAL_SEGMENT_KEYS.highValueCustomers),
      repeatBuyers: countByTag(BEHAVIORAL_SEGMENT_KEYS.recentBuyers),
      discountSeekers: profiles.filter((s) =>
        s.interestTags.some((tag) => tag.includes("discount"))
      ).length,
      inactive: countByTag(BEHAVIORAL_SEGMENT_KEYS.inactiveCustomers),
    },
    topInterestTags: [...new Set(profiles.flatMap((p) => p.interestTags))]
      .map((tag) => ({
        tag,
        count: countByTag(tag),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export async function getCampaignInsights(ctx: QueryCtx) {
  const campaigns = await ctx.db.query("emailCampaigns").collect();
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");
  const recipients = await ctx.db.query("emailCampaignRecipients").collect();

  const totalSent = recipients.filter(
    (r) => r.status === "sent" || r.status === "delivered"
  ).length;
  const totalOpened = recipients.filter((r) => r.openedAt !== undefined).length;
  const totalClicked = recipients.filter(
    (r) => r.clickedAt !== undefined
  ).length;

  const recentCampaigns = sentCampaigns
    .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      subject: c.subject,
      sentAt: c.sentAt,
      recipientCount: c.recipientCount,
      openRate:
        c.emailsSent > 0 ? (c.emailsOpened / c.emailsSent) * 100 : null,
      clickRate:
        c.emailsSent > 0 ? (c.emailsClicked / c.emailsSent) * 100 : null,
    }));

  return {
    totalCampaignsSent: sentCampaigns.length,
    totalEmailsSent: totalSent,
    averageOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : null,
    averageClickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : null,
    recentCampaigns,
  };
}

export async function getCategoryPerformance(
  ctx: QueryCtx,
  referenceNow: number
) {
  const currentRange = monthRange(referenceNow);
  const previousRange = resolvePreviousPeriod(currentRange);
  const [currentOrders, previousOrders] = await Promise.all([
    fetchOrdersInRange(ctx, currentRange),
    fetchOrdersInRange(ctx, previousRange),
  ]);

  const [currentCategories, previousCategories] = await Promise.all([
    aggregateTopCategories(ctx, currentOrders, 20),
    aggregateTopCategories(ctx, previousOrders, 20),
  ]);

  const previousMap = new Map(
    previousCategories.map((c) => [c.categoryId, c])
  );

  const categories = currentCategories.map((current) => {
    const previous = previousMap.get(current.categoryId);
    const previousRevenue = previous?.revenue ?? 0;
    return {
      categoryId: current.categoryId,
      categoryName: current.categoryName,
      revenue: current.revenue,
      unitsSold: current.unitsSold,
      previousRevenue,
      revenueGrowthPercent: growthPercent(current.revenue, previousRevenue),
    };
  });

  return {
    period: "month",
    categories: categories.sort(
      (a, b) => (b.revenueGrowthPercent ?? 0) - (a.revenueGrowthPercent ?? 0)
    ),
  };
}

export async function getDiscountPerformance(
  ctx: QueryCtx,
  referenceNow: number
) {
  const products = await ctx.db.query("products").collect();
  const discounted = products
    .filter((p) => isProductActive(p) && (p.discountPercent ?? 0) > 0)
    .map((p) => ({
      productId: p._id,
      name: p.name,
      discountPercent: p.discountPercent ?? 0,
      finalPrice: calculateFinalPrice(p.price, p.discountPercent ?? 0),
      stock: p.stock,
      stars: p.stars,
      reviews: p.reviews,
    }))
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, PRODUCT_LIMIT);

  const monthOrders = await fetchOrdersInRange(
    ctx,
    resolveDashboardRange("month", undefined, undefined, referenceNow)
  );
  const topProducts = await aggregateTopProducts(ctx, monthOrders, 30);
  const productMap = new Map(products.map((p) => [p._id, p]));

  const discountedSales = topProducts
    .filter((p) => (productMap.get(p.productId)?.discountPercent ?? 0) > 0)
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
      discountPercent: productMap.get(p.productId)?.discountPercent ?? 0,
    }));

  return {
    discountedProductCount: discounted.length,
    topDiscountedProducts: discounted,
    discountedSalesPerformance: discountedSales,
  };
}

export async function getSearchInsights(ctx: QueryCtx, referenceNow: number) {
  const since = referenceNow - SEARCH_PERIOD_MS;
  const events = await ctx.db
    .query("searchQueryEvents")
    .withIndex("by_searched_at", (q) => q.gte("searchedAt", since))
    .collect();

  const counts = new Map<
    string,
    { display: string; count: number; zeroResults: number }
  >();

  for (const event of events) {
    const existing = counts.get(event.queryNormalized);
    if (existing) {
      existing.count += 1;
      if (event.resultCount === 0) existing.zeroResults += 1;
    } else {
      counts.set(event.queryNormalized, {
        display: event.queryDisplay,
        count: 1,
        zeroResults: event.resultCount === 0 ? 1 : 0,
      });
    }
  }

  const trending = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, PRODUCT_LIMIT)
    .map((item) => ({
      query: item.display,
      count: item.count,
      zeroResultRate:
        item.count > 0 ? (item.zeroResults / item.count) * 100 : 0,
    }));

  const zeroResultQueries = [...counts.values()]
    .filter((item) => item.zeroResults > 0)
    .sort((a, b) => b.zeroResults - a.zeroResults)
    .slice(0, PRODUCT_LIMIT)
    .map((item) => ({
      query: item.display,
      zeroResults: item.zeroResults,
      totalSearches: item.count,
    }));

  return {
    period: "7d",
    trendingSearches: trending,
    zeroResultQueries,
  };
}

export async function getPromotionCandidates(ctx: QueryCtx, referenceNow: number) {
  const inventory = await getInventoryInsights(ctx, referenceNow);
  const sales = await getProductSalesByPeriod(
    ctx,
    weekRange(referenceNow),
    resolvePreviousPeriod(weekRange(referenceNow)),
    30
  );
  const discounts = await getDiscountPerformance(ctx, referenceNow);

  const products = await ctx.db.query("products").collect();
  const productMap = new Map(products.map((p) => [p._id, p]));

  const candidates = sales.allCurrentProducts
    .map((sale) => {
      const product = productMap.get(sale.productId);
      if (!product || !isProductActive(product)) return null;

      const hasDiscount = (product.discountPercent ?? 0) > 0;
      const highStock = product.stock > 10;
      const goodRating = product.stars >= 4;
      const moderateSales = sale.unitsSold > 0 && sale.unitsSold < 20;

      const score =
        (goodRating ? 2 : 0) +
        (highStock ? 1 : 0) +
        (moderateSales ? 2 : 0) +
        (product.featured ? 1 : 0) +
        (hasDiscount ? -1 : 1);

      return {
        productId: sale.productId,
        name: product.name,
        stars: product.stars,
        reviews: product.reviews,
        stock: product.stock,
        discountPercent: product.discountPercent ?? 0,
        unitsSold: sale.unitsSold,
        revenue: sale.revenue,
        promotionScore: score,
        reasons: [
          goodRating ? "Strong ratings" : null,
          highStock ? "Healthy inventory" : null,
          moderateSales ? "Room to grow sales" : null,
          !hasDiscount ? "No active discount" : null,
        ].filter((r): r is string => Boolean(r)),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.promotionScore - a.promotionScore)
    .slice(0, PRODUCT_LIMIT);

  return {
    candidates,
    existingDiscounts: discounts.topDiscountedProducts.slice(0, 5),
    lowStockCount: inventory.lowStock.length,
  };
}

export async function getProductOpportunities(
  ctx: QueryCtx,
  referenceNow: number
) {
  const search = await getSearchInsights(ctx, referenceNow);
  const sales = await getProductSalesByPeriod(
    ctx,
    weekRange(referenceNow),
    resolvePreviousPeriod(weekRange(referenceNow)),
    30
  );
  const products = await ctx.db.query("products").collect();
  const active = products.filter(isProductActive);
  const salesMap = new Map(
    sales.allCurrentProducts.map((p) => [p.productId, p])
  );

  const highReviewsLowVisibility = active
    .filter((p) => p.reviews >= 5 && p.stars >= 4 && !p.featured)
    .map((p) => ({
      type: "high_reviews_low_visibility" as const,
      productId: p._id,
      name: p.name,
      stars: p.stars,
      reviews: p.reviews,
      featured: p.featured,
    }))
    .slice(0, 5);

  const highSearchLowInventory = active
    .filter((p) => {
      const mentioned = search.trendingSearches.some((s) =>
        s.query.toLowerCase().includes(p.name.toLowerCase().slice(0, 8))
      );
      return mentioned && p.stock < 5;
    })
    .map((p) => ({
      type: "high_search_low_inventory" as const,
      productId: p._id,
      name: p.name,
      stock: p.stock,
    }))
    .slice(0, 5);

  const highVisibilityLowSales = active
    .filter((p) => {
      const sale = salesMap.get(p._id);
      return (
        (p.featured || p.reviews >= 10) &&
        (!sale || sale.unitsSold <= 2)
      );
    })
    .map((p) => ({
      type: "high_visibility_low_sales" as const,
      productId: p._id,
      name: p.name,
      featured: p.featured,
      reviews: p.reviews,
      unitsSold: salesMap.get(p._id)?.unitsSold ?? 0,
    }))
    .slice(0, 5);

  return {
    highReviewsLowVisibility,
    highSearchLowInventory,
    highVisibilityLowSales,
    topZeroResultQueries: search.zeroResultQueries.slice(0, 5),
  };
}

export async function getOverviewSnapshot(
  ctx: QueryCtx,
  referenceNow: number
) {
  const [revenue, topSelling, reviews, subscribers, campaigns] =
    await Promise.all([
      getRevenueStats(ctx, referenceNow),
      getTopSellingProducts(ctx, referenceNow),
      getReviewInsights(ctx, referenceNow),
      getSubscriberInsights(ctx),
      getCampaignInsights(ctx),
    ]);

  return {
    revenue,
    topProductsThisWeek: topSelling.topProductsThisWeek,
    topProductsThisMonth: topSelling.topProductsThisMonth,
    mostSellingProduct:
      topSelling.mostSellingByUnits ?? topSelling.mostSellingByRevenue,
    reviewSummary: {
      totalReviews: reviews.storeAnalytics.totalReviews,
      averageRating: reviews.storeAnalytics.averageStoreRating,
      pendingApproval: reviews.storeAnalytics.pendingApproval,
      monthReviewCount: reviews.monthReviewCount,
    },
    subscribers,
    campaigns,
  };
}

export async function buildBusinessContext(
  ctx: QueryCtx,
  intents: CopilotIntent[],
  referenceNow: number,
  question?: string
) {
  const context: Record<string, unknown> = {
    storeSnapshot: await getStoreSnapshot(ctx, referenceNow),
  };
  const uniqueIntents = [...new Set(intents)];

  const loaders = uniqueIntents.map(async (intent) => {
    switch (intent) {
      case "overview":
        return ["overview", await getOverviewSnapshot(ctx, referenceNow)] as const;
      case "revenue":
        return ["revenue", await getRevenueStats(ctx, referenceNow)] as const;
      case "sales_trends":
        return ["salesTrends", await getSalesTrends(ctx, referenceNow)] as const;
      case "trending_products":
        return [
          "trendingProducts",
          await getTrendingProducts(ctx, referenceNow),
        ] as const;
      case "low_performing_products":
        return [
          "lowPerformingProducts",
          await getLowPerformingProducts(ctx, referenceNow),
        ] as const;
      case "promotion_recommendations":
        return [
          "promotionRecommendations",
          await getPromotionCandidates(ctx, referenceNow),
        ] as const;
      case "inventory":
        return ["inventory", await getInventoryInsights(ctx, referenceNow)] as const;
      case "products":
        return ["products", await getProductCatalogInsights(ctx)] as const;
      case "orders":
        return ["orders", await getOrderInsights(ctx, referenceNow)] as const;
      case "reviews":
        return ["reviews", await getReviewInsights(ctx, referenceNow)] as const;
      case "search":
        return ["search", await getSearchInsights(ctx, referenceNow)] as const;
      case "email_marketing":
        return [
          "emailMarketing",
          {
            subscribers: await getSubscriberInsights(ctx),
            campaigns: await getCampaignInsights(ctx),
          },
        ] as const;
      case "categories":
        return [
          "categories",
          await getCategoryPerformance(ctx, referenceNow),
        ] as const;
      case "discounts":
        return [
          "discounts",
          await getDiscountPerformance(ctx, referenceNow),
        ] as const;
      case "product_opportunities":
        return [
          "productOpportunities",
          await getProductOpportunities(ctx, referenceNow),
        ] as const;
    }
  });

  const resolved = await Promise.all(loaders);
  for (const entry of resolved) {
    if (!entry) continue;
    context[entry[0]] = entry[1];
  }

  const inventory = context.inventory as
    | {
        reorderCandidates?: Array<{
          productId: string;
          name: string;
          stock: number;
          dailyVelocity: number;
          daysOfCover: number;
          monthlyUnitsSold: number;
        }>;
        lowStock?: unknown[];
      }
    | undefined;
  if (inventory) {
    const forecast30d = (inventory.reorderCandidates ?? []).slice(0, 10).map((item) => ({
      productId: item.productId,
      name: item.name,
      projectedStock: Math.round(item.stock - item.dailyVelocity * 30),
      stockoutInDays: item.daysOfCover,
      reorderUnits: Math.max(0, Math.ceil(item.dailyVelocity * 30 - item.stock)),
      dailyVelocity: item.dailyVelocity,
      monthlyUnitsSold: item.monthlyUnitsSold,
    }));

    const overstockedProducts = (inventory.reorderCandidates ?? [])
      .filter((item) => item.daysOfCover > 90 || item.stock > item.monthlyUnitsSold * 2)
      .slice(0, 10)
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        stock: item.stock,
        daysOfCover: item.daysOfCover,
      }));

    context.inventoryForecast = {
      period: "30d",
      forecast: forecast30d,
    };
    context.stockoutRisks = forecast30d.filter((item) => item.stockoutInDays <= 14);
    context.overstockedProducts = overstockedProducts;
  }

  const revenue = context.revenue as
    | { totalRevenue?: number; currency?: string }
    | undefined;
  const salesTrends = context.salesTrends as
    | { revenueSeries?: Array<{ value: number }>; ordersSeries?: Array<{ value: number }> }
    | undefined;
  if (revenue) {
    const latest = salesTrends?.revenueSeries?.at(-1)?.value ?? 0;
    const previous = salesTrends?.revenueSeries?.at(-2)?.value ?? 0;
    const growthRate = previous > 0 ? (latest - previous) / previous : 0;
    const forecastNextMonth = Math.max(
      0,
      Math.round((revenue.totalRevenue ?? 0) * (1 + growthRate * 0.6))
    );
    context.revenueForecast = {
      currentMonthRevenue: revenue.totalRevenue ?? 0,
      forecastNextMonth,
      currency: revenue.currency ?? "USD",
      confidence: Math.max(
        55,
        Math.min(
          92,
          Math.round(
            85 -
              Math.abs(
                (salesTrends?.ordersSeries?.at(-1)?.value ?? 0) -
                  (salesTrends?.ordersSeries?.at(-2)?.value ?? 0)
              )
          )
        )
      ),
      factors: ["Order growth", "Category growth", "Historical trends"],
    };
  }

  const reviews = context.reviews as
    | { topTags?: Array<{ tag: string; count: number }>; averageMonthRating?: number }
    | undefined;
  if (reviews) {
    const topTags = reviews.topTags ?? [];
    context.complaintThemes = topTags
      .filter((item) =>
        /(late|delay|quality|damaged|poor|broken|size|fit|refund|price)/i.test(
          item.tag
        )
      )
      .slice(0, 5);
    context.praiseThemes = topTags
      .filter((item) =>
        /(quality|comfortable|beautiful|fast|value|design|durable|premium)/i.test(
          item.tag
        )
      )
      .slice(0, 5);
    context.productSentiment = {
      averageRating: reviews.averageMonthRating ?? 0,
      topTags,
    };
  }

  const questionLower = question?.toLowerCase() ?? "";
  const emailMarketing = context.emailMarketing as
    | {
        subscribers?: {
          segmentCounts?: Record<string, number>;
          totalActiveSubscribers?: number;
        };
      }
    | undefined;
  if (emailMarketing?.subscribers) {
    const suggestedCategory = questionLower.includes("furniture")
      ? "Furniture"
      : questionLower.includes("jewelry") || questionLower.includes("jewellery")
        ? "Jewelry"
        : questionLower.includes("electronics")
          ? "Electronics"
          : null;
    context.subscriberPromotionTargets = emailMarketing.subscribers.segmentCounts ?? {};
    context.categoryCampaignSuggestions = suggestedCategory
      ? {
          category: suggestedCategory,
          action: `Run a focused ${suggestedCategory} campaign this week.`,
          audience: "High value and repeat buyers",
        }
      : null;
  }

  context.businessRisks = {
    lowStockCount: inventory?.lowStock?.length ?? 0,
    decliningProductCount:
      ((context.lowPerformingProducts as { products?: unknown[] } | undefined)?.products
        ?.length ?? 0),
    zeroResultSearchCount:
      ((context.search as { zeroResultQueries?: unknown[] } | undefined)
        ?.zeroResultQueries?.length ?? 0),
  };

  context.businessOpportunities = {
    promotionCandidates:
      ((context.promotionRecommendations as { candidates?: unknown[] } | undefined)
        ?.candidates?.length ?? 0),
    searchDemandGaps:
      ((context.search as { zeroResultQueries?: unknown[] } | undefined)
        ?.zeroResultQueries?.length ?? 0),
  };

  return context;
}
