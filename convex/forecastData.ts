import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { saleIsEligible, utcDateFromMillis } from "./lib/forecasting/eligibility";
import {
  DEMAND_FORECAST_HORIZON_DAYS_KEY,
  DEMAND_FORECAST_MODEL_STRATEGY_KEY,
  DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY,
  ENABLE_DEMAND_FORECASTING_KEY,
} from "./lib/forecasting/config";

const PAGE_LIMIT = 25;
const ITEM_LIMIT = 40;

export const forecastSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const keys = [
      ENABLE_DEMAND_FORECASTING_KEY,
      DEMAND_FORECAST_HORIZON_DAYS_KEY,
      DEMAND_FORECAST_MODEL_STRATEGY_KEY,
      DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY,
    ];
    const values: Record<string, string> = {};
    for (const key of keys) {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (row) values[key] = row.value;
    }
    return values;
  },
});

export const pageSalesLines = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    if (process.env.DEMAND_FORECAST_EXPORT_ENABLED?.trim() !== "true") {
      return { blocked: true as const, lines: [], isDone: true, continueCursor: null };
    }
    const page = await ctx.db
      .query("orders")
      .withIndex("by_created_at")
      .order("desc")
      .paginate({ numItems: PAGE_LIMIT, cursor: args.cursor });
    const lines = [];
    for (const order of page.page) {
      if (
        !saleIsEligible({
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
        })
      ) {
        continue;
      }
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .take(ITEM_LIMIT);
      for (const item of items) {
        if (item.isPromotionGift) continue;
        const product = await ctx.db.get(item.productId);
        lines.push({
          productId: item.productId,
          productName: product?.name ?? item.productName,
          categoryId: product?.categoryId ?? "",
          active: product?.active !== false,
          stock: product?.stock ?? null,
          quantity: item.quantity,
          date: utcDateFromMillis(order.paidAt ?? order.createdAt),
          orderId: order._id,
        });
      }
    }
    return {
      blocked: false as const,
      lines,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});

export const latestPublication = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [row] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    return row ?? null;
  },
});

export const beginPublication = internalMutation({
  args: {
    publicationId: v.string(),
    modelVersion: v.string(),
    strategy: v.string(),
    horizonDays: v.number(),
    dataCutoff: v.string(),
    trainedAt: v.string(),
    datasetLabel: v.string(),
    statisticallyWeak: v.boolean(),
    uncertaintyLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(5);
    for (const row of current) {
      await ctx.db.patch(row._id, { status: "archived" });
    }
    await ctx.db.insert("forecastPublications", {
      ...args,
      status: "published",
      generatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.forecastData.retainForecasts, {});
  },
});

const pointValidator = v.object({
  entityType: v.union(v.literal("product"), v.literal("category"), v.literal("store")),
  entityId: v.string(),
  forecastDate: v.string(),
  predictedUnits: v.number(),
  lowerUnits: v.number(),
  upperUnits: v.number(),
  modelName: v.string(),
  confidence: v.string(),
});

const insightValidator = v.object({
  entityId: v.string(),
  productName: v.string(),
  categoryId: v.string(),
  currentStock: v.optional(v.number()),
  forecastUnits: v.number(),
  daysRemaining: v.optional(v.number()),
  stockoutRisk: v.string(),
  trend: v.string(),
  slowMoving: v.boolean(),
  highDemand: v.boolean(),
  reorderQuantity: v.optional(v.number()),
  reorderNote: v.string(),
  modelName: v.string(),
  confidence: v.string(),
});

export const addForecastRows = internalMutation({
  args: {
    publicationId: v.string(),
    points: v.array(pointValidator),
    insights: v.array(insightValidator),
  },
  handler: async (ctx, args) => {
    if (args.points.length > 80 || args.insights.length > 40) {
      throw new Error("Forecast write batch is too large");
    }
    for (const point of args.points) {
      await ctx.db.insert("forecastPoints", { publicationId: args.publicationId, ...point });
    }
    for (const insight of args.insights) {
      await ctx.db.insert("forecastInsights", { publicationId: args.publicationId, ...insight });
    }
  },
});

export const retainForecasts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [old] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .take(1);
    if (!old) return;
    const points = await ctx.db
      .query("forecastPoints")
      .withIndex("by_publication", (q) => q.eq("publicationId", old.publicationId))
      .take(80);
    for (const point of points) await ctx.db.delete(point._id);
    const insights = await ctx.db
      .query("forecastInsights")
      .withIndex("by_publication", (q) => q.eq("publicationId", old.publicationId))
      .take(40);
    for (const insight of insights) await ctx.db.delete(insight._id);
    if (points.length === 80 || insights.length === 40) {
      await ctx.scheduler.runAfter(0, internal.forecastData.retainForecasts, {});
      return;
    }
    await ctx.db.delete(old._id);
  },
});
