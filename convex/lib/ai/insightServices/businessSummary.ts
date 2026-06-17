import type { InsightCard } from "./types";
import { formatNumber } from "./types";

type RiskContext = {
  inventory?: { lowStock?: unknown[]; reorderCandidates?: unknown[] };
  lowPerformingProducts?: { products?: unknown[] };
  search?: { zeroResultQueries?: unknown[] };
};

export function computeBusinessSummaryCards(
  context: RiskContext | undefined
): InsightCard[] {
  if (!context) return [];

  const lowStockCount = context.inventory?.lowStock?.length ?? 0;
  const decliningCount = context.lowPerformingProducts?.products?.length ?? 0;
  const zeroResultCount = context.search?.zeroResultQueries?.length ?? 0;

  const cards: InsightCard[] = [];

  cards.push({
    type: "risk",
    title: "Business Risks",
    metrics: [
      { label: "Low Stock Products", value: formatNumber(lowStockCount) },
      { label: "Declining Products", value: formatNumber(decliningCount) },
      { label: "Zero-Result Searches", value: formatNumber(zeroResultCount) },
    ],
    badges: [{ label: "Risk Overview", tone: lowStockCount + decliningCount > 0 ? "warning" : "info" }],
    recommendation:
      lowStockCount + decliningCount + zeroResultCount > 0
        ? "Address inventory gaps and conversion issues first."
        : "Current risk indicators are stable.",
  });

  if (decliningCount > 0) {
    cards.push({
      type: "opportunity",
      title: "Business Opportunities",
      metrics: [{ label: "Turnaround Candidates", value: formatNumber(decliningCount) }],
      badges: [{ label: "Growth Opportunity", tone: "positive" }],
      recommendation:
        "Run targeted promotions for declining products with strong reviews and healthy stock.",
    });
  }

  return cards;
}
