import type { Id } from "../../../_generated/dataModel";

export type InsightTrend = "up" | "down" | "flat";

export type InsightBadgeTone = "info" | "positive" | "warning" | "risk";

export type InsightMetric = {
  label: string;
  value: string;
  trend?: InsightTrend;
};

export type InsightBadge = {
  label: string;
  tone: InsightBadgeTone;
};

export type InsightCardType =
  | "inventory"
  | "promotion"
  | "forecast"
  | "sentiment"
  | "marketing"
  | "search"
  | "risk"
  | "opportunity"
  | "pricing";

export type InsightCard = {
  type: InsightCardType;
  title: string;
  subtitle?: string;
  productId?: Id<"products">;
  productName?: string;
  metrics: InsightMetric[];
  badges: InsightBadge[];
  recommendation?: string;
  reason?: string;
};

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

export function formatCurrency(value: number, currency = "USD"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${Math.round(safe)}%`;
}
