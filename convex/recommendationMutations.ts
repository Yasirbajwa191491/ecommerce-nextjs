import { v } from "convex/values";
import {
  internalMutation,
  mutation,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  customerBehaviorEventTypeValidator,
  recommendationIdentityTypeValidator,
  recommendationInteractionTypeValidator,
  recommendationSectionTypeValidator,
  recommendationSourceValidator,
} from "./lib/recommendations/validators";
import {
  applyCustomerEmbedding,
  getOrCreateProfile,
  mergeVisitorIntoCustomer,
  rebuildProfileFromSignals,
} from "./lib/recommendations/profileBuilder";
import { resolveCustomerKey } from "./lib/recommendations/identity";
import { PROFILE_REFRESH_DEBOUNCE_MS } from "./lib/recommendations/constants";
import { scheduleRecommendationRefresh } from "./lib/recommendations/scheduleRecommendationJob";

export const recordBehaviorEvent = mutation({
  args: {
    eventType: customerBehaviorEventTypeValidator,
    visitorId: v.string(),
    sessionId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    categoryId: v.optional(v.id("productCategories")),
    query: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const customerKey = resolveCustomerKey(
      args.customerEmail,
      args.customerPhone
    );
    const now = Date.now();

    const weightMap: Record<string, number> = {
      purchase: 1.0,
      review: 0.7,
      cart_add: 0.5,
      wishlist_add: 0.5,
      voice_query: 0.45,
      voice_recommendation: 0.45,
      search: 0.2,
      view: 0.25,
      cart_remove: 0.1,
      wishlist_remove: 0.1,
    };

    await ctx.db.insert("customerBehaviorEvents", {
      eventType: args.eventType,
      visitorId: args.visitorId,
      sessionId: args.sessionId,
      customerKey,
      productId: args.productId,
      categoryId: args.categoryId,
      query: args.query,
      metadata: args.metadata,
      weight: weightMap[args.eventType] ?? 0.1,
      occurredAt: now,
    });

    const identityType = customerKey ? ("customer" as const) : ("visitor" as const);
    const identityKey = customerKey ?? args.visitorId;

    await getOrCreateProfile(
      ctx,
      identityType,
      identityKey,
      args.customerEmail?.trim().toLowerCase()
    );

    await ctx.db
      .query("customerRecommendationProfiles")
      .withIndex("by_identity", (q) =>
        q.eq("identityType", identityType).eq("identityKey", identityKey)
      )
      .unique()
      .then(async (profile) => {
        if (!profile) return;
        const recentlyViewed = [...profile.recentlyViewedProductIds];
        if (args.eventType === "view" && args.productId) {
          const filtered = recentlyViewed.filter((id) => id !== args.productId);
          filtered.unshift(args.productId);
          await ctx.db.patch(profile._id, {
            recentlyViewedProductIds: filtered.slice(0, 20),
            lastActivityAt: now,
            updatedAt: now,
          });
        } else {
          await ctx.db.patch(profile._id, {
            lastActivityAt: now,
            updatedAt: now,
          });
        }
      });

    await scheduleRecommendationRefresh(ctx, {
      identityType,
      identityKey,
      jobType: "profile_refresh",
      triggeredBy: args.eventType,
      debounceMs: PROFILE_REFRESH_DEBOUNCE_MS,
    });

    return null;
  },
});

export const recordBehaviorEventsBatch = mutation({
  args: {
    visitorId: v.string(),
    sessionId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    events: v.array(
      v.object({
        eventType: customerBehaviorEventTypeValidator,
        productId: v.optional(v.id("products")),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const customerKey = resolveCustomerKey(args.customerEmail);
    const now = Date.now();

    for (const event of args.events) {
      await ctx.db.insert("customerBehaviorEvents", {
        eventType: event.eventType,
        visitorId: args.visitorId,
        sessionId: args.sessionId,
        customerKey,
        productId: event.productId,
        weight: event.eventType === "cart_add" ? 0.5 : 0.1,
        occurredAt: now,
      });
    }

    const identityType = customerKey ? ("customer" as const) : ("visitor" as const);
    const identityKey = customerKey ?? args.visitorId;
    await getOrCreateProfile(ctx, identityType, identityKey, customerKey);

    await scheduleRecommendationRefresh(ctx, {
      identityType,
      identityKey,
      jobType: "profile_refresh",
      triggeredBy: "cart_batch",
      debounceMs: PROFILE_REFRESH_DEBOUNCE_MS,
    });

    return null;
  },
});

export const linkVisitorToCustomer = mutation({
  args: {
    visitorId: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const customerKey = resolveCustomerKey(args.email, args.phone);
    if (!customerKey) return null;

    await mergeVisitorIntoCustomer(
      ctx,
      args.visitorId,
      customerKey,
      args.email?.trim().toLowerCase()
    );

    await scheduleRecommendationRefresh(ctx, {
      identityType: "customer",
      identityKey: customerKey,
      jobType: "embedding_refresh",
      triggeredBy: "identity_merge",
    });

    return null;
  },
});

export const toggleWishlistItem = mutation({
  args: {
    visitorId: v.string(),
    customerEmail: v.optional(v.string()),
    productId: v.id("products"),
    add: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const customerKey = resolveCustomerKey(args.customerEmail);
    const identityType = customerKey ? ("customer" as const) : ("visitor" as const);
    const identityKey = customerKey ?? args.visitorId;

    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_identity_product", (q) =>
        q
          .eq("identityType", identityType)
          .eq("identityKey", identityKey)
          .eq("productId", args.productId)
      )
      .unique();

    if (args.add) {
      if (!existing) {
        await ctx.db.insert("wishlistItems", {
          identityType,
          identityKey,
          productId: args.productId,
          addedAt: Date.now(),
        });
      }
      await ctx.db.insert("customerBehaviorEvents", {
        eventType: "wishlist_add",
        visitorId: args.visitorId,
        customerKey,
        productId: args.productId,
        weight: 0.5,
        occurredAt: Date.now(),
      });
      return true;
    }

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("customerBehaviorEvents", {
      eventType: "wishlist_remove",
      visitorId: args.visitorId,
      customerKey,
      productId: args.productId,
      weight: 0.1,
      occurredAt: Date.now(),
    });
    return false;
  },
});

export const recordRecommendationInteraction = mutation({
  args: {
    eventType: recommendationInteractionTypeValidator,
    sectionType: recommendationSectionTypeValidator,
    productId: v.id("products"),
    visitorId: v.optional(v.string()),
    customerKey: v.optional(v.string()),
    cacheKey: v.optional(v.string()),
    source: v.optional(recommendationSourceValidator),
    revenue: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("recommendationEvents", {
      eventType: args.eventType,
      sectionType: args.sectionType,
      productId: args.productId,
      visitorId: args.visitorId,
      customerKey: args.customerKey,
      cacheKey: args.cacheKey,
      source: args.source,
      revenue: args.revenue,
      occurredAt: now,
    });

    const date = new Date(now).toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("recommendationAnalytics")
      .withIndex("by_date_section", (q) =>
        q.eq("date", date).eq("sectionType", args.sectionType)
      )
      .filter((q) => q.eq(q.field("source"), args.source ?? "personalized"))
      .first();

    const patch = {
      impressions: (existing?.impressions ?? 0) + (args.eventType === "impression" ? 1 : 0),
      clicks: (existing?.clicks ?? 0) + (args.eventType === "click" ? 1 : 0),
      conversions:
        (existing?.conversions ?? 0) + (args.eventType === "conversion" ? 1 : 0),
      revenue: (existing?.revenue ?? 0) + (args.revenue ?? 0),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("recommendationAnalytics", {
        date,
        sectionType: args.sectionType,
        source: args.source ?? "personalized",
        impressions: patch.impressions,
        clicks: patch.clicks,
        conversions: patch.conversions,
        revenue: patch.revenue,
        n8nUsed: false,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const saveRecommendationCache = internalMutation({
  args: {
    cacheKey: v.string(),
    sectionType: recommendationSectionTypeValidator,
    productIds: v.array(v.id("products")),
    scores: v.array(v.number()),
    explanations: v.optional(v.string()),
    source: recommendationSourceValidator,
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("recommendationCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();

    const payload = {
      cacheKey: args.cacheKey,
      sectionType: args.sectionType,
      productIds: args.productIds,
      scores: args.scores,
      explanations: args.explanations,
      source: args.source,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("recommendationCache", payload);
    }
    return null;
  },
});

export const saveRecommendationProfile = internalMutation({
  args: {
    identityType: recommendationIdentityTypeValidator,
    identityKey: v.string(),
    aiInterestSummary: v.optional(v.string()),
    segments: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.float64())),
    embeddingProvider: v.optional(v.string()),
    embeddingVersion: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await getOrCreateProfile(
      ctx,
      args.identityType,
      args.identityKey
    );

    await ctx.db.patch(profile._id, {
      aiInterestSummary: args.aiInterestSummary ?? profile.aiInterestSummary,
      segments: args.segments ?? profile.segments,
      embedding: args.embedding ?? profile.embedding,
      embeddingProvider: args.embeddingProvider ?? profile.embeddingProvider,
      embeddingVersion: args.embeddingVersion ?? profile.embeddingVersion,
      embeddingUpdatedAt: args.embedding ? Date.now() : profile.embeddingUpdatedAt,
      profileRefreshedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const rebuildCoOccurrenceBatch = internalMutation({
  args: {
    cursor: v.optional(v.id("orders")),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processedOrders: v.number(),
    nextCursor: v.optional(v.id("orders")),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batchSize = Math.min(args.batchSize ?? 20, 50);
    const ordersQuery = ctx.db.query("orders").order("asc");
    const orders = args.cursor
      ? await ordersQuery
          .filter((q) => q.gt(q.field("_id"), args.cursor!))
          .take(batchSize)
      : await ordersQuery.take(batchSize);

    const pairCounts = new Map<string, number>();

    for (const order of orders) {
      if (order.paymentStatus !== "paid") continue;
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .collect();
      const productIds = items.map((item) => item.productId);
      for (let i = 0; i < productIds.length; i++) {
        for (let j = 0; j < productIds.length; j++) {
          if (i === j) continue;
          const key = `${productIds[i] as string}:${productIds[j] as string}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const now = Date.now();
    for (const [key, count] of pairCounts.entries()) {
      const [productId, relatedProductId] = key.split(":") as [
        Id<"products">,
        Id<"products">,
      ];
      const existing = await ctx.db
        .query("productCoOccurrence")
        .withIndex("by_product_related", (q) =>
          q.eq("productId", productId).eq("relatedProductId", relatedProductId)
        )
        .unique();

      const score = count;
      if (existing) {
        await ctx.db.patch(existing._id, {
          coPurchaseCount: existing.coPurchaseCount + count,
          score: existing.score + score,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("productCoOccurrence", {
          productId,
          relatedProductId,
          coPurchaseCount: count,
          score,
          updatedAt: now,
        });
      }
    }

    const nextCursor = orders.length > 0 ? orders[orders.length - 1]!._id : undefined;
    return {
      processedOrders: orders.length,
      nextCursor: orders.length === batchSize ? nextCursor : undefined,
      isDone: orders.length < batchSize,
    };
  },
});

export const recordPurchaseBehaviorForOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    visitorId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const customerKey = order.customerEmail.trim().toLowerCase();
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .collect();

    const now = Date.now();
    for (const item of items) {
      await ctx.db.insert("customerBehaviorEvents", {
        eventType: "purchase",
        visitorId: args.visitorId ?? `order:${args.orderId}`,
        customerKey,
        productId: item.productId,
        weight: 1.0,
        occurredAt: now,
      });
    }

    if (args.visitorId) {
      await mergeVisitorIntoCustomer(ctx, args.visitorId, customerKey, customerKey);
    } else {
      await rebuildProfileFromSignals(ctx, "customer", customerKey);
    }

    return null;
  },
});

export const markJobProcessing = internalMutation({
  args: {
    jobId: v.id("recommendationJobs"),
    processedBy: v.union(v.literal("convex"), v.literal("n8n")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
      processedBy: args.processedBy,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markJobComplete = internalMutation({
  args: {
    jobId: v.id("recommendationJobs"),
    processedBy: v.union(v.literal("convex"), v.literal("n8n")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "complete",
      processedBy: args.processedBy,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markJobFailed = internalMutation({
  args: {
    jobId: v.id("recommendationJobs"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const attempts = job.attempts + 1;
    const failed = attempts >= job.maxAttempts;
    await ctx.db.patch(args.jobId, {
      status: failed ? "failed" : "retry_scheduled",
      attempts,
      error: args.error,
      nextRetryAt: failed ? undefined : Date.now() + 60_000,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const rebuildProfileInternal = internalMutation({
  args: {
    identityType: recommendationIdentityTypeValidator,
    identityKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rebuildProfileFromSignals(ctx, args.identityType, args.identityKey);
    return null;
  },
});

export const applyEmbeddingInternal = internalMutation({
  args: {
    identityType: recommendationIdentityTypeValidator,
    identityKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("customerRecommendationProfiles")
      .withIndex("by_identity", (q) =>
        q.eq("identityType", args.identityType).eq("identityKey", args.identityKey)
      )
      .unique();
    if (!profile) return null;

    await applyCustomerEmbedding(ctx, profile._id);
    return null;
  },
});
