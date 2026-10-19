import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  aggregateTopCategories,
  aggregateTopProducts,
  computeKpis,
  fetchOrdersInRange,
} from "./lib/dashboardAggregates";
import { resolveDashboardRange, resolvePreviousPeriod } from "./lib/dashboardRange";
import { getInventoryInsights, getLowPerformingProducts } from "./lib/ai/businessIntelligence";
import {
  ENABLE_RAG_SHOPPING_ASSISTANT_KEY,
  deploymentGateEnabled as ragGate,
  parseRagEnabled,
} from "./lib/rag/config";
import {
  ENABLE_DEMAND_FORECASTING_KEY,
  deploymentGateEnabled as forecastGate,
  parseForecastEnabled,
} from "./lib/forecasting/config";

const rangeArg = v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"));

function daysFor(range: "7d" | "30d" | "90d"): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 90;
}

export const salesAnalytics = internalQuery({
  args: {
    range: rangeArg,
    category: v.optional(v.string()),
    referenceNow: v.number(),
  },
  handler: async (ctx, args) => {
    const days = daysFor(args.range);
    const current = resolveDashboardRange(
      "custom",
      args.referenceNow - days * 86_400_000,
      args.referenceNow,
      args.referenceNow
    );
    const previous = resolvePreviousPeriod(current);
    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrdersInRange(ctx, current),
      fetchOrdersInRange(ctx, previous),
    ]);
    const kpis = computeKpis(currentOrders, previousOrders);
    const [products, categories] = await Promise.all([
      aggregateTopProducts(ctx, currentOrders, 20),
      aggregateTopCategories(ctx, currentOrders, 20),
    ]);
    const categoryFilter = args.category?.trim().toLowerCase();
    const filteredCategories = categoryFilter
      ? categories.filter((category) => category.categoryName.toLowerCase().includes(categoryFilter))
      : categories;
    const decorated = [];
    for (const product of products.slice(0, 20)) {
      const doc = await ctx.db.get(product.productId);
      const category = doc ? await ctx.db.get(doc.categoryId) : null;
      if (categoryFilter && !(category?.name ?? "").toLowerCase().includes(categoryFilter)) continue;
      decorated.push({
        productId: product.productId,
        name: product.productName,
        unitsSold: product.unitsSold,
        revenue: product.revenue,
        orderCount: product.orderCount,
        category: category?.name ?? "Unknown",
      });
    }
    const unitsSold = decorated.reduce((sum, product) => sum + product.unitsSold, 0);
    const summary = categoryFilter
      ? `${filteredCategories.length} matching categories, revenue ${kpis.totalRevenue.value}, ${kpis.totalOrders.value} orders`
      : `Revenue ${kpis.totalRevenue.value} ${kpis.currency} from ${kpis.totalOrders.value} orders and ${unitsSold} units`;
    return {
      available: true as const,
      source: "stored_orders",
      factType: "verified" as const,
      range: args.range,
      currency: kpis.currency,
      revenue: kpis.totalRevenue.value,
      orderCount: kpis.totalOrders.value,
      unitsSold,
      products: decorated.slice(0, 10),
      categories: filteredCategories.slice(0, 10).map((category) => ({
        name: category.categoryName,
        revenue: category.revenue,
        unitsSold: category.unitsSold,
      })),
      summary,
    };
  },
});

export const productPerformance = internalQuery({
  args: {
    query: v.optional(v.string()),
    productId: v.optional(v.string()),
    range: v.optional(rangeArg),
    referenceNow: v.number(),
  },
  handler: async (ctx, args) => {
    const range = args.range ?? "30d";
    const days = daysFor(range);
    const current = resolveDashboardRange(
      "custom",
      args.referenceNow - days * 86_400_000,
      args.referenceNow,
      args.referenceNow
    );
    const previous = resolvePreviousPeriod(current);
    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrdersInRange(ctx, current),
      fetchOrdersInRange(ctx, previous),
    ]);
    const [currentProducts, previousProducts] = await Promise.all([
      aggregateTopProducts(ctx, currentOrders, 30),
      aggregateTopProducts(ctx, previousOrders, 30),
    ]);
    const previousMap = new Map(previousProducts.map((product) => [product.productId, product]));
    let docs: Doc<"products">[] = [];
    if (args.productId) {
      const doc = await ctx.db.get(args.productId as Id<"products">);
      docs = doc ? [doc] : [];
    } else if (args.query?.trim()) {
      docs = await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", args.query!.trim()))
        .take(5);
    } else {
      docs = [];
      for (const product of currentProducts.slice(0, 5)) {
        const doc = await ctx.db.get(product.productId);
        if (doc) docs.push(doc);
      }
    }
    if (docs.length === 0) {
      return {
        available: true as const,
        summary: "No stored product matched the request",
        products: [],
      };
    }
    const products = [];
    for (const doc of docs) {
      const category = await ctx.db.get(doc.categoryId);
      const currentSale = currentProducts.find((product) => product.productId === doc._id);
      const previousSale = previousMap.get(doc._id);
      const units = currentSale?.unitsSold ?? 0;
      const previousUnits = previousSale?.unitsSold ?? 0;
      const trend =
        units === 0 && previousUnits === 0
          ? "insufficient_history"
          : previousUnits > 0 && units < previousUnits * 0.7
            ? "declining"
            : units > previousUnits
              ? "rising"
              : "flat";
      products.push({
        productId: doc._id,
        name: doc.name,
        brand: doc.company,
        category: category?.name ?? "Unknown",
        stock: doc.stock,
        unitsSold: units,
        revenue: currentSale?.revenue ?? 0,
        trend,
      });
    }
    return {
      available: true as const,
      source: "stored_orders",
      summary: products.map((product) => `${product.name}: ${product.unitsSold} units, trend ${product.trend}`).join("; "),
      products,
    };
  },
});

export const inventoryInsights = internalQuery({
  args: { query: v.optional(v.string()), limit: v.optional(v.number()), referenceNow: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
    const [inventory, lowPerforming] = await Promise.all([
      getInventoryInsights(ctx, args.referenceNow),
      getLowPerformingProducts(ctx, args.referenceNow),
    ]);
    const query = args.query?.trim().toLowerCase();
    const matches = (name: string) => !query || name.toLowerCase().includes(query);
    const lowStock = inventory.lowStock.filter((product) => matches(product.name)).slice(0, limit);
    const stockoutRisk = inventory.reorderCandidates
      .filter((product) => product.reorderPriority === "critical" || product.reorderPriority === "high")
      .filter((product) => matches(product.name))
      .slice(0, limit);
    const slowMoving = lowPerforming.products
      .filter((product) => matches(product.productName))
      .slice(0, limit)
      .map((product) => ({
        productId: product.productId,
        name: product.productName,
        unitsSold: product.unitsSold,
        revenueGrowthPercent: product.revenueGrowthPercent,
      }));
    return {
      available: true as const,
      source: "stored_inventory",
      summary: `${inventory.stockSummary.lowStockCount} low-stock products, ${inventory.stockSummary.outOfStockCount} out of stock`,
      threshold: inventory.threshold,
      stockSummary: inventory.stockSummary,
      lowStock,
      slowMoving,
      stockoutRisk,
    };
  },
});

export const demandForecast = internalQuery({
  args: { query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!forecastGate(process.env.DEMAND_FORECASTING_ENABLED)) {
      return { available: false as const, reason: "forecast_disabled" };
    }
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", ENABLE_DEMAND_FORECASTING_KEY))
      .unique();
    if (!parseForecastEnabled(setting?.value)) {
      return { available: false as const, reason: "forecast_disabled" };
    }
    const [publication] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    if (!publication) return { available: false as const, reason: "unpublished" };
    const insights = await ctx.db
      .query("forecastInsights")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication.publicationId))
      .take(20);
    const query = args.query?.trim().toLowerCase();
    const products = insights
      .filter((row) => !query || row.productName.toLowerCase().includes(query))
      .slice(0, 10)
      .map((row) => ({
        name: row.productName,
        predictedUnits: row.forecastUnits,
        confidence: row.confidence,
        stockoutRisk: row.stockoutRisk,
        trend: row.trend,
      }));
    return {
      available: true as const,
      source: "published_forecast",
      factType: "estimate" as const,
      horizonDays: publication.horizonDays,
      modelVersion: publication.modelVersion,
      dataCutoff: publication.dataCutoff,
      uncertaintyLabel: publication.uncertaintyLabel,
      summary: `Published forecast ${publication.modelVersion}, horizon ${publication.horizonDays} days, cutoff ${publication.dataCutoff}`,
      products,
    };
  },
});

export const searchProducts = internalQuery({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
    const rows = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(limit);
    const products = [];
    for (const row of rows) {
      const category = await ctx.db.get(row.categoryId);
      products.push({
        productId: row._id,
        name: row.name,
        brand: row.company,
        category: category?.name ?? "Unknown",
        stock: row.stock,
        price: row.price,
      });
    }
    return {
      available: true as const,
      source: "product_catalog",
      summary: products.length > 0 ? `Found ${products.length} stored products` : "No stored product matched the request",
      products,
    };
  },
});

export const marketingCampaigns = internalQuery({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 20);
    const campaigns = await ctx.db.query("emailCampaigns").withIndex("by_created_at").order("desc").take(40);
    const templates = await ctx.db.query("emailTemplates").withIndex("by_created_at").order("desc").take(10);
    const status = args.status ?? "all";
    const visible = campaigns
      .filter((campaign) => status === "all" || campaign.status === status)
      .slice(0, limit)
      .map((campaign) => ({
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        productCount: campaign.productCount,
        updatedAt: campaign.updatedAt,
        url: `/admin/email-marketing/campaigns/${campaign._id}`,
      }));
    return {
      available: true as const,
      source: "email_campaigns",
      summary: `${visible.length} campaigns visible without subscriber addresses`,
      campaigns: visible,
      templates: templates.map((template) => ({
        id: template._id,
        name: template.name,
        status: template.status,
      })),
    };
  },
});

export const storeKnowledge = internalQuery({
  args: { question: v.string() },
  handler: async (ctx, args) => {
    if (!ragGate(process.env.RAG_SHOPPING_ASSISTANT_ENABLED)) {
      return { available: false as const, reason: "rag_disabled" };
    }
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", ENABLE_RAG_SHOPPING_ASSISTANT_KEY))
      .unique();
    if (!parseRagEnabled(setting?.value)) {
      return { available: false as const, reason: "rag_disabled" };
    }
    const rows = await ctx.db
      .query("ragChunks")
      .withSearchIndex("search_content", (q) => q.search("content", args.question).eq("active", true))
      .take(5);
    return {
      available: true as const,
      source: "rag_chunks",
      untrusted: true as const,
      summary: rows.length > 0 ? `Retrieved ${rows.length} untrusted store excerpts` : "No store excerpt matched",
      documents: rows.map((row) => ({
        title: row.title,
        section: row.section,
        sourceType: row.sourceType,
        excerpt: row.content.slice(0, 400),
      })),
    };
  },
});
