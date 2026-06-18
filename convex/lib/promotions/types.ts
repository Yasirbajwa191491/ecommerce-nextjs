import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const promotionTypeValidator = v.union(
  v.literal("bogo"),
  v.literal("buy_x_get_y"),
  v.literal("free_gift"),
  v.literal("cross_product")
);

export const promotionStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive")
);

export type PromotionType =
  | "bogo"
  | "buy_x_get_y"
  | "free_gift"
  | "cross_product";

export function promotionTypeLabel(type: PromotionType): string {
  switch (type) {
    case "bogo":
      return "Buy One Get One Free";
    case "buy_x_get_y":
      return "Buy X Get Y Free";
    case "free_gift":
      return "Free Gift with Purchase";
    case "cross_product":
      return "Cross-Product Promotion";
    default:
      return type;
  }
}

export const promotionGiftLineValidator = v.object({
  promotionId: v.id("productPromotions"),
  promotionType: promotionTypeValidator,
  promotionName: v.string(),
  promotionDescription: v.optional(v.string()),
  productId: v.id("products"),
  productName: v.string(),
  color: v.string(),
  quantity: v.number(),
  savingsAmount: v.number(),
  imageUrl: v.string(),
});

export const appliedPromotionSummaryValidator = v.object({
  promotionId: v.id("productPromotions"),
  promotionType: promotionTypeValidator,
  promotionName: v.string(),
  promotionDescription: v.optional(v.string()),
  buyProductId: v.id("products"),
  getProductId: v.optional(v.id("products")),
  freeQuantity: v.number(),
  savingsAmount: v.number(),
});

export type PromotionGiftLine = {
  promotionId: Id<"productPromotions">;
  promotionType: PromotionType;
  promotionName: string;
  promotionDescription?: string;
  productId: Id<"products">;
  productName: string;
  color: string;
  quantity: number;
  savingsAmount: number;
  imageUrl: string;
};

export type AppliedPromotionSummary = {
  promotionId: Id<"productPromotions">;
  promotionType: PromotionType;
  promotionName: string;
  promotionDescription?: string;
  buyProductId: Id<"products">;
  getProductId?: Id<"products">;
  freeQuantity: number;
  savingsAmount: number;
};
