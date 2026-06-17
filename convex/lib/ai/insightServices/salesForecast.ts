import type { InsightCard } from "./types";
import { formatCurrency, formatPercent, formatNumber } from "./types";

type RevenueContext = {
  currency?: string;
  totalRevenue?: number;
};

type TrendPoint = { value: number };
type SalesTrendContext = {
  revenueSeries?: TrendPoint[];
  ordersSeries?: TrendPoint[];
};

export function computeRevenueForecastCard(
  revenue: RevenueContext | undefined,
  trends: SalesTrendContext | undefined
): InsightCard[] {
  if (!revenue) return [];
  const currency = revenue.currency ?? "USD";
  const currentRevenue = revenue.totalRevenue ?? 0;
  const revenueSeries = trends?.revenueSeries ?? [];
  const ordersSeries = trends?.ordersSeries ?? [];

  const previousValue =
    revenueSeries.length >= 2 ? revenueSeries[revenueSeries.length - 2]?.value ?? 0 : 0;
  const latestValue =
    revenueSeries.length > 0 ? revenueSeries[revenueSeries.length - 1]?.value ?? 0 : 0;
  const growthRate = previousValue > 0 ? (latestValue - previousValue) / previousValue : 0;
  const forecast = Math.max(0, Math.round(currentRevenue * (1 + growthRate * 0.6)));

  const orderVolatility =
    ordersSeries.length >= 2
      ? Math.abs((ordersSeries[ordersSeries.length - 1]?.value ?? 0) - (ordersSeries[ordersSeries.length - 2]?.value ?? 0))
      : 0;
  const confidence = Math.max(55, Math.min(92, Math.round(85 - orderVolatility)));

  return [
    {
      type: "forecast",
      title: "Sales Forecast",
      metrics: [
        { label: "Current Month Revenue", value: formatCurrency(currentRevenue, currency) },
        { label: "Forecast Next Month", value: formatCurrency(forecast, currency), trend: forecast >= currentRevenue ? "up" : "down" },
        { label: "Confidence", value: formatPercent(confidence) },
        { label: "Trend Buckets", value: formatNumber(revenueSeries.length) },
      ],
      badges: [
        { label: forecast >= currentRevenue ? "Growth Expected" : "Watch Trend", tone: forecast >= currentRevenue ? "positive" : "warning" },
      ],
      recommendation:
        forecast >= currentRevenue
          ? "Support top-performing categories with inventory and campaigns."
          : "Prioritize promotion and retention campaigns to reduce downside risk.",
      reason:
        "Forecast blends recent revenue trend movement with current month performance.",
    },
  ];
}
