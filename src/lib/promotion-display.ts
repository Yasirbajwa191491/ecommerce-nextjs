import type { PromotionType } from "@/lib/admin/promotion-labels";

export type PromotionDisplayInput = {
  type: PromotionType;
  typeLabel?: string;
  name: string;
  description?: string;
  promotionMessage?: string;
  bannerText?: string;
  buyProductName: string;
  getProductName?: string;
  buyQuantity?: number;
  getQuantity?: number;
  endAt?: number;
};

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Fixes common sloppy template phrasing while preserving product names. */
export function polishMarketingCopy(text: string): string {
  let copy = normalizeWhitespace(text);
  copy = copy.replace(/,\s*get\s+/gi, ", Get ");
  copy = copy.replace(/\s+free\b/gi, " Free");
  copy = copy.replace(/\s+·\s*get\s+/gi, " · Get ");
  copy = copy.replace(/^buy\s+/i, "Buy ");
  if (copy.length > 0) {
    copy = copy.charAt(0).toUpperCase() + copy.slice(1);
  }
  return copy;
}

function isGenericOfferCopy(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    /^buy\s+.+,?\s*get\s+.+\s+free$/.test(normalized) ||
    /^buy\s+.+\s+·\s*get\s+.+\s+free$/.test(normalized) ||
    /^buy\s+one,?\s*get\s+one\s+free/.test(normalized)
  );
}

function hasQuantityDeal(promo: PromotionDisplayInput): boolean {
  return (promo.buyQuantity ?? 1) > 1 || (promo.getQuantity ?? 1) > 1;
}

export function formatPromotionBadgeShort(promo: PromotionDisplayInput): string {
  const buyQty = promo.buyQuantity ?? 1;
  const getQty = promo.getQuantity ?? 1;
  const buy = normalizeWhitespace(promo.buyProductName);
  const get = normalizeWhitespace(promo.getProductName || buy);

  if (promo.type === "free_gift") {
    return getQty > 1 ? `Free Gift ×${getQty}` : "Free Gift";
  }

  if (buyQty === 1 && getQty === 1) {
    if (promo.type === "bogo" && buy === get) return "BOGO";
    return "Special Offer";
  }

  return `Buy ${buyQty} Get ${getQty} Free`;
}

export function formatPromotionOfferLine(promo: PromotionDisplayInput): string {
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

export function getPromotionDisplay(promo: PromotionDisplayInput): {
  title: string;
  subtitle: string;
  offerLine: string;
} {
  const title = normalizeWhitespace(promo.name);
  const customCopy = normalizeWhitespace(
    promo.bannerText || promo.promotionMessage || promo.description || ""
  );
  const offerLine = formatPromotionOfferLine(promo);
  const subtitle =
    customCopy &&
    !isGenericOfferCopy(customCopy) &&
    !hasQuantityDeal(promo)
      ? polishMarketingCopy(customCopy)
      : offerLine;

  return { title, subtitle, offerLine };
}
