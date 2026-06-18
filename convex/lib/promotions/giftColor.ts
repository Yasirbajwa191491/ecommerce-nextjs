import type { Doc, Id } from "../../_generated/dataModel";
import type { CartLineInput } from "../orderPricing";
import { primaryColorForProduct, resolveProductColor } from "../cartLines";

/**
 * Pick a valid color for a promotion gift line.
 * Cross-product gifts must use the gift product's palette — never the buy product's cart color.
 */
export function resolvePromotionGiftColor(
  mergedLines: CartLineInput[],
  promotion: Pick<Doc<"productPromotions">, "buyProductId">,
  getProductId: Id<"products">,
  getProductColors: string[]
): string | null {
  const sameProduct = getProductId === promotion.buyProductId;

  const fromGiftInCart = primaryColorForProduct(mergedLines, getProductId);
  const fromBuyInCart = sameProduct
    ? primaryColorForProduct(mergedLines, promotion.buyProductId)
    : undefined;
  const fallback = getProductColors[0];

  const candidate = fromGiftInCart ?? fromBuyInCart ?? fallback;
  if (!candidate) return null;

  return resolveProductColor(getProductColors, candidate);
}
