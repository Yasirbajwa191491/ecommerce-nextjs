export type DashboardRange =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export const DASHBOARD_RANGE_OPTIONS: {
  value: DashboardRange;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "month";

export function parseDashboardRange(value: string | null): DashboardRange {
  const valid: DashboardRange[] = [
    "today",
    "week",
    "month",
    "quarter",
    "year",
    "custom",
  ];
  if (value && valid.includes(value as DashboardRange)) {
    return value as DashboardRange;
  }
  return DEFAULT_DASHBOARD_RANGE;
}

export function parseDateParam(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

export function dateStringToStartMs(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export function dateStringToEndMs(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T23:59:59.999`);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export type DashboardQueryArgs = {
  range: DashboardRange;
  dateFrom?: number;
  dateTo?: number;
};

export function buildDashboardQueryArgs(
  range: DashboardRange,
  from: string,
  to: string
): DashboardQueryArgs {
  if (range !== "custom") {
    return { range };
  }
  const dateFrom = dateStringToStartMs(from);
  const dateTo = dateStringToEndMs(to);
  return {
    range,
    ...(dateFrom !== undefined ? { dateFrom } : {}),
    ...(dateTo !== undefined ? { dateTo } : {}),
  };
}

export function buildDashboardSearchParams(
  range: DashboardRange,
  from: string,
  to: string
): string {
  const params = new URLSearchParams();
  params.set("range", range);
  if (range === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params.toString();
}

export function formatPercentChange(value: number | null): string {
  if (value === null) return "New";
  if (value === 0) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatActivityTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
