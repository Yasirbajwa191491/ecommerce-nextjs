import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { enrichProduct, enrichProducts } from "./lib/products";
import { isPromotionActive } from "./lib/promotions/isActive";
import { getActivePromotionsForProduct } from "./lib/promotions/evaluate";
import {
  enrichPromotionForStorefront,
  resolveGetProductId,
} from "./lib/promotions/storefrontEnrich";
import {
  promotionStatusValidator,
  promotionTypeValidator,
  promotionTypeLabel,
} from "./lib/promotions/types";

const promotionFields = {
  type: promotionTypeValidator,
  name: v.string(),
  description: v.optional(v.string()),
  promotionMessage: v.optional(v.string()),
  bannerText: v.optional(v.string()),
  buyProductId: v.id("products"),
  buyQuantity: v.number(),
  getProductId: v.optional(v.id("products")),
  getQuantity: v.number(),
  startAt: v.number(),
  endAt: v.number(),
  status: promotionStatusValidator,
};

function validatePromotionInput(args: {
  type: Doc<"productPromotions">["type"];
  buyQuantity: number;
  getQuantity: number;
  getProductId?: Id<"products">;
  buyProductId: Id<"products">;
  startAt: number;
  endAt: number;
}) {
  if (args.buyQuantity < 1) throw new Error("Buy quantity must be at least 1");
  if (args.getQuantity < 1) throw new Error("Get quantity must be at least 1");
  if (args.endAt <= args.startAt) {
    throw new Error("End date must be after start date");
  }
  if (args.type === "bogo" || args.type === "buy_x_get_y") {
    if (!args.getProductId && args.type !== "bogo") {
      throw new Error("Free product is required for this promotion type");
    }
  }
  if (
    (args.type === "free_gift" || args.type === "cross_product") &&
    !args.getProductId
  ) {
    throw new Error("Gift product is required");
  }
  if (args.getProductId && args.getProductId === args.buyProductId && args.type === "cross_product") {
    throw new Error("Cross-product promotions require different products");
  }
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(promotionStatusValidator),
    type: v.optional(promotionTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let promotions = await ctx.db.query("productPromotions").collect();

    if (args.status) {
      promotions = promotions.filter((p) => p.status === args.status);
    }
    if (args.type) {
      promotions = promotions.filter((p) => p.type === args.type);
    }
    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      promotions = promotions.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description?.toLowerCase().includes(term) ?? false)
      );
    }

    promotions.sort((a, b) => b.updatedAt - a.updatedAt);
    const page = paginateArray(promotions, args.paginationOpts);

    const enriched = await Promise.all(
      page.page.map(async (promotion) => {
        const buyProduct = await ctx.db.get(promotion.buyProductId);
        const getId = resolveGetProductId(
          promotion.type,
          promotion.buyProductId,
          promotion.getProductId
        );
        const getProduct = getId ? await ctx.db.get(getId) : null;
        return {
          ...promotion,
          buyProductName: buyProduct?.name ?? "—",
          getProductName: getProduct?.name ?? "—",
        };
      })
    );

    return { ...page, page: enriched };
  },
});

export const countByStatus = query({
  args: {},
  returns: v.object({
    active: v.number(),
    inactive: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const promotions = await ctx.db.query("productPromotions").collect();
    return {
      active: promotions.filter((p) => p.status === "active").length,
      inactive: promotions.filter((p) => p.status === "inactive").length,
    };
  },
});

export const getById = query({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promotion = await ctx.db.get(args.id);
    if (!promotion) return null;
    const buyProductDoc = await ctx.db.get(promotion.buyProductId);
    const buyProduct = buyProductDoc
      ? await enrichProduct(ctx, buyProductDoc)
      : null;
    const getId = resolveGetProductId(
      promotion.type,
      promotion.buyProductId,
      promotion.getProductId
    );
    const getProductDoc = getId ? await ctx.db.get(getId) : null;
    const getProduct = getProductDoc
      ? await enrichProduct(ctx, getProductDoc)
      : null;
    return { promotion, buyProduct, getProduct };
  },
});

export const listForProduct = query({
  args: {
    productId: v.id("products"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promotions = await ctx.db
      .query("productPromotions")
      .collect();
    const linked = promotions.filter(
      (p) =>
        p.buyProductId === args.productId ||
        p.getProductId === args.productId
    );
    return linked.map((p) => ({
      _id: p._id,
      name: p.name,
      type: p.type,
      typeLabel: promotionTypeLabel(p.type),
      isActive: isPromotionActive(p, args.now),
      status: p.status,
    }));
  },
});

export const getActiveForProduct = query({
  args: {
    productId: v.id("products"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const promotions = await getActivePromotionsForProduct(
      ctx,
      args.productId,
      args.now
    );
    return Promise.all(
      promotions.map((p) => enrichPromotionForStorefront(ctx, p, args.now))
    );
  },
});

export const getActiveCount = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const promotions = await ctx.db
      .query("productPromotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return promotions.filter((p) => isPromotionActive(p, args.now)).length;
  },
});

export const listActiveForStorefront = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const promotions = await ctx.db
      .query("productPromotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const active = promotions.filter((p) => isPromotionActive(p, args.now));
    active.sort((a, b) => b.updatedAt - a.updatedAt);
    return Promise.all(
      active.map((p) => enrichPromotionForStorefront(ctx, p, args.now))
    );
  },
});

export const getStorefrontById = query({
  args: {
    id: v.id("productPromotions"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion || !isPromotionActive(promotion, args.now)) return null;
    return enrichPromotionForStorefront(ctx, promotion, args.now);
  },
});

export const create = mutation({
  args: promotionFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validatePromotionInput(args);
    const buyProduct = await ctx.db.get(args.buyProductId);
    if (!buyProduct) throw new Error("Buy product not found");
    const getProductId = resolveGetProductId(
      args.type,
      args.buyProductId,
      args.getProductId
    );
    if (getProductId) {
      const getProduct = await ctx.db.get(getProductId);
      if (!getProduct) throw new Error("Free/gift product not found");
    }
    const now = Date.now();
    return await ctx.db.insert("productPromotions", {
      ...args,
      getProductId,
      viewCount: 0,
      clickCount: 0,
      conversionCount: 0,
      ordersCount: 0,
      revenueGenerated: 0,
      freeProductsGiven: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("productPromotions"),
    ...promotionFields,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Promotion not found");
    validatePromotionInput(data);
    const getProductId = resolveGetProductId(
      data.type,
      data.buyProductId,
      data.getProductId
    );
    if (getProductId) {
      const getProduct = await ctx.db.get(getProductId);
      if (!getProduct) throw new Error("Free/gift product not found");
    }
    await ctx.db.patch(id, {
      ...data,
      getProductId,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const activate = mutation({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "active", updatedAt: Date.now() });
  },
});

export const deactivate = mutation({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "inactive", updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const recordView = mutation({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) return;
    await ctx.db.patch(args.id, {
      viewCount: promotion.viewCount + 1,
      updatedAt: Date.now(),
    });
  },
});

export const recordClick = mutation({
  args: { id: v.id("productPromotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) return;
    await ctx.db.patch(args.id, {
      clickCount: promotion.clickCount + 1,
      updatedAt: Date.now(),
    });
  },
});

export const incrementOrderAnalytics = internalMutation({
  args: {
    summaries: v.array(
      v.object({
        promotionId: v.id("productPromotions"),
        freeQuantity: v.number(),
        savingsAmount: v.number(),
        orderRevenue: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const summary of args.summaries) {
      const promotion = await ctx.db.get(summary.promotionId);
      if (!promotion) continue;
      await ctx.db.patch(summary.promotionId, {
        conversionCount: promotion.conversionCount + 1,
        ordersCount: promotion.ordersCount + 1,
        revenueGenerated: promotion.revenueGenerated + summary.orderRevenue,
        freeProductsGiven: promotion.freeProductsGiven + summary.freeQuantity,
        updatedAt: Date.now(),
      });
    }
  },
});
