import type { InsightCard } from "./types";
import { formatNumber } from "./types";

type SearchContext = {
  trendingSearches?: Array<{ query: string; count: number }>;
  zeroResultQueries?: Array<{ query: string; zeroResults: number }>;
};

export function computeSearchCards(
  search: SearchContext | undefined
): InsightCard[] {
  if (!search) return [];
  const topSearch = search.trendingSearches?.[0];
  const topZeroResult = search.zeroResultQueries?.[0];

  const cards: InsightCard[] = [
    {
      type: "search",
      title: "Search Insights",
      metrics: [
        { label: "Trending Queries", value: formatNumber(search.trendingSearches?.length ?? 0) },
        { label: "Zero-Result Queries", value: formatNumber(search.zeroResultQueries?.length ?? 0) },
      ],
      badges: [
        {
          label: (search.zeroResultQueries?.length ?? 0) > 0 ? "Demand Gap Found" : "Healthy Coverage",
          tone: (search.zeroResultQueries?.length ?? 0) > 0 ? "warning" : "positive",
        },
      ],
      recommendation:
        topZeroResult
          ? `Consider adding products for "${topZeroResult.query}".`
          : "Continue investing in categories with strong search demand.",
      reason:
        topSearch
          ? `Most searched term recently: "${topSearch.query}" (${topSearch.count} searches).`
          : "Search activity is currently limited.",
    },
  ];

  return cards;
}
