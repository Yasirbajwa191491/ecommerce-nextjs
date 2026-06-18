import type { Doc, Id } from "../../_generated/dataModel";
import { getPrimaryImageUrl } from "../productImages";
import { isPromotionActive } from "./isActive";
import { promotionTypeLabel } from "./types";

export function resolveGetProductId(
  type: Doc<"productPromotions">["type"],
  buyProductId: Id<"products">,
  getProductId?: Id<"products">
): Id<"products"> | undefined {
  if (type === "bogo") return buyProductId;
  return getProductId;
}

export async function enrichPromotionForStorefront(
  ctx: { db: { get: (id: Id<"products">) => Promise<Doc<"products"> | null> } },
  promotion: Doc<"productPromotions">,
  now: number
) {
  const buyProduct = await ctx.db.get(promotion.buyProductId);
  const getProductId = resolveGetProductId(
    promotion.type,
    promotion.buyProductId,
    promotion.getProductId
  );
  const getProduct = getProductId ? await ctx.db.get(getProductId) : null;

  return {
    _id: promotion._id,
    type: promotion.type,
    typeLabel: promotionTypeLabel(promotion.type),
    name: promotion.name,
    description: promotion.description ?? "",
    promotionMessage: promotion.promotionMessage ?? "",
    bannerText: promotion.bannerText ?? "",
    buyProductId: promotion.buyProductId,
    buyProductName: buyProduct?.name ?? "Product",
    buyProductImageUrl: buyProduct ? getPrimaryImageUrl(buyProduct) : "",
    buyProductSlug: buyProduct?._id,
    getProductId,
    getProductName: getProduct?.name ?? "",
    getProductImageUrl: getProduct ? getPrimaryImageUrl(getProduct) : "",
    buyQuantity: promotion.buyQuantity,
    getQuantity: promotion.getQuantity,
    startAt: promotion.startAt,
    endAt: promotion.endAt,
    isActive: isPromotionActive(promotion, now),
  };
}
