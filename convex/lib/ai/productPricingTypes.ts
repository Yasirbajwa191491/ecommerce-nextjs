import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const pricingHealthStatusValidator = v.union(
  v.literal("optimal"),
  v.literal("underpriced"),
  v.literal("overpriced")
);

export const pricingRecommendationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("applied"),
  v.literal("dismissed")
);

export const pricingRecommendationSourceValidator = v.union(
  v.literal("product_form"),
  v.literal("copilot")
);

export const productPricingContextValidator = v.object({
  productId: v.optional(v.id("products")),
  name: v.string(),
  company: v.string(),
  categoryName: v.string(),
  categoryId: v.optional(v.id("productCategories")),
  description: v.optional(v.string()),
  highlights: v.optional(v.array(v.string())),
  price: v.number(),
  currency: v.string(),
  discountPercent: v.optional(v.number()),
  stock: v.number(),
  stars: v.optional(v.number()),
  reviews: v.optional(v.number()),
});

export const productPricingResultValidator = v.object({
  recommendationId: v.id("aiPricingRecommendations"),
  currentPrice: v.number(),
  suggestedPrice: v.number(),
  minRecommendedPrice: v.number(),
  maxRecommendedPrice: v.number(),
  confidence: v.number(),
  healthStatus: pricingHealthStatusValidator,
  reasoning: v.array(v.string()),
  currency: v.string(),
  similarProductPrices: v.optional(v.array(v.number())),
  cached: v.optional(v.boolean()),
});

export const pricingRecommendationDocValidator = v.object({
  _id: v.id("aiPricingRecommendations"),
  _creationTime: v.number(),
  productId: v.optional(v.id("products")),
  adminUserId: v.string(),
  productName: v.string(),
  currentPrice: v.number(),
  suggestedPrice: v.number(),
  minRecommendedPrice: v.number(),
  maxRecommendedPrice: v.number(),
  confidence: v.number(),
  healthStatus: pricingHealthStatusValidator,
  reasoning: v.array(v.string()),
  status: pricingRecommendationStatusValidator,
  source: pricingRecommendationSourceValidator,
  currency: v.string(),
  createdAt: v.number(),
});

export type PricingHealthStatus = "optimal" | "underpriced" | "overpriced";

export type ProductPricingContext = {
  productId?: string;
  name: string;
  company: string;
  categoryName: string;
  categoryId?: string;
  description?: string;
  highlights?: string[];
  price: number;
  currency: string;
  discountPercent?: number;
  stock: number;
  stars?: number;
  reviews?: number;
};

export type ProductPricingResult = {
  recommendationId: Id<"aiPricingRecommendations">;
  currentPrice: number;
  suggestedPrice: number;
  minRecommendedPrice: number;
  maxRecommendedPrice: number;
  confidence: number;
  healthStatus: PricingHealthStatus;
  reasoning: string[];
  currency: string;
  similarProductPrices?: number[];
  cached?: boolean;
};
