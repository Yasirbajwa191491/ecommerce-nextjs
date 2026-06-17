import type { Id } from "../../../_generated/dataModel";
import type { InsightCard } from "./types";
import { formatCurrency, formatNumber } from "./types";

type PromotionCandidate = {
  productId: Id<"products">;
  name: string;
  promotionScore: number;
  stock: number;
  unitsSold: number;
  revenue: number;
  discountPercent: number;
  reasons: string[];
};

type PromotionContext = {
  candidates?: PromotionCandidate[];
};

export function computePromotionCards(
  promotion: PromotionContext | undefined
): InsightCard[] {
  if (!promotion) return [];

  const cards: InsightCard[] = [];
  for (const candidate of (promotion.candidates ?? []).slice(0, 4)) {
    cards.push({
      type: "promotion",
      title: "Promotion Recommendation",
      subtitle: candidate.name,
      productId: candidate.productId,
      productName: candidate.name,
      metrics: [
        { label: "Promotion Score", value: formatNumber(candidate.promotionScore), trend: candidate.promotionScore >= 3 ? "up" : "flat" },
        { label: "Stock", value: formatNumber(candidate.stock) },
        { label: "Weekly Units", value: formatNumber(candidate.unitsSold) },
        { label: "Revenue", value: formatCurrency(candidate.revenue) },
      ],
      badges: [
        {
          label: candidate.discountPercent > 0 ? `Discount ${candidate.discountPercent}%` : "No Active Discount",
          tone: candidate.discountPercent > 0 ? "info" : "positive",
        },
      ],
      recommendation: "Run email and on-site promotion this week.",
      reason:
        candidate.reasons.length > 0
          ? candidate.reasons.join(", ")
          : "Product shows strong promotion potential based on current signals.",
    });
  }

  return cards;
}
