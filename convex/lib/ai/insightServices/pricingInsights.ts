import type { Id } from "../../../_generated/dataModel";
import type { InsightCard } from "./types";
import { formatCurrency, formatNumber, formatPercent } from "./types";

type PricingProduct = {
  productId: Id<"products">;
  name: string;
  currentPrice: number;
  suggestedPrice: number;
  currency: string;
  confidence: number;
  healthStatus: "optimal" | "underpriced" | "overpriced";
  healthScore: number;
  priceDifferencePercent: number;
  reasons: string[];
};

type PricingContext = {
  storeHealthScore?: number;
  currency?: string;
  underpriced?: PricingProduct[];
  overpriced?: PricingProduct[];
  discountCandidates?: PricingProduct[];
  increaseCandidates?: PricingProduct[];
};

function healthTone(
  status: PricingProduct["healthStatus"]
): "positive" | "warning" | "risk" | "info" {
  if (status === "underpriced") return "warning";
  if (status === "overpriced") return "risk";
  return "positive";
}

function healthLabel(status: PricingProduct["healthStatus"]): string {
  if (status === "underpriced") return "Potentially Underpriced";
  if (status === "overpriced") return "Potentially Overpriced";
  return "Optimally Priced";
}

function productCard(product: PricingProduct, title: string): InsightCard {
  const diff = product.suggestedPrice - product.currentPrice;
  return {
    type: "pricing",
    title,
    subtitle: product.name,
    productId: product.productId,
    productName: product.name,
    metrics: [
      {
        label: "Current Price",
        value: formatCurrency(product.currentPrice, product.currency),
      },
      {
        label: "Suggested Price",
        value: formatCurrency(product.suggestedPrice, product.currency),
        trend: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
      },
      {
        label: "Confidence",
        value: formatPercent(product.confidence),
      },
      {
        label: "Difference",
        value: `${diff >= 0 ? "+" : ""}${formatPercent(product.priceDifferencePercent)}`,
      },
    ],
    badges: [
      {
        label: healthLabel(product.healthStatus),
        tone: healthTone(product.healthStatus),
      },
    ],
    recommendation:
      product.healthStatus === "underpriced"
        ? "Consider a modest price increase to capture demand."
        : product.healthStatus === "overpriced"
          ? "Consider a discount or price reduction to improve velocity."
          : "Current pricing aligns with demand signals.",
    reason:
      product.reasons.length > 0
        ? product.reasons.join(", ")
        : "Based on sales velocity, inventory, and review signals.",
  };
}

export function computePricingCards(
  pricing: PricingContext | undefined
): InsightCard[] {
  if (!pricing) return [];

  const cards: InsightCard[] = [];

  if (pricing.storeHealthScore !== undefined) {
    cards.push({
      type: "pricing",
      title: "Pricing Health Score",
      metrics: [
        {
          label: "Store-wide Score",
          value: formatNumber(pricing.storeHealthScore),
          trend:
            pricing.storeHealthScore >= 75
              ? "up"
              : pricing.storeHealthScore < 60
                ? "down"
                : "flat",
        },
        {
          label: "Underpriced",
          value: formatNumber(pricing.underpriced?.length ?? 0),
        },
        {
          label: "Overpriced",
          value: formatNumber(pricing.overpriced?.length ?? 0),
        },
      ],
      badges: [
        {
          label:
            pricing.storeHealthScore >= 75
              ? "Healthy Pricing"
              : "Review Pricing",
          tone: pricing.storeHealthScore >= 75 ? "positive" : "warning",
        },
      ],
      recommendation:
        "Review underpriced and overpriced products below for actionable pricing changes.",
      reason:
        "Analysis based on catalog sales velocity, inventory levels, and review ratings.",
    });
  }

  for (const product of (pricing.underpriced ?? []).slice(0, 2)) {
    cards.push(productCard(product, "Underpriced Product"));
  }
  for (const product of (pricing.overpriced ?? []).slice(0, 2)) {
    cards.push(productCard(product, "Overpriced Product"));
  }
  for (const product of (pricing.discountCandidates ?? []).slice(0, 2)) {
    cards.push(productCard(product, "Discount Candidate"));
  }
  for (const product of (pricing.increaseCandidates ?? []).slice(0, 2)) {
    cards.push(productCard(product, "Price Increase Candidate"));
  }

  return cards;
}
