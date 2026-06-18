import { internalQuery } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { isPromotionActive } from "../lib/promotions/isActive";
import { getActivePromotionsForProduct } from "../lib/promotions/evaluate";
import {
  formatPromotionEndsAtVoice,
  formatPromotionOfferLine,
} from "../lib/promotions/offerCopy";
import { enrichPromotionForStorefront } from "../lib/promotions/storefrontEnrich";
import { promotionTypeValidator } from "../lib/promotions/types";

export const vapiPromotionSummaryValidator = v.object({
  id: v.string(),
  name: v.string(),
  offerLine: v.string(),
  type: promotionTypeValidator,
  buyProductId: v.string(),
  buyProductName: v.string(),
  getProductName: v.optional(v.string()),
  buyQuantity: v.number(),
  getQuantity: v.number(),
  endAt: v.number(),
  endsLabel: v.string(),
  description: v.optional(v.string()),
  promotionMessage: v.optional(v.string()),
});

export type VapiPromotionSummary = {
  id: string;
  name: string;
  offerLine: string;
  type: "bogo" | "buy_x_get_y" | "free_gift" | "cross_product";
  buyProductId: string;
  buyProductName: string;
  getProductName?: string;
  buyQuantity: number;
  getQuantity: number;
  endAt: number;
  endsLabel: string;
  description?: string;
  promotionMessage?: string;
};

export function toVapiPromotionSummary(
  enriched: Awaited<ReturnType<typeof enrichPromotionForStorefront>>,
  now: number
): VapiPromotionSummary {
  const offerLine = formatPromotionOfferLine({
    type: enriched.type,
    buyProductName: enriched.buyProductName,
    getProductName: enriched.getProductName || undefined,
    buyQuantity: enriched.buyQuantity,
    getQuantity: enriched.getQuantity,
  });

  return {
    id: enriched._id,
    name: enriched.name,
    offerLine,
    type: enriched.type,
    buyProductId: enriched.buyProductId,
    buyProductName: enriched.buyProductName,
    getProductName: enriched.getProductName || undefined,
    buyQuantity: enriched.buyQuantity,
    getQuantity: enriched.getQuantity,
    endAt: enriched.endAt,
    endsLabel: formatPromotionEndsAtVoice(enriched.endAt, now),
    description: enriched.description || undefined,
    promotionMessage: enriched.promotionMessage || undefined,
  };
}

export const getActivePromotions = internalQuery({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    promotions: v.array(vapiPromotionSummaryValidator),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 20);
    const promotions = await ctx.db
      .query("productPromotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const active = promotions.filter((p) => isPromotionActive(p, args.now));
    active.sort((a, b) => b.updatedAt - a.updatedAt);
    const page = active.slice(0, limit);
    const enriched = await Promise.all(
      page.map((p) => enrichPromotionForStorefront(ctx, p, args.now))
    );
    const summaries = enriched.map((p) => toVapiPromotionSummary(p, args.now));
    return { promotions: summaries, count: summaries.length };
  },
});

export const getPromotionsForProduct = internalQuery({
  args: {
    productId: v.id("products"),
    now: v.number(),
  },
  returns: v.object({
    productId: v.id("products"),
    promotions: v.array(vapiPromotionSummaryValidator),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const promotions = await getActivePromotionsForProduct(
      ctx,
      args.productId,
      args.now
    );
    const enriched = await Promise.all(
      promotions.map((p) => enrichPromotionForStorefront(ctx, p, args.now))
    );
    const summaries = enriched.map((p) => toVapiPromotionSummary(p, args.now));
    return {
      productId: args.productId,
      promotions: summaries,
      count: summaries.length,
    };
  },
});

export async function loadProductPromotionSummaries(
  ctx: QueryCtx,
  productId: Id<"products">,
  now: number
): Promise<VapiPromotionSummary[]> {
  const promotions = await getActivePromotionsForProduct(ctx, productId, now);
  const enriched = await Promise.all(
    promotions.map((p) => enrichPromotionForStorefront(ctx, p, now))
  );
  return enriched.map((p) => toVapiPromotionSummary(p, now));
}
