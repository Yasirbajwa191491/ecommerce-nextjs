/**
 * A sale is a paid Stripe or COD order in a fulfillment status.
 * Pending COD, failed payments, cancellations, and whole-order refunds are excluded.
 * Dates use the UTC calendar day of paidAt, then createdAt.
 */

const ELIGIBLE_STATUSES = new Set(["processing", "confirmed", "shipped", "delivered"]);
const EXCLUDED_STATUSES = new Set(["pending", "cancelled", "refunded", "failed", "expired"]);

export function saleIsEligible(input: {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
}): boolean {
  if (EXCLUDED_STATUSES.has(input.status)) return false;
  if (input.paymentStatus !== "paid") return false;
  if (input.paymentMethod !== "stripe" && input.paymentMethod !== "cod") return false;
  return ELIGIBLE_STATUSES.has(input.status);
}

export function utcDateFromMillis(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export type DailyPoint = {
  date: string;
  units: number;
  orderCount: number;
  observation: "sale" | "zero_filled";
};

export function fillSalesDays(
  sales: Map<string, { units: number; orders: Set<string> }>,
  start: string,
  end: string
): DailyPoint[] {
  const points: DailyPoint[] = [];
  const latestStart = new Date(`${end}T00:00:00.000Z`).getTime() - 179 * 86_400_000;
  const cursor = new Date(Math.max(new Date(`${start}T00:00:00.000Z`).getTime(), latestStart));
  const last = new Date(`${end}T00:00:00.000Z`);
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < 180) {
    const day = cursor.toISOString().slice(0, 10);
    const found = sales.get(day);
    points.push({
      date: day,
      units: found?.units ?? 0,
      orderCount: found?.orders.size ?? 0,
      observation: found ? "sale" : "zero_filled",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return points;
}

export function weeklyTotals(dates: string[], units: number[]): { label: string; units: number }[] {
  const groups = new Map<string, number>();
  dates.forEach((day, index) => {
    const value = new Date(`${day}T00:00:00.000Z`);
    const week = `${value.getUTCFullYear()}-W${Math.ceil(value.getUTCDate() / 7)}-${value.getUTCMonth() + 1}`;
    groups.set(week, (groups.get(week) ?? 0) + (units[index] ?? 0));
  });
  return [...groups.entries()].map(([label, units]) => ({ label, units: round(units) }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
