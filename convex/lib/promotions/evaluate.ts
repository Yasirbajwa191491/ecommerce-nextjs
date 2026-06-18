import type { QueryCtx, MutationCtx } from "../../_generated/server";

import type { Doc, Id } from "../../_generated/dataModel";

import type { CartLineInput } from "../orderPricing";

import { calculateFinalPrice } from "../pricing";

import { getPrimaryImageUrl } from "../productImages";

import { isProductActive } from "../productActive";

import {

  mergeCartLines,

  quantityByProduct,

} from "../cartLines";

import { isPromotionActive } from "./isActive";

import { resolvePromotionGiftColor } from "./giftColor";

import type { AppliedPromotionSummary, PromotionGiftLine } from "./types";



export type { AppliedPromotionSummary, PromotionGiftLine } from "./types";



type DbCtx = QueryCtx | MutationCtx;



export type PromotionEvaluationResult = {

  gifts: PromotionGiftLine[];

  summaries: AppliedPromotionSummary[];

  totalPromotionSavings: number;

};



type QualifiedPromotion = {

  promotion: Doc<"productPromotions">;

  freeQuantity: number;

  savingsAmount: number;

  getProductId: Id<"products">;

  giftColor: string;

};



export async function evaluatePromotionsForCart(

  ctx: DbCtx,

  lines: CartLineInput[],

  now: number

): Promise<PromotionEvaluationResult> {

  const mergedLines = mergeCartLines(lines);

  const promotions = await ctx.db

    .query("productPromotions")

    .withIndex("by_status", (q) => q.eq("status", "active"))

    .collect();



  const activePromotions = promotions

    .filter((p) => isPromotionActive(p, now))

    .sort((a, b) => b.updatedAt - a.updatedAt);



  if (activePromotions.length === 0) {

    return { gifts: [], summaries: [], totalPromotionSavings: 0 };

  }



  const purchasedQty = quantityByProduct(mergedLines);

  const qualified: QualifiedPromotion[] = [];

  const appliedBuyProductIds = new Set<string>();



  for (const promotion of activePromotions) {

    if (appliedBuyProductIds.has(promotion.buyProductId)) {

      continue;

    }



    const buyQty = purchasedQty.get(promotion.buyProductId) ?? 0;

    if (buyQty < promotion.buyQuantity) continue;



    const getProductId =

      promotion.getProductId ?? promotion.buyProductId;

    const times = Math.floor(buyQty / promotion.buyQuantity);

    let freeQuantity = times * promotion.getQuantity;

    if (freeQuantity <= 0) continue;



    const getProduct = await ctx.db.get(getProductId);

    if (!getProduct || !isProductActive(getProduct)) continue;



    const paidInCart = purchasedQty.get(getProductId) ?? 0;

    const maxGiftable = Math.max(0, getProduct.stock - paidInCart);

    freeQuantity = Math.min(freeQuantity, maxGiftable);

    if (freeQuantity <= 0) continue;



    const giftColor = resolvePromotionGiftColor(

      mergedLines,

      promotion,

      getProductId,

      getProduct.colors

    );

    if (!giftColor) continue;



    const unitRetail = calculateFinalPrice(

      getProduct.price,

      getProduct.discountPercent ?? 0

    );

    const savingsAmount = unitRetail * freeQuantity;



    qualified.push({

      promotion,

      freeQuantity,

      savingsAmount,

      getProductId,

      giftColor,

    });

    appliedBuyProductIds.add(promotion.buyProductId);

  }



  const gifts: PromotionGiftLine[] = [];

  const summaries: AppliedPromotionSummary[] = [];

  const giftQtyByProduct = new Map<string, number>();

  let totalPromotionSavings = 0;



  for (const entry of qualified) {

    const { promotion, freeQuantity, savingsAmount, getProductId, giftColor } =

      entry;

    const getProduct = await ctx.db.get(getProductId);

    if (!getProduct) continue;



    const alreadyGifted = giftQtyByProduct.get(getProductId) ?? 0;

    const paidInCart = purchasedQty.get(getProductId) ?? 0;

    const remainingStock = Math.max(

      0,

      getProduct.stock - paidInCart - alreadyGifted

    );

    const grantedQty = Math.min(freeQuantity, remainingStock);

    if (grantedQty <= 0) continue;



    const grantedSavings =

      (savingsAmount / freeQuantity) * grantedQty;



    gifts.push({

      promotionId: promotion._id,

      promotionType: promotion.type,

      promotionName: promotion.name,

      promotionDescription:

        promotion.promotionMessage ?? promotion.description ?? undefined,

      productId: getProductId,

      productName: getProduct.name,

      color: giftColor,

      quantity: grantedQty,

      savingsAmount: grantedSavings,

      imageUrl: getPrimaryImageUrl(getProduct),

    });



    giftQtyByProduct.set(getProductId, alreadyGifted + grantedQty);

    totalPromotionSavings += grantedSavings;



    summaries.push({

      promotionId: promotion._id,

      promotionType: promotion.type,

      promotionName: promotion.name,

      promotionDescription:

        promotion.promotionMessage ?? promotion.description ?? undefined,

      buyProductId: promotion.buyProductId,

      getProductId:

        getProductId !== promotion.buyProductId ? getProductId : undefined,

      freeQuantity: grantedQty,

      savingsAmount: grantedSavings,

    });

  }



  return { gifts, summaries, totalPromotionSavings };

}



export async function getActivePromotionsForProduct(

  ctx: DbCtx,

  productId: Id<"products">,

  now: number

): Promise<Doc<"productPromotions">[]> {

  const [asBuy, asGet] = await Promise.all([

    ctx.db

      .query("productPromotions")

      .withIndex("by_buy_product", (q) => q.eq("buyProductId", productId))

      .collect(),

    ctx.db

      .query("productPromotions")

      .withIndex("by_get_product", (q) => q.eq("getProductId", productId))

      .collect(),

  ]);



  const seen = new Set<string>();

  const merged: Doc<"productPromotions">[] = [];

  for (const promo of [...asBuy, ...asGet]) {

    if (seen.has(promo._id)) continue;

    seen.add(promo._id);

    if (isPromotionActive(promo, now)) merged.push(promo);

  }

  return merged;

}


