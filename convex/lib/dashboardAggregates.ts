import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { DateRange, TrendBucket } from "./dashboardRange";
import { percentChange, trendDirection } from "./dashboardRange";

export type KpiMetric = {
  value: number;
  previousValue: number;
  changePercent: number | null;
  trend: "up" | "down" | "flat";
};

export type DashboardKpis = {
  totalRevenue: KpiMetric;
  totalOrders: KpiMetric;
  paidOrders: KpiMetric;
  pendingOrders: KpiMetric;
  totalCustomers: KpiMetric;
  averageOrderValue: KpiMetric;
  currency: string;
};

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export async function fetchOrdersInRange(
  ctx: QueryCtx,
  range: DateRange
): Promise<Doc<"orders">[]> {
  return await ctx.db
    .query("orders")
    .withIndex("by_created_at", (q) =>
      q.gte("createdAt", range.from).lte("createdAt", range.to)
    )
    .collect();
}

function sumPaidRevenue(orders: Doc<"orders">[]): number {
  return orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.total, 0);
}

function countPaidOrders(orders: Doc<"orders">[]): number {
  return orders.filter((o) => o.paymentStatus === "paid").length;
}

function countPendingOrders(orders: Doc<"orders">[]): number {
  return orders.filter((o) => o.paymentStatus === "pending").length;
}

function countUniqueCustomers(orders: Doc<"orders">[]): number {
  return new Set(orders.map((o) => o.customerEmail.toLowerCase())).size;
}

function buildKpiMetric(current: number, previous: number): KpiMetric {
  return {
    value: current,
    previousValue: previous,
    changePercent: percentChange(current, previous),
    trend: trendDirection(current, previous),
  };
}

export function computeKpis(
  currentOrders: Doc<"orders">[],
  previousOrders: Doc<"orders">[]
): DashboardKpis {
  const currentRevenue = sumPaidRevenue(currentOrders);
  const previousRevenue = sumPaidRevenue(previousOrders);
  const currentPaid = countPaidOrders(currentOrders);
  const previousPaid = countPaidOrders(previousOrders);

  const currency =
    currentOrders.find((o) => o.paymentStatus === "paid")?.currency ??
    previousOrders.find((o) => o.paymentStatus === "paid")?.currency ??
    "USD";

  return {
    totalRevenue: buildKpiMetric(currentRevenue, previousRevenue),
    totalOrders: buildKpiMetric(
      currentOrders.length,
      previousOrders.length
    ),
    paidOrders: buildKpiMetric(currentPaid, previousPaid),
    pendingOrders: buildKpiMetric(
      countPendingOrders(currentOrders),
      countPendingOrders(previousOrders)
    ),
    totalCustomers: buildKpiMetric(
      countUniqueCustomers(currentOrders),
      countUniqueCustomers(previousOrders)
    ),
    averageOrderValue: buildKpiMetric(
      currentPaid > 0 ? currentRevenue / currentPaid : 0,
      previousPaid > 0 ? previousRevenue / previousPaid : 0
    ),
    currency,
  };
}

export function computeTrendSeries(
  orders: Doc<"orders">[],
  buckets: TrendBucket[],
  mode: "revenue" | "orders"
): { label: string; value: number }[] {
  return buckets.map((bucket) => {
    const inBucket = orders.filter(
      (o) => o.createdAt >= bucket.start && o.createdAt <= bucket.end
    );

    const value =
      mode === "orders"
        ? inBucket.length
        : inBucket
            .filter((o) => o.paymentStatus === "paid")
            .reduce((sum, o) => sum + o.total, 0);

    return { label: bucket.label, value };
  });
}

export function computeOrderStatusBreakdown(orders: Doc<"orders">[]) {
  const counts: Record<string, number> = {};
  for (const status of ORDER_STATUSES) {
    counts[status] = 0;
  }
  for (const order of orders) {
    if (
      ORDER_STATUSES.includes(order.status as (typeof ORDER_STATUSES)[number])
    ) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
  }
  return ORDER_STATUSES.map((status) => ({
    status,
    count: counts[status] ?? 0,
  }));
}

export function computePaymentMethodBreakdown(orders: Doc<"orders">[]) {
  const stripe = orders.filter((o) => o.paymentMethod === "stripe").length;
  const cod = orders.filter((o) => o.paymentMethod === "cod").length;
  const total = orders.length || 1;
  return [
    {
      method: "stripe" as const,
      label: "Stripe",
      count: stripe,
      percent: (stripe / total) * 100,
    },
    {
      method: "cod" as const,
      label: "Cash On Delivery",
      count: cod,
      percent: (cod / total) * 100,
    },
  ];
}

export function computePaymentStatusBreakdown(orders: Doc<"orders">[]) {
  const statuses = ["paid", "pending", "failed", "refunded"] as const;
  const counts: Record<string, number> = {};
  for (const status of statuses) {
    counts[status] = 0;
  }
  for (const order of orders) {
    counts[order.paymentStatus] = (counts[order.paymentStatus] ?? 0) + 1;
  }
  return statuses.map((status) => ({
    status,
    count: counts[status] ?? 0,
  }));
}

export type ProductSalesAggregate = {
  productId: Id<"products">;
  productName: string;
  sku: string | undefined;
  imageUrl: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
};

export async function aggregateTopProducts(
  ctx: QueryCtx,
  orders: Doc<"orders">[],
  limit = 10
): Promise<ProductSalesAggregate[]> {
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const orderIds = new Set(paidOrders.map((o) => o._id));

  const aggregates = new Map<
    string,
    ProductSalesAggregate & { orderIds: Set<string> }
  >();

  const chunkSize = 50;
  for (let i = 0; i < paidOrders.length; i += chunkSize) {
    const chunk = paidOrders.slice(i, i + chunkSize);
    const itemGroups = await Promise.all(
      chunk.map((order) =>
        ctx.db
          .query("orderItems")
          .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
          .collect()
      )
    );

    for (const items of itemGroups) {
      for (const item of items) {
        if (!orderIds.has(item.orderId)) continue;
        const key = item.productId;
        const existing = aggregates.get(key);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += item.lineTotal;
          existing.orderIds.add(item.orderId);
        } else {
          aggregates.set(key, {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            imageUrl: item.imageUrl,
            orderCount: 0,
            unitsSold: item.quantity,
            revenue: item.lineTotal,
            orderIds: new Set([item.orderId]),
          });
        }
      }
    }
  }

  const results = Array.from(aggregates.values()).map((entry) => ({
    productId: entry.productId,
    productName: entry.productName,
    sku: entry.sku,
    imageUrl: entry.imageUrl,
    orderCount: entry.orderIds.size,
    unitsSold: entry.unitsSold,
    revenue: entry.revenue,
  }));

  return results
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
    .slice(0, limit);
}

export type CategorySalesAggregate = {
  categoryId: Id<"productCategories">;
  categoryName: string;
  unitsSold: number;
  revenue: number;
};

export async function aggregateTopCategories(
  ctx: QueryCtx,
  orders: Doc<"orders">[],
  limit = 10
): Promise<CategorySalesAggregate[]> {
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const categoryMap = new Map<
    string,
    { categoryId: Id<"productCategories">; unitsSold: number; revenue: number }
  >();
  const productCategoryCache = new Map<string, Id<"productCategories"> | null>();

  const chunkSize = 50;
  for (let i = 0; i < paidOrders.length; i += chunkSize) {
    const chunk = paidOrders.slice(i, i + chunkSize);
    const itemGroups = await Promise.all(
      chunk.map((order) =>
        ctx.db
          .query("orderItems")
          .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
          .collect()
      )
    );

    for (const items of itemGroups) {
      for (const item of items) {
        let categoryId = productCategoryCache.get(item.productId);
        if (categoryId === undefined) {
          const product = await ctx.db.get(item.productId);
          categoryId = product?.categoryId ?? null;
          productCategoryCache.set(item.productId, categoryId);
        }
        if (!categoryId) continue;

        const key = categoryId;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += item.lineTotal;
        } else {
          categoryMap.set(key, {
            categoryId,
            unitsSold: item.quantity,
            revenue: item.lineTotal,
          });
        }
      }
    }
  }

  const results: CategorySalesAggregate[] = [];
  for (const entry of categoryMap.values()) {
    const category = await ctx.db.get(entry.categoryId);
    results.push({
      categoryId: entry.categoryId,
      categoryName: category?.name ?? "Unknown",
      unitsSold: entry.unitsSold,
      revenue: entry.revenue,
    });
  }

  return results
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
    .slice(0, limit);
}

export function computeRecentOrders(orders: Doc<"orders">[], limit = 10) {
  return [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((order) => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      createdAt: order.createdAt,
    }));
}

export type ActivityFeedItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  actorType: string;
  actorName?: string;
  relatedOrderId?: Id<"orders">;
  relatedProductId?: Id<"products">;
  createdAt: number;
};

export async function fetchActivityFeed(
  ctx: QueryCtx,
  range: DateRange,
  limit = 15
): Promise<ActivityFeedItem[]> {
  const [statusLogs, paymentLogs, adminLogs] = await Promise.all([
    ctx.db
      .query("orderStatusLogs")
      .withIndex("by_created_at", (q) =>
        q.gte("createdAt", range.from).lte("createdAt", range.to)
      )
      .order("desc")
      .take(30),
    ctx.db
      .query("paymentLogs")
      .withIndex("by_created_at", (q) =>
        q.gte("createdAt", range.from).lte("createdAt", range.to)
      )
      .order("desc")
      .take(30),
    ctx.db
      .query("adminActivityLogs")
      .withIndex("by_created_at", (q) =>
        q.gte("createdAt", range.from).lte("createdAt", range.to)
      )
      .order("desc")
      .take(30),
  ]);

  const items: ActivityFeedItem[] = [
    ...statusLogs.map((log) => ({
      id: `status-${log._id}`,
      type: log.event,
      title: log.event,
      description: log.description,
      actorType: log.actorType,
      actorName: log.actorName,
      relatedOrderId: log.orderId,
      createdAt: log.createdAt,
    })),
    ...paymentLogs.map((log) => ({
      id: `payment-${log._id}`,
      type: log.event,
      title: log.event,
      description: log.description,
      actorType: log.actorType,
      actorName: log.actorName,
      relatedOrderId: log.orderId,
      createdAt: log.createdAt,
    })),
    ...adminLogs.map((log) => ({
      id: `admin-${log._id}`,
      type: log.type,
      title: log.title,
      description: log.description,
      actorType: log.actorType,
      actorName: log.actorName,
      relatedOrderId: log.relatedOrderId,
      relatedProductId: log.relatedProductId,
      createdAt: log.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export const dashboardRangeArgs = {
  range: v.union(
    v.literal("today"),
    v.literal("week"),
    v.literal("month"),
    v.literal("quarter"),
    v.literal("year"),
    v.literal("custom")
  ),
  dateFrom: v.optional(v.number()),
  dateTo: v.optional(v.number()),
};
