import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import {
  PYTHON_ML_RECOMMENDATION_STRATEGY_KEY,
  parsePythonMlStrategy,
} from "./lib/recommendations/pythonMlConfig";
import {
  isAuthoritativePurchase,
  mapBehaviorEventType,
} from "./lib/recommendations/behavioralExport";

const strategyValidator = v.union(
  v.literal("content"),
  v.literal("collaborative"),
  v.literal("hybrid")
);

const shadowRunValidator = v.object({
  status: v.union(
    v.literal("running"),
    v.literal("complete"),
    v.literal("skipped"),
    v.literal("failed")
  ),
  requestedStrategy: strategyValidator,
  modelAvailable: v.boolean(),
  comparedCount: v.number(),
  fallbackCount: v.number(),
  overlapAtK: v.optional(v.number()),
  rankAgreement: v.optional(v.number()),
  candidateCoverage: v.optional(v.number()),
  validCandidateRate: v.optional(v.number()),
  latencyMs: v.optional(v.number()),
  errorCode: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

export const getPythonMlAdminStatus = query({
  args: {},
  returns: v.object({
    recorded: v.boolean(),
    strategy: strategyValidator,
    latest: v.union(shadowRunValidator, v.null()),
    note: v.string(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", PYTHON_ML_RECOMMENDATION_STRATEGY_KEY))
      .unique();
    const latest = await ctx.db.query("pythonMlShadowRuns").withIndex("by_created").order("desc").take(1);
    const row = latest[0] ?? null;
    return {
      recorded: row !== null && row.status !== "running",
      strategy: parsePythonMlStrategy(setting?.value),
      latest: row
        ? {
            status: row.status,
            requestedStrategy: row.requestedStrategy,
            modelAvailable: row.modelAvailable,
            comparedCount: row.comparedCount,
            fallbackCount: row.fallbackCount,
            overlapAtK: row.overlapAtK,
            rankAgreement: row.rankAgreement,
            candidateCoverage: row.candidateCoverage,
            validCandidateRate: row.validCandidateRate,
            latencyMs: row.latencyMs,
            errorCode: row.errorCode,
            createdAt: row.createdAt,
            completedAt: row.completedAt,
          }
        : null,
      note: "Overlap with the current engine is not a quality or revenue result. No shadow run is fabricated when Python has not been called.",
    };
  },
});

export const listShadowAnchors = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      productId: v.string(),
      convexProductIds: v.array(v.string()),
    })
  ),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").withIndex("by_name").take(5);
    const anchors = [];
    for (const product of products) {
      const related = await ctx.db
        .query("productCoOccurrence")
        .withIndex("by_product_score", (q) => q.eq("productId", product._id))
        .take(8);
      anchors.push({
        productId: product._id,
        convexProductIds: related.map((item) => item.relatedProductId),
      });
    }
    return anchors;
  },
});

export const finishShadowRun = internalMutation({
  args: {
    runId: v.id("pythonMlShadowRuns"),
    status: v.union(v.literal("complete"), v.literal("skipped"), v.literal("failed")),
    modelAvailable: v.boolean(),
    comparedCount: v.number(),
    fallbackCount: v.number(),
    overlapAtK: v.optional(v.number()),
    rankAgreement: v.optional(v.number()),
    candidateCoverage: v.optional(v.number()),
    validCandidateRate: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    summaryJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const summaryJson = args.summaryJson.slice(0, 8000);
    await ctx.db.patch(args.runId, {
      status: args.status,
      modelAvailable: args.modelAvailable,
      comparedCount: args.comparedCount,
      fallbackCount: args.fallbackCount,
      overlapAtK: args.overlapAtK,
      rankAgreement: args.rankAgreement,
      candidateCoverage: args.candidateCoverage,
      validCandidateRate: args.validCandidateRate,
      latencyMs: args.latencyMs,
      errorCode: args.errorCode,
      summaryJson,
      completedAt: Date.now(),
    });
    return null;
  },
});

const exportEventValidator = v.object({
  eventId: v.string(),
  eventType: v.string(),
  productId: v.string(),
  visitorSeed: v.string(),
  occurredAt: v.number(),
  placement: v.union(v.string(), v.null()),
  orderSeed: v.union(v.string(), v.null()),
  purchaseAuthoritative: v.boolean(),
});

export const exportBehaviorPage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    events: v.array(exportEventValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("customerBehaviorEvents").order("desc").paginate({
      numItems: Math.min(50, Math.max(1, Math.floor(args.limit))),
      cursor: args.cursor,
    });
    const events = [];
    for (const event of page.page) {
      const mapped = mapBehaviorEventType(event.eventType);
      if (!mapped || !event.productId) continue;
      events.push({
        eventId: event._id,
        eventType: mapped,
        productId: event.productId,
        visitorSeed: event.visitorId,
        occurredAt: event.occurredAt,
        placement: null,
        orderSeed: null,
        purchaseAuthoritative: false,
      });
    }
    return { events, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const exportRecommendationPage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    events: v.array(exportEventValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("recommendationEvents").order("desc").paginate({
      numItems: Math.min(50, Math.max(1, Math.floor(args.limit))),
      cursor: args.cursor,
    });
    const events = [];
    for (const event of page.page) {
      const mapped = mapBehaviorEventType(event.eventType);
      if (!mapped || !event.visitorId) continue;
      events.push({
        eventId: event._id,
        eventType: mapped,
        productId: event.productId,
        visitorSeed: event.visitorId,
        occurredAt: event.occurredAt,
        placement: event.sectionType,
        orderSeed: null,
        purchaseAuthoritative: false,
      });
    }
    return { events, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const exportPurchasePage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    events: v.array(exportEventValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("orders").withIndex("by_created_at").order("desc").paginate({
      numItems: Math.min(20, Math.max(1, Math.floor(args.limit))),
      cursor: args.cursor,
    });
    const events = [];
    for (const order of page.page) {
      if (!isAuthoritativePurchase(order)) continue;
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .take(40);
      for (const item of items) {
        events.push({
          eventId: `${order._id}:${item.productId}`,
          eventType: "purchase",
          productId: item.productId,
          visitorSeed: `purchase-order:${order._id}`,
          occurredAt: order.paidAt ?? order.createdAt,
          placement: null,
          orderSeed: order._id,
          purchaseAuthoritative: true,
        });
      }
    }
    return { events, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});
