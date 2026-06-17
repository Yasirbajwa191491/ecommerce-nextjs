import type { CopilotIntent } from "../copilotTypes";
import type { InsightCard } from "./types";
import { computeInventoryCards } from "./inventoryForecast";
import { computeRevenueForecastCard } from "./salesForecast";
import { computePromotionCards } from "./promotionInsights";
import { computeSentimentCards } from "./sentimentInsights";
import { computeMarketingCards } from "./marketingInsights";
import { computeSearchCards } from "./searchDemand";
import { computeBusinessSummaryCards } from "./businessSummary";

type BusinessContext = Record<string, unknown>;

export function buildInsightCards(args: {
  intents: CopilotIntent[];
  businessData: BusinessContext;
  question?: string;
}): InsightCard[] {
  const cards: InsightCard[] = [];
  const intents = new Set(args.intents);
  const context = args.businessData;

  if (intents.has("inventory")) {
    cards.push(
      ...computeInventoryCards(
        (context.inventory ?? undefined) as Parameters<typeof computeInventoryCards>[0]
      )
    );
  }

  if (intents.has("revenue") || intents.has("sales_trends")) {
    cards.push(
      ...computeRevenueForecastCard(
        (context.revenue ?? undefined) as Parameters<typeof computeRevenueForecastCard>[0],
        (context.salesTrends ?? undefined) as Parameters<typeof computeRevenueForecastCard>[1]
      )
    );
  }

  if (intents.has("promotion_recommendations")) {
    cards.push(
      ...computePromotionCards(
        (context.promotionRecommendations ?? undefined) as Parameters<typeof computePromotionCards>[0]
      )
    );
  }

  if (intents.has("reviews")) {
    cards.push(
      ...computeSentimentCards(
        (context.reviews ?? undefined) as Parameters<typeof computeSentimentCards>[0]
      )
    );
  }

  if (intents.has("email_marketing")) {
    cards.push(
      ...computeMarketingCards(
        ((context.emailMarketing as { subscribers?: unknown } | undefined)?.subscribers ??
          undefined) as Parameters<typeof computeMarketingCards>[0],
        args.question
      )
    );
  }

  if (intents.has("search")) {
    cards.push(
      ...computeSearchCards(
        (context.search ?? undefined) as Parameters<typeof computeSearchCards>[0]
      )
    );
  }

  if (intents.has("overview")) {
    cards.push(
      ...computeBusinessSummaryCards({
        inventory: (context.inventory ?? undefined) as { lowStock?: unknown[] } | undefined,
        lowPerformingProducts: (context.lowPerformingProducts ?? undefined) as {
          products?: unknown[];
        } | undefined,
        search: (context.search ?? undefined) as { zeroResultQueries?: unknown[] } | undefined,
      })
    );
  }

  return cards.slice(0, 12);
}
