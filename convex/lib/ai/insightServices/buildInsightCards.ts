import type { CopilotIntent } from "../copilotTypes";
import type { InsightCard } from "./types";
import { computeInventoryCards } from "./inventoryForecast";
import {
  computeGrowthForecastCards,
  computeOpportunityCards,
  computeRevenueForecastCard,
  computeRiskForecastCards,
} from "./salesForecast";
import { computePromotionCards } from "./promotionInsights";
import { computeSentimentCards } from "./sentimentInsights";
import { computeMarketingCards } from "./marketingInsights";
import { computeSearchCards } from "./searchDemand";
import { computeBusinessSummaryCards } from "./businessSummary";
import { computePricingCards } from "./pricingInsights";

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

  if (
    intents.has("revenue") ||
    intents.has("sales_trends") ||
    intents.has("categories") ||
    intents.has("trending_products")
  ) {
    const extended = context.salesForecastExtended as
      | {
          forecastNextMonth?: number;
          forecastNextQuarter?: number;
          confidence?: number;
          currency?: string;
          currentMonthRevenue?: number;
        }
      | undefined;
    cards.push(
      ...computeRevenueForecastCard(
        (context.revenue ?? undefined) as Parameters<
          typeof computeRevenueForecastCard
        >[0],
        (context.salesTrends ?? undefined) as Parameters<
          typeof computeRevenueForecastCard
        >[1],
        extended
      )
    );
    cards.push(
      ...computeGrowthForecastCards(
        (context.categories ?? undefined) as Parameters<
          typeof computeGrowthForecastCards
        >[0],
        (
          (context.trendingProducts as { topProductsThisMonth?: unknown[] } | undefined)
            ?.topProductsThisMonth ??
          (context.topProductsForecast as { expectedTopSellers?: unknown[] } | undefined)
            ?.expectedTopSellers
        ) as Parameters<typeof computeGrowthForecastCards>[1]
      )
    );
    cards.push(
      ...computeOpportunityCards({
        promotionCount:
          ((context.promotionRecommendations as { candidates?: unknown[] } | undefined)
            ?.candidates?.length ?? 0),
        searchGaps:
          ((context.search as { zeroResultQueries?: unknown[] } | undefined)
            ?.zeroResultQueries?.length ?? 0),
        topProducts: (
          (context.topProductsForecast as { expectedTopSellers?: unknown[] } | undefined)
            ?.expectedTopSellers ??
          (context.trendingProducts as { topProductsThisMonth?: unknown[] } | undefined)
            ?.topProductsThisMonth
        ) as Parameters<typeof computeOpportunityCards>[0]["topProducts"],
      })
    );
    cards.push(
      ...computeRiskForecastCards({
        lowStockCount:
          ((context.inventory as { lowStock?: unknown[] } | undefined)?.lowStock
            ?.length ?? 0),
        decliningProductCount:
          ((context.lowPerformingProducts as { products?: unknown[] } | undefined)
            ?.products?.length ?? 0),
        zeroResultSearchCount:
          ((context.search as { zeroResultQueries?: unknown[] } | undefined)
            ?.zeroResultQueries?.length ?? 0),
        aov: (context.aovTrend as { averageOrderValue?: number } | undefined)
          ?.averageOrderValue,
        aovCurrency: (context.aovTrend as { currency?: string } | undefined)
          ?.currency,
        customerCount: (
          context.customerGrowthForecast as { totalCustomers?: number } | undefined
        )?.totalCustomers,
      })
    );
  }

  if (intents.has("low_performing_products") || intents.has("product_opportunities")) {
    cards.push(
      ...computeRiskForecastCards({
        decliningProductCount:
          ((context.lowPerformingProducts as { products?: unknown[] } | undefined)
            ?.products?.length ?? 0),
        zeroResultSearchCount:
          ((context.search as { zeroResultQueries?: unknown[] } | undefined)
            ?.zeroResultQueries?.length ?? 0),
      })
    );
    cards.push(
      ...computeOpportunityCards({
        promotionCount:
          ((context.growthOpportunities as { promotionCandidates?: number } | undefined)
            ?.promotionCandidates ?? 0),
        searchGaps:
          ((context.growthOpportunities as { searchDemandGaps?: number } | undefined)
            ?.searchDemandGaps ?? 0),
      })
    );
  }

  if (intents.has("promotion_recommendations")) {
    cards.push(
      ...computePromotionCards(
        (context.promotionRecommendations ?? undefined) as Parameters<
          typeof computePromotionCards
        >[0]
      )
    );
  }

  if (intents.has("pricing")) {
    cards.push(
      ...computePricingCards(
        (context.pricingInsights ?? undefined) as Parameters<
          typeof computePricingCards
        >[0]
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
