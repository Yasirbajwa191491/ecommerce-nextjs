import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const campaignPresetValidator = v.union(
  v.literal("summer_sale"),
  v.literal("new_arrivals"),
  v.literal("clearance_sale"),
  v.literal("holiday_promotion"),
  v.literal("category_promotion"),
  v.literal("custom")
);

export type CampaignPreset =
  | "summer_sale"
  | "new_arrivals"
  | "clearance_sale"
  | "holiday_promotion"
  | "category_promotion"
  | "custom";

export const subjectOptimizationResultValidator = v.object({
  highOpen: v.string(),
  short: v.string(),
  promotional: v.string(),
});

export const generateCampaignResultValidator = v.object({
  campaignName: v.string(),
  subject: v.string(),
  headline: v.string(),
  previewText: v.string(),
  bodyParagraphs: v.array(v.string()),
  ctaText: v.string(),
  productPromoText: v.string(),
  suggestedProductIds: v.array(v.string()),
  suggestedSegmentKeys: v.array(v.string()),
});

export type GenerateCampaignResult = {
  campaignName: string;
  subject: string;
  headline: string;
  previewText: string;
  bodyParagraphs: string[];
  ctaText: string;
  productPromoText: string;
  suggestedProductIds: Id<"products">[];
  suggestedSegmentKeys: string[];
};

export type CampaignGenerationContext = {
  storeName: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    interestKey: string;
  }>;
  productsByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    interestKey: string;
    products: Array<{
      id: string;
      name: string;
      discountPercent: number;
      price: number;
    }>;
  }>;
  subscriberCount: number;
};

export type DiscountedProductSummary = {
  _id: string;
  name: string;
  categoryName: string;
  categorySlug: string;
  discountPercent: number;
  discountedPrice: number;
  price: number;
  currency: string;
};

export const PRESET_LABELS: Record<
  Exclude<CampaignPreset, "custom" | "category_promotion">,
  string
> = {
  summer_sale: "Summer Sale Campaign",
  new_arrivals: "New Arrivals Campaign",
  clearance_sale: "Clearance Sale",
  holiday_promotion: "Holiday Promotion",
};
