import type { Id } from "../../../_generated/dataModel";
import type { InsightCard } from "./types";
import { formatNumber } from "./types";

type InventoryCandidate = {
  productId: Id<"products">;
  name: string;
  stock: number;
  monthlyUnitsSold: number;
  dailyVelocity: number;
  daysOfCover: number;
  reorderPriority: "critical" | "high" | "medium" | "low";
};

type InventoryContext = {
  reorderCandidates?: InventoryCandidate[];
  lowStock?: Array<{ productId: string; name: string; stock: number }>;
};

function toTone(priority: InventoryCandidate["reorderPriority"]) {
  if (priority === "critical") return "risk" as const;
  if (priority === "high") return "warning" as const;
  return "info" as const;
}

export function computeInventoryCards(
  inventory: InventoryContext | undefined
): InsightCard[] {
  if (!inventory) return [];

  const cards: InsightCard[] = [];
  const topCandidates = (inventory.reorderCandidates ?? []).slice(0, 5);

  for (const item of topCandidates) {
    const projectedStock30d = Math.round(item.stock - item.dailyVelocity * 30);
    const reorderUnits = Math.max(
      0,
      Math.ceil(item.dailyVelocity * 30 - item.stock)
    );

    cards.push({
      type: "inventory",
      title: "Inventory Forecast",
      subtitle: item.name,
      productId: item.productId,
      productName: item.name,
      metrics: [
        { label: "Current Stock", value: formatNumber(item.stock) },
        {
          label: "Average Daily Sales",
          value: item.dailyVelocity.toFixed(2),
        },
        { label: "Estimated Stockout", value: `${item.daysOfCover} days` },
        { label: "30-Day Projection", value: formatNumber(projectedStock30d) },
      ],
      badges: [{ label: item.reorderPriority.toUpperCase(), tone: toTone(item.reorderPriority) }],
      recommendation:
        reorderUnits > 0
          ? `Reorder ${formatNumber(reorderUnits)} units`
          : "Monitor stock during the next 30 days",
      reason:
        item.monthlyUnitsSold > 0
          ? `Recent demand is ${formatNumber(item.monthlyUnitsSold)} units in the last 30 days.`
          : "No recent sales trend detected for this product.",
    });
  }

  const lowStockCount = inventory.lowStock?.length ?? 0;
  if (lowStockCount > 0) {
    cards.push({
      type: "risk",
      title: "Inventory Risks",
      metrics: [{ label: "Low Stock Products", value: formatNumber(lowStockCount) }],
      badges: [{ label: "Inventory Risk", tone: "warning" }],
      recommendation: "Prioritize replenishment for low-stock products this week.",
    });
  }

  return cards;
}
