import type { Id } from "../../convex/_generated/dataModel";

export type CopilotInsightCard = {
  type:
    | "inventory"
    | "promotion"
    | "forecast"
    | "sentiment"
    | "marketing"
    | "search"
    | "risk"
    | "opportunity";
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
};

export type CopilotResponseView = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  dataSourcesUsed: string[];
  followUpQuestions: string[];
  insightCards?: CopilotInsightCard[];
};

export const SUGGESTED_COPILOT_QUESTIONS = [
  "What happened this week?",
  "What happened this month?",
  "Show revenue insights.",
  "Show order insights.",
  "Which products will run out of stock soon?",
  "Forecast inventory for next 30 days.",
  "Which products should I reorder?",
  "Which products are overstocked?",
  "Forecast next month's revenue.",
  "Which products are growing fastest?",
  "Which products are losing momentum?",
  "What should I promote this week?",
  "Which discounted products deserve promotion?",
  "Which products should not be promoted because they already sell well?",
  "Which products have high traffic but low sales?",
  "Summarize customer sentiment.",
  "What are customers complaining about?",
  "What do customers love most?",
  "Which subscribers should receive promotions?",
  "Suggest a campaign for Furniture.",
  "Suggest a campaign for Jewelry.",
  "Suggest a campaign for Electronics.",
  "What new products should we add?",
  "What business risks should I be aware of?",
  "What are the biggest opportunities right now?",
  "Summarize customer reviews.",
  "Which categories are growing fastest?",
  "Which searches have no matching products?",
] as const;
