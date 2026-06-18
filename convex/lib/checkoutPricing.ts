import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { CartLineInput, OrderTotals, PricedLineItem } from "./orderPricing";
import { mergeCartLines } from "./cartLines";
import { priceCartLines } from "./orderPricing";
import { evaluatePromotionsForCart } from "./promotions/evaluate";
import { mergePricedCartWithPromotions } from "./promotions/apply";
import type { AppliedPromotionSummary } from "./promotions/types";

type DbCtx = QueryCtx | MutationCtx;

export type CheckoutPricingResult = OrderTotals & {
  items: PricedLineItem[];
  promotionSummaries: AppliedPromotionSummary[];
  promotionSavingsTotal: number;
};

export async function priceCheckoutCart(
  ctx: DbCtx,
  lines: CartLineInput[],
  now: number
): Promise<CheckoutPricingResult> {
  const mergedLines = mergeCartLines(lines);
  const priced = await priceCartLines(ctx, mergedLines);
  const evaluation = await evaluatePromotionsForCart(ctx, mergedLines, now);
  const items = mergePricedCartWithPromotions(priced.items, evaluation);

  return {
    ...priced,
    items,
    discountTotal: priced.discountTotal + evaluation.totalPromotionSavings,
    promotionSummaries: evaluation.summaries,
    promotionSavingsTotal: evaluation.totalPromotionSavings,
  };
}
