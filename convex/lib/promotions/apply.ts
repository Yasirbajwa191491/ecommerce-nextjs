import type { PricedLineItem } from "../orderPricing";
import type { PromotionEvaluationResult } from "./evaluate";
import type { PromotionGiftLine } from "./types";

export function giftLinesToPricedItems(
  gifts: PromotionGiftLine[]
): PricedLineItem[] {
  return gifts.map((gift) => ({
    productId: gift.productId,
    productName: gift.productName,
    color: gift.color,
    quantity: gift.quantity,
    unitPrice: 0,
    lineTotal: 0,
    imageUrl: gift.imageUrl,
    originalUnitPrice: gift.savingsAmount / gift.quantity,
    discountPercent: 0,
    discountAmount: gift.savingsAmount / gift.quantity,
    lineDiscountTotal: gift.savingsAmount,
    finalUnitPrice: 0,
    originalLineSubtotal: gift.savingsAmount,
    shippingCharge: 0,
    lineShippingTotal: 0,
    isPromotionGift: true,
    promotionId: gift.promotionId,
    promotionName: gift.promotionName,
  }));
}

export function mergePricedCartWithPromotions(
  pricedItems: PricedLineItem[],
  evaluation: PromotionEvaluationResult
): PricedLineItem[] {
  if (evaluation.gifts.length === 0) return pricedItems;
  return [...pricedItems, ...giftLinesToPricedItems(evaluation.gifts)];
}
