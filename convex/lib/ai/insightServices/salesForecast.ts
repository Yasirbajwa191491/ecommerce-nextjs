import type { Id } from "../../../_generated/dataModel";
import type { InsightCard } from "./types";
import { formatCurrency, formatNumber, formatPercent } from "./types";

type RevenueContext = {
  currency?: string;
  totalRevenue?: number;
  averageOrderValue?: number;
  totalCustomers?: number;
};

type TrendPoint = { value: number };
type SalesTrendContext = {
  revenueSeries?: TrendPoint[];
  ordersSeries?: TrendPoint[];
};

type CategoryItem = {
  categoryName: string;
  revenueGrowthPercent: number | null;
  revenue: number;
  unitsSold: number;
};

type CategoryContext = {
  categories?: CategoryItem[];
};

type ProductForecastItem = {
  productId: Id<"products">;
  productName: string;
  unitsSold: number;
  revenue: number;
  unitsGrowthPercent: number | null;
};

type ExtendedForecast = {
  forecastNextMonth?: number;
  forecastNextQuarter?: number;
  confidence?: number;
  currency?: string;
  currentMonthRevenue?: number;
};

function computeGrowthRate(revenueSeries: TrendPoint[]): number {
  if (revenueSeries.length < 2) return 0;
  const previous = revenueSeries[revenueSeries.length - 2]?.value ?? 0;
  const latest = revenueSeries[revenueSeries.length - 1]?.value ?? 0;
  return previous > 0 ? (latest - previous) / previous : 0;
}

function computeConfidence(ordersSeries: TrendPoint[]): number {
  const orderVolatility =
    ordersSeries.length >= 2
      ? Math.abs(
          (ordersSeries[ordersSeries.length - 1]?.value ?? 0) -
            (ordersSeries[ordersSeries.length - 2]?.value ?? 0)
        )
      : 0;
  return Math.max(55, Math.min(92, Math.round(85 - orderVolatility)));
}

export function computeRevenueForecastCard(
  revenue: RevenueContext | undefined,
  trends: SalesTrendContext | undefined,
  extended?: ExtendedForecast
): InsightCard[] {
  if (!revenue) return [];
  const currency = revenue.currency ?? extended?.currency ?? "USD";
  const currentRevenue = revenue.totalRevenue ?? extended?.currentMonthRevenue ?? 0;
  const revenueSeries = trends?.revenueSeries ?? [];
  const ordersSeries = trends?.ordersSeries ?? [];
  const growthRate = computeGrowthRate(revenueSeries);
  const forecastNextMonth =
    extended?.forecastNextMonth ??
    Math.max(0, Math.round(currentRevenue * (1 + growthRate * 0.6)));
  const forecastNextQuarter =
    extended?.forecastNextQuarter ??
    Math.max(0, Math.round(forecastNextMonth * 3 * (1 + growthRate * 0.15)));
  const confidence =
    extended?.confidence ?? computeConfidence(ordersSeries);

  return [
    {
      type: "forecast",
      title: "Revenue Forecast",
      metrics: [
        {
          label: "Current Month Revenue",
          value: formatCurrency(currentRevenue, currency),
        },
        {
          label: "Forecast Next Month",
          value: formatCurrency(forecastNextMonth, currency),
          trend: forecastNextMonth >= currentRevenue ? "up" : "down",
        },
        {
          label: "Forecast Next Quarter",
          value: formatCurrency(forecastNextQuarter, currency),
          trend: forecastNextQuarter >= currentRevenue * 3 ? "up" : "down",
        },
        { label: "Confidence", value: formatPercent(confidence) },
      ],
      badges: [
        {
          label:
            forecastNextMonth >= currentRevenue
              ? "Growth Expected"
              : "Watch Trend",
          tone: forecastNextMonth >= currentRevenue ? "positive" : "warning",
        },
      ],
      recommendation:
        forecastNextMonth >= currentRevenue
          ? "Support top-performing categories with inventory and campaigns."
          : "Prioritize promotion and retention campaigns to reduce downside risk.",
      reason:
        "Forecast blends recent revenue trend movement with current month performance.",
    },
  ];
}

export function computeGrowthForecastCards(
  categories: CategoryContext | undefined,
  topProducts: ProductForecastItem[] | undefined
): InsightCard[] {
  const cards: InsightCard[] = [];
  const topCategories = [...(categories?.categories ?? [])]
    .sort(
      (a, b) => (b.revenueGrowthPercent ?? 0) - (a.revenueGrowthPercent ?? 0)
    )
    .slice(0, 3);

  if (topCategories.length > 0) {
    const fastest = topCategories[0]!;
    cards.push({
      type: "forecast",
      title: "Growth Forecast",
      subtitle: "Fastest Growing Categories",
      metrics: topCategories.map((cat) => ({
        label: cat.categoryName,
        value: formatPercent(cat.revenueGrowthPercent ?? 0),
        trend:
          (cat.revenueGrowthPercent ?? 0) > 0
            ? "up"
            : (cat.revenueGrowthPercent ?? 0) < 0
              ? "down"
              : "flat",
      })),
      badges: [
        {
          label: `${fastest.categoryName} Leading`,
          tone: "positive",
        },
      ],
      recommendation: `Invest inventory and marketing in ${fastest.categoryName} for next month.`,
      reason: "Category growth based on month-over-month revenue comparison.",
    });
  }

  const rising = [...(topProducts ?? [])]
    .filter((p) => (p.unitsGrowthPercent ?? 0) > 10)
    .slice(0, 3);
  const declining = [...(topProducts ?? [])]
    .filter((p) => (p.unitsGrowthPercent ?? 0) < -10)
    .slice(0, 3);

  if (rising.length > 0) {
    cards.push({
      type: "forecast",
      title: "Products Expected to Grow",
      metrics: rising.map((p) => ({
        label: p.productName.slice(0, 24),
        value: formatPercent(p.unitsGrowthPercent ?? 0),
        trend: "up" as const,
      })),
      badges: [{ label: "Rising Demand", tone: "positive" }],
      recommendation: "Ensure adequate stock for rising products.",
    });
  }

  if (declining.length > 0) {
    cards.push({
      type: "forecast",
      title: "Products Expected to Decline",
      metrics: declining.map((p) => ({
        label: p.productName.slice(0, 24),
        value: formatPercent(p.unitsGrowthPercent ?? 0),
        trend: "down" as const,
      })),
      badges: [{ label: "Slowing Sales", tone: "warning" }],
      recommendation: "Consider promotions or pricing review for declining products.",
    });
  }

  return cards;
}

export function computeOpportunityCards(args: {
  promotionCount?: number;
  searchGaps?: number;
  topProducts?: ProductForecastItem[];
}): InsightCard[] {
  const cards: InsightCard[] = [];

  if ((args.promotionCount ?? 0) > 0 || (args.searchGaps ?? 0) > 0) {
    cards.push({
      type: "opportunity",
      title: "Growth Opportunities",
      metrics: [
        {
          label: "Promotion Candidates",
          value: formatNumber(args.promotionCount ?? 0),
        },
        {
          label: "Search Demand Gaps",
          value: formatNumber(args.searchGaps ?? 0),
        },
      ],
      badges: [{ label: "Opportunity", tone: "positive" }],
      recommendation:
        "Run targeted promotions and fill catalog gaps identified by search demand.",
    });
  }

  const topSellers = [...(args.topProducts ?? [])]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 3);
  if (topSellers.length > 0) {
    cards.push({
      type: "forecast",
      title: "Top Sellers Next Month",
      subtitle: "Based on current momentum",
      metrics: topSellers.map((p) => ({
        label: p.productName.slice(0, 24),
        value: `${formatNumber(p.unitsSold)} units`,
        trend: "up" as const,
      })),
      badges: [{ label: "High Velocity", tone: "info" }],
      recommendation: "Prioritize inventory for expected top sellers.",
    });
  }

  return cards;
}

export function computeRiskForecastCards(args: {
  lowStockCount?: number;
  decliningProductCount?: number;
  zeroResultSearchCount?: number;
  aov?: number;
  customerCount?: number;
}): InsightCard[] {
  const cards: InsightCard[] = [];
  const hasRisk =
    (args.lowStockCount ?? 0) > 0 ||
    (args.decliningProductCount ?? 0) > 0 ||
    (args.zeroResultSearchCount ?? 0) > 0;

  if (!hasRisk && !args.aov) return cards;

  cards.push({
    type: "risk",
    title: "Risk Alerts",
    metrics: [
      {
        label: "Low Stock Products",
        value: formatNumber(args.lowStockCount ?? 0),
        trend: (args.lowStockCount ?? 0) > 0 ? "down" : "flat",
      },
      {
        label: "Declining Products",
        value: formatNumber(args.decliningProductCount ?? 0),
      },
      {
        label: "Zero-Result Searches",
        value: formatNumber(args.zeroResultSearchCount ?? 0),
      },
      ...(args.aov
        ? [{ label: "Average Order Value", value: formatCurrency(args.aov) }]
        : []),
    ],
    badges: [
      {
        label: hasRisk ? "Attention Needed" : "Stable",
        tone: hasRisk ? "warning" : "positive",
      },
    ],
    recommendation: hasRisk
      ? "Address inventory gaps and underperforming products this week."
      : "No critical risks detected in current data.",
  });

  return cards;
}
