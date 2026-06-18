import type { PromotionType } from "./types";

export type PromotionOfferInput = {
  type: PromotionType;
  buyProductName: string;
  getProductName?: string;
  buyQuantity?: number;
  getQuantity?: number;
};

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function formatPromotionOfferLine(promo: PromotionOfferInput): string {
  const buy = normalizeWhitespace(promo.buyProductName);
  const get = normalizeWhitespace(promo.getProductName || buy);
  const buyQty = promo.buyQuantity ?? 1;
  const getQty = promo.getQuantity ?? 1;

  switch (promo.type) {
    case "bogo":
      if (buy === get) {
        if (buyQty === 1 && getQty === 1) {
          return "Buy One, Get One Free";
        }
        return `Buy ${buyQty}, Get ${getQty} Free`;
      }
      if (buyQty === 1 && getQty === 1) {
        return `Buy ${buy}, Get ${get} Free`;
      }
      return `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
    case "buy_x_get_y":
      if (buyQty === 1 && getQty === 1) {
        return buy === get
          ? "Buy One, Get One Free"
          : `Buy ${buy}, Get ${get} Free`;
      }
      return `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
    case "free_gift":
      return getQty > 1
        ? `${getQty} Free ${get} With Purchase`
        : `Free ${get} With Purchase`;
    case "cross_product":
      if (buyQty === 1 && getQty === 1) {
        return `Buy ${buy}, Get ${get} Free`;
      }
      return `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
    default:
      return "Limited-Time Offer";
  }
}

/** Voice-friendly end date without external date libraries. */
export function formatPromotionEndsAtVoice(
  endAt: number,
  now: number
): string {
  const msLeft = endAt - now;
  if (msLeft <= 0) return "Offer ended";

  const hoursLeft = msLeft / (60 * 60 * 1000);
  if (hoursLeft < 1) return "Ends in less than an hour";
  if (hoursLeft < 24) {
    const hours = Math.ceil(hoursLeft);
    return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (daysLeft === 1) return "Ends tomorrow";
  if (daysLeft < 7) return `Ends in ${daysLeft} days`;

  return `Ends on ${new Date(endAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function formatAppliedPromotionSummary(
  summaries: Array<{
    promotionName: string;
    freeQuantity: number;
    savingsAmount: number;
  }>,
  currency: string
): string {
  if (summaries.length === 0) return "";
  const lines = summaries.map(
    (p) =>
      `${p.promotionName}: ${p.freeQuantity} free item${p.freeQuantity === 1 ? "" : "s"}, saved ${currency} ${p.savingsAmount.toFixed(2)}`
  );
  return lines.join("\n");
}

export type AddToCartPromotionContext = {
  productName: string;
  offerLine: string;
  promotionName: string;
  buyQuantity: number;
  getProductName?: string;
  getQuantity: number;
  endsLabel: string;
  cartBuyQuantity: number;
};

/** Professional voice/chat copy after add-to-cart when promotions apply or are close. */
export function formatAddToCartPromotionHint(
  ctx: AddToCartPromotionContext,
  options: {
    qualified: boolean;
    freeQuantity?: number;
    savingsAmount?: number;
    currency?: string;
  }
): string {
  const { productName, offerLine, promotionName, buyQuantity, endsLabel, cartBuyQuantity } =
    ctx;

  if (options.qualified && options.freeQuantity && options.freeQuantity > 0) {
    const getName = ctx.getProductName ?? productName;
    const freeLabel =
      options.freeQuantity === 1
        ? `1 free ${getName}`
        : `${options.freeQuantity} free ${getName}`;
    const savings =
      options.savingsAmount && options.currency
        ? ` You save ${options.currency} ${options.savingsAmount.toFixed(2)}.`
        : "";
    return `Great news — you qualify for ${promotionName}: ${offerLine}. Your cart includes ${freeLabel}.${savings}`;
  }

  const needed = buyQuantity - cartBuyQuantity;
  if (needed <= 0) return "";

  const addMore =
    needed === 1
      ? "add 1 more"
      : `add ${needed} more`;
  const unitWord = needed === 1 ? "unit" : "units";

  return `This product has a special offer: ${offerLine} (${endsLabel}). You have ${cartBuyQuantity} ${productName} in your cart — ${addMore} to unlock ${ctx.getQuantity === 1 ? "your free gift" : `${ctx.getQuantity} free items`}${ctx.getProductName ? `: ${ctx.getProductName}` : ""}. Would you like me to update the quantity to ${buyQuantity}?`;
}

