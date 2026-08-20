export type PromotionType = "bogo" | "buy_x_get_y" | "free_gift" | "cross_product";

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

export function formatPromotionOfferLine(promo: PromotionDisplayInput): string {
  const buy = normalizeWhitespace(promo.buyProductName);
  const get = normalizeWhitespace(promo.getProductName || buy);
  const buyQty = promo.buyQuantity ?? 1;
  const getQty = promo.getQuantity ?? 1;

  switch (promo.type) {
    case "bogo":
      if (buy === get) {
        return buyQty === 1 && getQty === 1
          ? "Buy One, Get One Free"
          : `Buy ${buyQty}, Get ${getQty} Free`;
      }
      return buyQty === 1 && getQty === 1
        ? `Buy ${buy}, Get ${get} Free`
        : `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
    case "buy_x_get_y":
      if (buyQty === 1 && getQty === 1) {
        return buy === get ? "Buy One, Get One Free" : `Buy ${buy}, Get ${get} Free`;
      }
      return `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
    case "free_gift":
      return getQty > 1
        ? `${getQty} Free ${get} With Purchase`
        : `Free ${get} With Purchase`;
    case "cross_product":
      return buyQty === 1 && getQty === 1
        ? `Buy ${buy}, Get ${get} Free`
        : `Buy ${buyQty} ${buy}, Get ${getQty} ${get} Free`;
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
    customCopy && !isGenericOfferCopy(customCopy) && !hasQuantityDeal(promo)
      ? customCopy
      : offerLine;

  return { title, subtitle, offerLine };
}

export function formatPromotionEndsAt(endAt: number, now: number): string | null {
  const diffMs = endAt - now;
  if (diffMs <= 0) return "Ended";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 1) return `Ends in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 1) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "Ends soon";
}
