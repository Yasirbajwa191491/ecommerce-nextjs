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
};

export type CopilotResponseView = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  dataSourcesUsed: string[];
  followUpQuestions: string[];
  insightCards?: CopilotInsightCard[];
};

export type SuggestedQuestionGroup = {
  label: string;
  questions: readonly string[];
};

export const SUGGESTED_COPILOT_QUESTION_GROUPS: SuggestedQuestionGroup[] = [
  {
    label: "Overview",
    questions: [
      "What happened this week?",
      "What happened this month?",
      "Show revenue insights.",
      "Show order insights.",
      "What business risks should I be aware of?",
      "What are the biggest opportunities right now?",
    ],
  },
  {
    label: "Forecasting",
    questions: [
      "Forecast next month's revenue.",
      "Forecast next quarter revenue.",
      "What revenue should I expect if current growth continues?",
      "Predict sales trends for the next 30 days.",
      "Which categories will grow next month?",
      "Which products are expected to sell most next month?",
      "Forecast inventory for next 30 days.",
      "Forecast inventory requirements.",
      "Show growth opportunities.",
      "Which products are growing fastest?",
      "Which products are losing momentum?",
      "Which categories are growing fastest?",
    ],
  },
  {
    label: "Inventory",
    questions: [
      "Which products will run out of stock soon?",
      "Which products should I reorder?",
      "Which products are overstocked?",
    ],
  },
  {
    label: "Pricing",
    questions: [
      "Which products are underpriced?",
      "Which products are overpriced?",
      "Which products should receive discounts?",
      "Which products could increase price?",
      "Show pricing opportunities.",
      "Analyze product pricing.",
    ],
  },
  {
    label: "Marketing",
    questions: [
      "What should I promote this week?",
      "Which discounted products deserve promotion?",
      "Which products should not be promoted because they already sell well?",
      "Which products have high traffic but low sales?",
      "Which subscribers should receive promotions?",
      "Suggest a campaign for Furniture.",
      "Suggest a campaign for Jewelry.",
      "Suggest a campaign for Electronics.",
    ],
  },
  {
    label: "Reviews & Search",
    questions: [
      "Summarize customer sentiment.",
      "What are customers complaining about?",
      "What do customers love most?",
      "Summarize customer reviews.",
      "What new products should we add?",
      "Which searches have no matching products?",
    ],
  },
];

export const SUGGESTED_COPILOT_QUESTIONS = SUGGESTED_COPILOT_QUESTION_GROUPS.flatMap(
  (group) => group.questions
) as readonly string[];
