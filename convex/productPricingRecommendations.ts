import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { paginateArray } from "./lib/pagination";
import { requireAdmin } from "./lib/requireAdmin";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";
import {
  pricingHealthStatusValidator,
  productPricingResultValidator,
} from "./lib/ai/productPricingTypes";

export const getCachedRecommendation = internalQuery({
  args: {
    productId: v.id("products"),
    currentPrice: v.number(),
    stock: v.number(),
    referenceNow: v.number(),
    cacheTtlMs: v.number(),
  },
  returns: v.union(productPricingResultValidator, v.null()),
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("aiPricingRecommendations")
      .withIndex("by_product_created", (q) => q.eq("productId", args.productId))
      .order("desc")
      .first();

    if (!latest) return null;
    if (args.referenceNow - latest.createdAt > args.cacheTtlMs) return null;
    if (latest.currentPrice !== args.currentPrice) return null;
    if (latest.status === "dismissed") return null;

    const product = await ctx.db.get(args.productId);
    if (!product || product.stock !== args.stock) return null;

    return {
      recommendationId: latest._id,
      currentPrice: latest.currentPrice,
      suggestedPrice: latest.suggestedPrice,
      minRecommendedPrice: latest.minRecommendedPrice,
      maxRecommendedPrice: latest.maxRecommendedPrice,
      confidence: latest.confidence,
      healthStatus: latest.healthStatus,
      reasoning: latest.reasoning,
      currency: latest.currency,
      cached: true,
    };
  },
});

export const storeRecommendation = internalMutation({
  args: {
    productId: v.optional(v.id("products")),
    adminUserId: v.string(),
    productName: v.string(),
    currentPrice: v.number(),
    suggestedPrice: v.number(),
    minRecommendedPrice: v.number(),
    maxRecommendedPrice: v.number(),
    confidence: v.number(),
    healthStatus: pricingHealthStatusValidator,
    reasoning: v.array(v.string()),
    currency: v.string(),
    source: v.union(v.literal("product_form"), v.literal("copilot")),
    createdAt: v.number(),
  },
  returns: v.id("aiPricingRecommendations"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiPricingRecommendations", {
      ...args,
      status: "pending",
    });
  },
});

export const listByProduct = query({
  args: {
    productId: v.id("products"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const recommendations = await ctx.db
      .query("aiPricingRecommendations")
      .withIndex("by_product_created", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();
    return paginateArray(recommendations, args.paginationOpts);
  },
});

export const listRecent = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const recommendations = await ctx.db
      .query("aiPricingRecommendations")
      .withIndex("by_admin_created", (q) =>
        q.eq("adminUserId", admin._id)
      )
      .order("desc")
      .collect();
    return paginateArray(recommendations, args.paginationOpts);
  },
});

export const dismissRecommendation = mutation({
  args: {
    recommendationId: v.id("aiPricingRecommendations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rec = await ctx.db.get(args.recommendationId);
    if (!rec) throw new Error("Recommendation not found");
    await ctx.db.patch(args.recommendationId, { status: "dismissed" });
    return null;
  },
});

export const applyPricingRecommendation = mutation({
  args: {
    productId: v.id("products"),
    suggestedPrice: v.number(),
    recommendationId: v.optional(v.id("aiPricingRecommendations")),
    confidence: v.optional(v.number()),
  },
  returns: v.object({
    price: v.number(),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.suggestedPrice < 0.01) {
      throw new Error("Price must be at least 0.01");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const oldPrice = product.price;
    await ctx.db.patch(args.productId, { price: args.suggestedPrice });

    if (args.recommendationId) {
      const rec = await ctx.db.get(args.recommendationId);
      if (rec && rec.productId === args.productId) {
        await ctx.db.patch(args.recommendationId, { status: "applied" });
      }
    }

    const confidenceLabel =
      args.confidence !== undefined ? `, confidence ${args.confidence}%` : "";

    await insertAdminActivityLog(ctx, {
      type: "product_price_updated",
      title: "Price updated",
      description: `${product.name}: ${oldPrice} → ${args.suggestedPrice} ${product.currency ?? "USD"} (AI recommendation${confidenceLabel})`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name,
      relatedProductId: args.productId,
      createdAt: Date.now(),
    });

    return { price: args.suggestedPrice };
  },
});
