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

type ConfiguredPromotion = {
  id: string;
  name: string;
  type: string;
  status: string;
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  ordersCount: number;
  revenueGenerated: number;
  freeProductsGiven: number;
};

type PromotionContext = {
  candidates?: PromotionCandidate[];
  configured?: { promotions?: ConfiguredPromotion[] };
};

export function computePromotionCards(
  promotion: PromotionContext | undefined
): InsightCard[] {
  if (!promotion) return [];

  const cards: InsightCard[] = [];

  for (const promo of (promotion.configured?.promotions ?? []).slice(0, 3)) {
    const engagement =
      promo.viewCount > 0 ? promo.ordersCount / promo.viewCount : 0;
    cards.push({
      type: "promotion",
      title: "Promotion Performance",
      subtitle: promo.name,
      metrics: [
        { label: "Orders", value: formatNumber(promo.ordersCount), trend: promo.ordersCount > 0 ? "up" : "flat" },
        { label: "Revenue", value: formatCurrency(promo.revenueGenerated) },
        { label: "Views", value: formatNumber(promo.viewCount) },
        { label: "Free items", value: formatNumber(promo.freeProductsGiven) },
      ],
      badges: [
        {
          label: promo.status === "active" ? "Active" : "Inactive",
          tone: promo.status === "active" ? "positive" : "warning",
        },
        {
          label: promo.type.replace(/_/g, " "),
          tone: "info",
        },
      ],
      recommendation:
        engagement < 0.02 && promo.status === "active"
          ? "Low engagement — consider promoting on homepage and email."
          : promo.ordersCount > 0
            ? "Strong performer — feature in upcoming campaigns."
            : "Monitor clicks and conversions this week.",
      reason: `Click-through: ${promo.clickCount} clicks from ${promo.viewCount} views.`,
    });
  }

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
