export type CopilotResponseView = {
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
  "Which products have the highest stock levels?",
  "How are orders performing this month?",
  "Summarize customer reviews.",
  "Show revenue insights.",
  "Which categories are growing fastest?",
  "What should I email customers?",
  "Which products have high views but low sales?",
] as const;
