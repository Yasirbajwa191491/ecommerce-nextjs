import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  deploymentGateEnabled,
  parseForecastEnabled,
  parseForecastHorizon,
  parseForecastStrategy,
  resolveForecastAvailability,
  ENABLE_DEMAND_FORECASTING_KEY,
  DEMAND_FORECAST_HORIZON_DAYS_KEY,
  DEMAND_FORECAST_MODEL_STRATEGY_KEY,
  DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY,
  FORECAST_MODEL_VERSION,
} from "./lib/forecasting/config";
import { fillSalesDays } from "./lib/forecasting/eligibility";
import { defaultRagEnv, getService, postRag, ragServiceConfigured } from "./lib/rag/pythonRagClient";

type SalesLine = {
  productId: string;
  productName: string;
  categoryId: string;
  active: boolean;
  stock: number | null;
  quantity: number;
  date: string;
  orderId: string;
};

type ForecastBody = {
  model_version?: string;
  trained_at?: string | null;
  data_cutoff?: string | null;
  dataset_label?: string | null;
  statistically_weak?: boolean;
  forecasts?: Array<{
    entity_type: "product" | "category" | "store";
    entity_id: string;
    dates: string[];
    predicted_units: number[];
    lower_units: number[];
    upper_units: number[];
    model: string;
    confidence: string;
    uncertainty_label?: string;
  }>;
  insights?: Array<{
    entity_id: string;
    current_stock: number | null;
    forecast_units: number;
    days_remaining: number | null;
    stockout_risk: string;
    trend: string;
    slow_moving: boolean;
    high_demand: boolean;
    reorder_quantity: number | null;
    reorder_note: string;
    model: string;
    confidence: string;
  }>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

export const adminStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const keys = [
      ENABLE_DEMAND_FORECASTING_KEY,
      DEMAND_FORECAST_HORIZON_DAYS_KEY,
      DEMAND_FORECAST_MODEL_STRATEGY_KEY,
      DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY,
    ] as const;
    const map = new Map<string, string>();
    for (const key of keys) {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (row) map.set(key, row.value);
    }
    const [publication] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    const availability = resolveForecastAvailability({
      adminEnabled: parseForecastEnabled(map.get(ENABLE_DEMAND_FORECASTING_KEY)),
      deploymentGate: deploymentGateEnabled(process.env.DEMAND_FORECASTING_ENABLED),
      exportGate: deploymentGateEnabled(process.env.DEMAND_FORECAST_EXPORT_ENABLED),
      serviceConfigured: ragServiceConfigured(defaultRagEnv()),
      artifactReady: true,
      published: publication != null,
    });
    return {
      enabled: availability.enabled,
      reason: availability.reason,
      horizonDays: parseForecastHorizon(map.get(DEMAND_FORECAST_HORIZON_DAYS_KEY)),
      strategy: parseForecastStrategy(map.get(DEMAND_FORECAST_MODEL_STRATEGY_KEY)),
      showUncertainty: parseForecastEnabled(map.get(DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY) ?? "true"),
      datasetLabel: publication?.datasetLabel ?? "",
      trainedAt: publication?.trainedAt ?? "",
      dataCutoff: publication?.dataCutoff ?? "",
      modelVersion: publication?.modelVersion ?? "",
      statisticallyWeak: publication?.statisticallyWeak ?? true,
      generatedAt: publication?.generatedAt ?? null,
      uncertaintyLabel: publication?.uncertaintyLabel ?? "",
    };
  },
});

export const dashboard = query({
  args: {
    categoryId: v.optional(v.string()),
    risk: v.optional(v.string()),
    trend: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const [publication] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    if (!publication) {
      return { publication: null, store: [], insights: [] };
    }
    const store = await ctx.db
      .query("forecastPoints")
      .withIndex("by_publication_entity", (q) =>
        q.eq("publicationId", publication.publicationId).eq("entityType", "store").eq("entityId", "store")
      )
      .take(31);
    const insights = await ctx.db
      .query("forecastInsights")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication.publicationId))
      .take(40);
    const filtered = insights.filter((row) => {
      if (args.categoryId && row.categoryId !== args.categoryId) return false;
      if (args.risk && row.stockoutRisk !== args.risk) return false;
      if (args.trend && row.trend !== args.trend) return false;
      return true;
    });
    return {
      publication: {
        id: publication.publicationId,
        modelVersion: publication.modelVersion,
        horizonDays: publication.horizonDays,
        strategy: publication.strategy,
        generatedAt: publication.generatedAt,
        dataCutoff: publication.dataCutoff,
        trainedAt: publication.trainedAt,
        datasetLabel: publication.datasetLabel,
        statisticallyWeak: publication.statisticallyWeak,
        uncertaintyLabel: publication.uncertaintyLabel,
      },
      store,
      insights: filtered,
    };
  },
});

export const copilotSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [publication] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    if (!publication || process.env.DEMAND_FORECASTING_ENABLED?.trim() !== "true") {
      return { available: false as const, reason: "unpublished" };
    }
    const insights = await ctx.db
      .query("forecastInsights")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication.publicationId))
      .take(15);
    return {
      available: true as const,
      label: "sales_based_estimate",
      datasetLabel: publication.datasetLabel,
      horizonDays: publication.horizonDays,
      modelVersion: publication.modelVersion,
      dataCutoff: publication.dataCutoff,
      products: insights.map((row) => ({
        name: row.productName,
        forecastUnits: row.forecastUnits,
        stockoutRisk: row.stockoutRisk,
        trend: row.trend,
        daysRemaining: row.daysRemaining ?? null,
        slowMoving: row.slowMoving,
      })),
    };
  },
});

export const publish = action({
  args: { leadTimeDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    const env = defaultRagEnv();
    if (!deploymentGateEnabled(process.env.DEMAND_FORECASTING_ENABLED)) {
      throw new Error("Demand forecasting deployment gate is off");
    }
    if (!deploymentGateEnabled(process.env.DEMAND_FORECAST_EXPORT_ENABLED)) {
      throw new Error("Demand forecast export gate is off");
    }
    if (!ragServiceConfigured(env)) throw new Error("Python forecast service is not configured");
    const settings = await ctx.runQuery(internal.forecastData.forecastSettings, {});
    if (!parseForecastEnabled(settings[ENABLE_DEMAND_FORECASTING_KEY])) {
      throw new Error("Demand forecasting is disabled in Admin Settings");
    }
    const status = await getService<{ ready?: boolean }>("/api/v1/internal/forecast/status", env);
    if (!status.ready) throw new Error("Forecast artifact is not available");
    const names = new Map<string, { name: string; categoryId: string; stock: number | null }>();
    const buckets = new Map<string, Map<string, { units: number; orders: Set<string> }>>();
    let cursor: string | null = null;
    const cutoff = Date.now();
    while (true) {
      const batch: {
        blocked: boolean;
        lines: SalesLine[];
        isDone: boolean;
        continueCursor: string | null;
      } = await ctx.runQuery(internal.forecastData.pageSalesLines, { cursor, cutoff });
      if (batch.blocked) throw new Error("Demand forecast export gate is off");
      for (const line of batch.lines) {
        names.set(line.productId, {
          name: line.productName,
          categoryId: line.categoryId,
          stock: line.stock,
        });
        const days = buckets.get(line.productId) ?? new Map();
        const current = days.get(line.date) ?? { units: 0, orders: new Set<string>() };
        current.units += line.quantity;
        current.orders.add(line.orderId);
        days.set(line.date, current);
        buckets.set(line.productId, days);
      }
      if (batch.isDone || !batch.continueCursor) break;
      cursor = batch.continueCursor;
    }
    const horizon = parseForecastHorizon(settings[DEMAND_FORECAST_HORIZON_DAYS_KEY]);
    const strategy = parseForecastStrategy(settings[DEMAND_FORECAST_MODEL_STRATEGY_KEY]);
    const productSeries = [...buckets.entries()].map(([productId, days]) => {
      const dates = [...days.keys()].sort();
      const points = fillSalesDays(
        days,
        dates[0] ?? new Date().toISOString().slice(0, 10),
        new Date(cutoff).toISOString().slice(0, 10)
      );
      const meta = names.get(productId);
      return {
        entity_type: "product" as const,
        entity_id: productId,
        category_id: meta?.categoryId ?? "",
        current_stock: meta?.stock,
        points: points.map((point) => ({
          date: point.date,
          units: point.units,
          order_count: point.orderCount,
          observation: point.observation,
        })),
      };
    });
    const categoryUnits = new Map<string, Map<string, number>>();
    const storeUnits = new Map<string, number>();
    const categoryOrders = new Map<string, Set<string>>(), storeOrders = new Map<string, Set<string>>();
    for (const item of productSeries) {
      for (const point of item.points) {
        const orderIds = buckets.get(item.entity_id)?.get(point.date)?.orders ?? new Set<string>();
        const categoryKey = `${item.category_id}:${point.date}`;
        const catOrders = categoryOrders.get(categoryKey) ?? new Set<string>(), allOrders = storeOrders.get(point.date) ?? new Set<string>();
        for (const id of orderIds) { catOrders.add(id); allOrders.add(id); }
        categoryOrders.set(categoryKey, catOrders); storeOrders.set(point.date, allOrders);
        const categoryDays = categoryUnits.get(item.category_id) ?? new Map<string, number>();
        categoryDays.set(point.date, (categoryDays.get(point.date) ?? 0) + point.units);
        categoryUnits.set(item.category_id, categoryDays);
        storeUnits.set(point.date, (storeUnits.get(point.date) ?? 0) + point.units);
      }
    }
    const categorySeries = [...categoryUnits.entries()].map(([categoryId, days]) => ({
      entity_type: "category" as const,
      entity_id: categoryId || "unknown",
      category_id: categoryId,
      points: [...days.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, units]) => ({ date, units, observation: "sale" as const, order_count: categoryOrders.get(`${categoryId}:${date}`)?.size ?? 0 })),
    }));
    const series = [
      ...productSeries,
      ...categorySeries,
      {
        entity_type: "store" as const,
        entity_id: "store",
        category_id: "store",
        points: [...storeUnits.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, units]) => ({ date, units, observation: "sale" as const, order_count: storeOrders.get(date)?.size ?? 0 })),
      },
    ];
    if (productSeries.length === 0) throw new Error("No eligible paid sales were found");
    const forecast: ForecastBody = { forecasts: [], insights: [] };
    for (const batch of chunk(series, 20)) {
      const result = await postRag<ForecastBody>("/api/v1/internal/forecast/batch", { horizon_days: horizon, strategy, series: batch, lead_time_days: args.leadTimeDays }, env);
      forecast.forecasts!.push(...(result.forecasts ?? [])); forecast.insights!.push(...(result.insights ?? []));
      forecast.model_version = result.model_version; forecast.data_cutoff = result.data_cutoff; forecast.trained_at = result.trained_at;
      forecast.dataset_label = result.dataset_label; forecast.statistically_weak = result.statistically_weak;
    }
    if (forecast.model_version && forecast.model_version !== FORECAST_MODEL_VERSION) {
      throw new Error("Forecast model version is not compatible");
    }
    const publicationId = `forecast-${Date.now()}`;
    const first = forecast.forecasts?.[0];
    await ctx.runMutation(internal.forecastData.beginPublication, {
      publicationId,
      modelVersion: forecast.model_version ?? FORECAST_MODEL_VERSION,
      strategy,
      horizonDays: horizon,
      dataCutoff: forecast.data_cutoff ?? "",
      trainedAt: forecast.trained_at ?? "",
      datasetLabel: forecast.dataset_label ?? "sales_aggregate",
      statisticallyWeak: forecast.statistically_weak ?? true,
      uncertaintyLabel: first?.uncertainty_label ?? "unavailable",
    });
    const points = (forecast.forecasts ?? []).flatMap((item) =>
      item.dates.map((forecastDate, index) => ({
        entityType: item.entity_type,
        entityId: item.entity_id,
        forecastDate,
        predictedUnits: item.predicted_units[index] ?? 0,
        lowerUnits: item.lower_units[index] ?? 0,
        upperUnits: item.upper_units[index] ?? 0,
        modelName: item.model,
        confidence: item.confidence,
      }))
    );
    const insights = (forecast.insights ?? []).map((item) => ({
      entityId: item.entity_id,
      productName: names.get(item.entity_id)?.name ?? item.entity_id,
      categoryId: names.get(item.entity_id)?.categoryId ?? "",
      currentStock: item.current_stock ?? undefined,
      forecastUnits: item.forecast_units,
      daysRemaining: item.days_remaining ?? undefined,
      stockoutRisk: item.stockout_risk,
      trend: item.trend,
      slowMoving: item.slow_moving,
      highDemand: item.high_demand,
      reorderQuantity: item.reorder_quantity ?? undefined,
      reorderNote: item.reorder_note,
      modelName: item.model,
      confidence: item.confidence,
    }));
    let batchIndex = 0;
    for (const group of chunk(points, 40)) {
      await ctx.runMutation(internal.forecastData.addForecastRows, {
        publicationId,
        batchKey: `points:${batchIndex++}`,
        points: group,
        insights: [],
      });
    }
    for (const group of chunk(insights, 20)) {
      await ctx.runMutation(internal.forecastData.addForecastRows, {
        publicationId,
        points: [],
        batchKey: `insights:${batchIndex++}`,
        insights: group,
      });
    }
    await ctx.runMutation(internal.forecastData.finishPublication, { publicationId, pointCount: points.length, insightCount: insights.length });
    return { publicationId, products: productSeries.length };
  },
});
