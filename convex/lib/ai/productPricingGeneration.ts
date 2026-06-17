import { geminiGenerateWithParts } from "./providers/gemini";
import { parseJsonObject } from "./providers/shared";
import type { PricingHealthStatus, ProductPricingContext } from "./productPricingTypes";

const PRICING_TEMPERATURE = 0.3;

type PricingSignals = {
  product: {
    name: string;
    price: number;
    currency: string;
    discountPercent: number;
    stock: number;
    stars: number;
    reviews: number;
    featured: boolean;
    description: string;
    highlights: string[];
  } | null;
  salesData: {
    unitsSold: number;
    revenue: number;
    orderCount: number;
    unitsGrowthPercent: number;
  } | null;
  reviewInsights: {
    summary: string;
    topics: string[];
    reviewCount: number;
  } | null;
  categoryName: string;
  peerPrices: number[];
  peerPriceStats: {
    min: number;
    max: number;
    median: number;
    count: number;
  } | null;
  hasSalesHistory: boolean;
};

type RawPricingResult = {
  suggestedPrice?: number;
  minRecommendedPrice?: number;
  maxRecommendedPrice?: number;
  confidence?: number;
  healthStatus?: PricingHealthStatus;
  reasoning?: string[];
};

function computeHeuristicPricing(
  signals: PricingSignals,
  context: ProductPricingContext
): {
  suggestedPrice: number;
  minRecommendedPrice: number;
  maxRecommendedPrice: number;
  confidence: number;
  healthStatus: PricingHealthStatus;
  reasoning: string[];
} {
  const currentPrice = context.price;
  const currency = context.currency;
  const reasoning: string[] = [];
  let healthStatus: PricingHealthStatus = "optimal";
  let adjustment = 0;

  const sales = signals.salesData;
  const peerMedian = signals.peerPriceStats?.median;

  if (signals.hasSalesHistory && sales) {
    if (sales.unitsGrowthPercent > 0.15 && context.stock < 15) {
      healthStatus = "underpriced";
      adjustment = 0.08;
      reasoning.push("High demand with low stock");
    } else if (sales.unitsGrowthPercent > 0.1) {
      healthStatus = "underpriced";
      adjustment = 0.05;
      reasoning.push("Growing sales trend");
    } else if (sales.unitsSold < 2 && context.stock > 20) {
      healthStatus = "overpriced";
      adjustment = -0.07;
      reasoning.push("Slow sales with high inventory");
    }

    if (context.stock < 5 && sales.unitsSold > 3) {
      reasoning.push("Low stock relative to demand");
      if (healthStatus === "optimal") {
        healthStatus = "underpriced";
        adjustment = Math.max(adjustment, 0.04);
      }
    }
  } else if (peerMedian && peerMedian > 0) {
    const suggestedFromPeers = peerMedian;
    return {
      suggestedPrice: Math.round(suggestedFromPeers * 100) / 100,
      minRecommendedPrice: Math.round(signals.peerPriceStats!.min * 100) / 100,
      maxRecommendedPrice: Math.round(signals.peerPriceStats!.max * 100) / 100,
      confidence: signals.peerPriceStats!.count >= 3 ? 68 : 55,
      healthStatus: "optimal",
      reasoning: [
        `Similar products in ${signals.categoryName || "category"} range from ${signals.peerPriceStats!.min} to ${signals.peerPriceStats!.max} ${currency}`,
        "No sales history — launch price based on category peers",
      ],
    };
  }

  if ((context.stars ?? signals.product?.stars ?? 0) >= 4 && context.stock > 0) {
    reasoning.push("Strong review ratings");
  }
  if (signals.reviewInsights?.summary) {
    reasoning.push("Positive review sentiment");
  }

  const suggestedPrice = Math.max(
    0.01,
    Math.round(currentPrice * (1 + adjustment) * 100) / 100
  );
  const spread = Math.max(currentPrice * 0.1, 1);

  let confidence = 60;
  if (signals.hasSalesHistory) confidence += 15;
  if ((context.reviews ?? signals.product?.reviews ?? 0) >= 5) confidence += 10;
  if (signals.peerPriceStats && signals.peerPriceStats.count >= 2) confidence += 5;
  confidence = Math.min(92, confidence);

  return {
    suggestedPrice,
    minRecommendedPrice: Math.max(
      0.01,
      Math.round((suggestedPrice - spread) * 100) / 100
    ),
    maxRecommendedPrice: Math.round((suggestedPrice + spread) * 100) / 100,
    confidence,
    healthStatus,
    reasoning:
      reasoning.length > 0
        ? reasoning
        : ["Current pricing aligns with available signals"],
  };
}

const SYSTEM_PROMPT = `You are an ecommerce pricing analyst. You receive structured product and sales data.
Return valid JSON only, no markdown fences.

JSON schema:
{
  "suggestedPrice": number,
  "minRecommendedPrice": number,
  "maxRecommendedPrice": number,
  "confidence": number (0-100),
  "healthStatus": "optimal" | "underpriced" | "overpriced",
  "reasoning": ["bullet", ...]
}

Rules:
- Use ONLY provided data. Never invent sales numbers.
- suggestedPrice must stay within minRecommendedPrice and maxRecommendedPrice.
- Pricing is advisory — admin must approve manually.
- reasoning: 3-6 concise bullets citing specific signals.
- For new products without sales, base launch price on peer prices.`;

export async function generateProductPricingRecommendation(
  context: ProductPricingContext,
  signals: PricingSignals
): Promise<{
  suggestedPrice: number;
  minRecommendedPrice: number;
  maxRecommendedPrice: number;
  confidence: number;
  healthStatus: PricingHealthStatus;
  reasoning: string[];
  similarProductPrices?: number[];
}> {
  const heuristic = computeHeuristicPricing(signals, context);

  const userPrompt = JSON.stringify(
    {
      productContext: context,
      signals,
      heuristicBaseline: heuristic,
    },
    null,
    2
  );

  try {
    const rawText = await geminiGenerateWithParts(
      SYSTEM_PROMPT,
      [{ text: userPrompt }],
      PRICING_TEMPERATURE
    );
    const parsed = parseJsonObject<RawPricingResult>(rawText);

    const suggestedPrice =
      typeof parsed?.suggestedPrice === "number" && parsed.suggestedPrice >= 0.01
        ? Math.round(parsed.suggestedPrice * 100) / 100
        : heuristic.suggestedPrice;
    const minRecommendedPrice =
      typeof parsed?.minRecommendedPrice === "number"
        ? Math.round(parsed.minRecommendedPrice * 100) / 100
        : heuristic.minRecommendedPrice;
    const maxRecommendedPrice =
      typeof parsed?.maxRecommendedPrice === "number"
        ? Math.round(parsed.maxRecommendedPrice * 100) / 100
        : heuristic.maxRecommendedPrice;
    const confidence =
      typeof parsed?.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        : heuristic.confidence;
    const healthStatus =
      parsed?.healthStatus === "underpriced" ||
      parsed?.healthStatus === "overpriced" ||
      parsed?.healthStatus === "optimal"
        ? parsed.healthStatus
        : heuristic.healthStatus;
    const reasoning = Array.isArray(parsed?.reasoning)
      ? parsed.reasoning.filter((r) => typeof r === "string").slice(0, 6)
      : heuristic.reasoning;

    return {
      suggestedPrice: Math.max(
        minRecommendedPrice,
        Math.min(maxRecommendedPrice, suggestedPrice)
      ),
      minRecommendedPrice,
      maxRecommendedPrice,
      confidence,
      healthStatus,
      reasoning,
      similarProductPrices:
        signals.peerPrices.length > 0 ? signals.peerPrices : undefined,
    };
  } catch {
    return {
      ...heuristic,
      similarProductPrices:
        signals.peerPrices.length > 0 ? signals.peerPrices : undefined,
    };
  }
}
