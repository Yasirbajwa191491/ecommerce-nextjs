import { v } from "convex/values";

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
  v.literal("orders")
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
  | "orders";

export const copilotResponseValidator = v.object({
  summary: v.string(),
  keyFindings: v.array(v.string()),
  recommendations: v.array(v.string()),
  dataSourcesUsed: v.array(v.string()),
  followUpQuestions: v.array(v.string()),
});

export type CopilotResponse = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  dataSourcesUsed: string[];
  followUpQuestions: string[];
};

export const SUGGESTED_COPILOT_QUESTIONS = [
  "What happened this week?",
  "Which products are trending?",
  "Which products are losing sales?",
  "What should I promote?",
  "What products need restocking?",
  "Summarize customer reviews.",
  "Show revenue insights.",
  "Which categories are growing fastest?",
  "What should I email customers?",
  "Which products have high views but low sales?",
] as const;

export const MAX_COPILOT_QUESTION_LENGTH = 2000;
