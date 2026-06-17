import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const copilotIntentValidator = v.union(
  v.literal("overview"),
  v.literal("revenue"),
  v.literal("sales_trends"),
  v.literal("trending_products"),
  v.literal("low_performing_products"),
  v.literal("promotion_recommendations"),
  v.literal("inventory"),
  v.literal("reviews"),
  v.literal("search"),
  v.literal("email_marketing"),
  v.literal("categories"),
  v.literal("discounts"),
  v.literal("product_opportunities"),
  v.literal("products"),
  v.literal("orders"),
  v.literal("pricing")
);

export type CopilotIntent =
  | "overview"
  | "revenue"
  | "sales_trends"
  | "trending_products"
  | "low_performing_products"
  | "promotion_recommendations"
  | "inventory"
  | "reviews"
  | "search"
  | "email_marketing"
  | "categories"
  | "discounts"
  | "product_opportunities"
  | "products"
  | "orders"
  | "pricing";

export const copilotResponseValidator = v.object({
  summary: v.string(),
  keyFindings: v.array(v.string()),
  recommendations: v.array(v.string()),
  dataSourcesUsed: v.array(v.string()),
  followUpQuestions: v.array(v.string()),
  insightCards: v.optional(
    v.array(
      v.object({
        type: v.union(
          v.literal("inventory"),
          v.literal("promotion"),
          v.literal("forecast"),
          v.literal("sentiment"),
          v.literal("marketing"),
          v.literal("search"),
          v.literal("risk"),
          v.literal("opportunity"),
          v.literal("pricing")
        ),
        title: v.string(),
        subtitle: v.optional(v.string()),
        productId: v.optional(v.id("products")),
        productName: v.optional(v.string()),
        metrics: v.array(
          v.object({
            label: v.string(),
            value: v.string(),
            trend: v.optional(
              v.union(v.literal("up"), v.literal("down"), v.literal("flat"))
            ),
          })
        ),
        badges: v.array(
          v.object({
            label: v.string(),
            tone: v.union(
              v.literal("info"),
              v.literal("positive"),
              v.literal("warning"),
              v.literal("risk")
            ),
          })
        ),
        recommendation: v.optional(v.string()),
        reason: v.optional(v.string()),
      })
    )
  ),
});

export type CopilotResponse = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  dataSourcesUsed: string[];
  followUpQuestions: string[];
  insightCards?: Array<{
    type:
      | "inventory"
      | "promotion"
      | "forecast"
      | "sentiment"
      | "marketing"
      | "search"
      | "risk"
      | "opportunity"
      | "pricing";
    title: string;
    subtitle?: string;
    productId?: Id<"products">;
    productName?: string;
    metrics: Array<{
      label: string;
      value: string;
      trend?: "up" | "down" | "flat";
    }>;
    badges: Array<{
      label: string;
      tone: "info" | "positive" | "warning" | "risk";
    }>;
    recommendation?: string;
    reason?: string;
  }>;
};

export const MAX_COPILOT_QUESTION_LENGTH = 2000;
