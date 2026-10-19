/**
 * Privacy-safe forecast coverage helpers.
 * They do not read orders and they do not invent stock history.
 */

export type OrderClass = "eligible" | "refund" | "ineligible";

export function classifyOrder(input: {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
}): OrderClass {
  if (input.status === "refunded" || input.paymentStatus === "refunded") return "refund";
  if (input.paymentStatus !== "paid") return "ineligible";
  if (input.paymentMethod !== "stripe" && input.paymentMethod !== "cod") return "ineligible";
  if (!["processing", "confirmed", "shipped", "delivered"].includes(input.status)) return "ineligible";
  return "eligible";
}

export function lineIncluded(orderClass: OrderClass, isGift: boolean): boolean {
  return orderClass === "eligible" && !isGift;
}

export function withinCutoff(lineDate: string, cutoff: string): boolean {
  return lineDate <= cutoff;
}

export type Coverage = {
  observedDays: number;
  units: number;
  firstDate: string;
  lastDate: string;
  dates: string[];
};

export function observeDay(current: Coverage | undefined, date: string, units: number): Coverage {
  if (!current) {
    return { observedDays: 1, units, firstDate: date, lastDate: date, dates: [date] };
  }
  if (current.dates.includes(date)) {
    return { ...current, units: current.units + units };
  }
  const dates = [...current.dates, date].sort();
  return {
    observedDays: dates.length,
    units: current.units + units,
    firstDate: dates[0] ?? date,
    lastDate: dates[dates.length - 1] ?? date,
    dates,
  };
}

export function gapRate(coverage: Coverage): number | null {
  const start = Date.parse(`${coverage.firstDate}T00:00:00.000Z`);
  const end = Date.parse(`${coverage.lastDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const span = Math.round((end - start) / 86_400_000) + 1;
  if (span <= 0) return null;
  return 1 - coverage.observedDays / span;
}

export function insufficientHistory(observedDays: number, minimum = 14): boolean {
  return observedDays < minimum;
}

export function claimDecision(existing: boolean): "insert" | "skip" {
  return existing ? "skip" : "insert";
}

export function assertSnapshotDate(requested: string, today: string): void {
  if (requested !== today) {
    throw new Error("Historical stock snapshots cannot be backfilled");
  }
}

export function qualityNote(complete: boolean): string {
  if (!complete) {
    return "Aggregation is still walking paid orders. This partial window is not complete history.";
  }
  return "Coverage uses eligible paid order lines up to the cutoff. It is not a published forecast and it does not fill missing days with zero sales.";
}

export type SafeLine = {
  lineKey: string;
  orderKey: string;
  productId: string;
  categoryId: string;
  quantity: number;
  date: string;
};

export function toQualityLine(input: {
  lineKey: string;
  orderKey: string;
  productId: string;
  categoryId: string;
  quantity: number;
  date: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
}): SafeLine {
  return {
    lineKey: input.lineKey,
    orderKey: input.orderKey,
    productId: input.productId,
    categoryId: input.categoryId,
    quantity: input.quantity,
    date: input.date,
  };
}
