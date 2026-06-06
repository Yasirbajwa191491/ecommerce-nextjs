import { v } from "convex/values";

export const dashboardRangeValidator = v.union(
  v.literal("today"),
  v.literal("week"),
  v.literal("month"),
  v.literal("quarter"),
  v.literal("year"),
  v.literal("custom")
);

export type DashboardRange =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export type DateRange = {
  from: number;
  to: number;
};

export type TrendBucketGranularity = "hour" | "day" | "week" | "month";

export type TrendBucket = {
  key: string;
  label: string;
  start: number;
  end: number;
};

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfQuarter(ts: number): number {
  const d = new Date(ts);
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  d.setMonth(quarterStartMonth, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfQuarter(ts: number): number {
  const d = new Date(ts);
  const quarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
  d.setMonth(quarterStartMonth + 3, 0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfYear(ts: number): number {
  const d = new Date(ts);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfYear(ts: number): number {
  const d = new Date(ts);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function resolveDashboardRange(
  range: DashboardRange,
  dateFrom?: number,
  dateTo?: number,
  now = Date.now()
): DateRange {
  switch (range) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom": {
      if (dateFrom === undefined || dateTo === undefined) {
        return { from: startOfMonth(now), to: endOfMonth(now) };
      }
      return {
        from: startOfDay(dateFrom),
        to: endOfDay(dateTo),
      };
    }
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function resolvePreviousPeriod(current: DateRange): DateRange {
  const span = current.to - current.from + 1;
  return {
    from: current.from - span,
    to: current.from - 1,
  };
}

export function resolveBucketGranularity(
  range: DashboardRange,
  period: DateRange
): TrendBucketGranularity {
  if (range === "today") return "hour";
  if (range === "week" || range === "month") return "day";
  if (range === "quarter") return "week";
  if (range === "year") return "month";

  const spanDays = (period.to - period.from) / MS_DAY;
  if (spanDays <= 7) return "day";
  if (spanDays <= 90) return "day";
  if (spanDays <= 365) return "week";
  return "month";
}

function formatHourLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
}

function formatDayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekLabel(ts: number): string {
  const end = Math.min(ts + MS_DAY * 6, Date.now());
  return `${formatDayLabel(ts)} – ${formatDayLabel(end)}`;
}

function formatMonthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function buildTrendBuckets(
  period: DateRange,
  granularity: TrendBucketGranularity
): TrendBucket[] {
  const buckets: TrendBucket[] = [];
  let cursor = period.from;

  if (granularity === "hour") {
    cursor = new Date(period.from).setMinutes(0, 0, 0);
    while (cursor <= period.to) {
      const end = cursor + MS_HOUR - 1;
      buckets.push({
        key: String(cursor),
        label: formatHourLabel(cursor),
        start: cursor,
        end,
      });
      cursor += MS_HOUR;
    }
    return buckets;
  }

  if (granularity === "day") {
    cursor = startOfDay(period.from);
    while (cursor <= period.to) {
      const end = endOfDay(cursor);
      buckets.push({
        key: String(cursor),
        label: formatDayLabel(cursor),
        start: cursor,
        end,
      });
      cursor += MS_DAY;
    }
    return buckets;
  }

  if (granularity === "week") {
    cursor = startOfWeek(period.from);
    while (cursor <= period.to) {
      const end = endOfDay(cursor + MS_DAY * 6);
      buckets.push({
        key: String(cursor),
        label: formatWeekLabel(cursor),
        start: cursor,
        end,
      });
      cursor += MS_DAY * 7;
    }
    return buckets;
  }

  cursor = startOfMonth(period.from);
  while (cursor <= period.to) {
    const end = endOfMonth(cursor);
    buckets.push({
      key: String(cursor),
      label: formatMonthLabel(cursor),
      start: cursor,
      end,
    });
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1, 1);
    cursor = next.getTime();
  }

  return buckets;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function trendDirection(
  current: number,
  previous: number
): "up" | "down" | "flat" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}
