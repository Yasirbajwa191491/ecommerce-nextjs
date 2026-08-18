export type DeliveryOptionForm = {
  type: "standard" | "express" | "same_day" | "next_day" | "pickup";
  enabled: boolean;
  charge: number;
  estimate: string;
};

export type WarrantyDurationForm =
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"
  | "2_years"
  | "3_years"
  | "";

export type WarrantyTypeForm =
  | "manufacturer"
  | "store"
  | "replacement"
  | "limited"
  | "";

export const DELIVERY_METHOD_LABELS: Record<DeliveryOptionForm["type"], string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  same_day: "Same Day Delivery",
  next_day: "Next Day Delivery",
  pickup: "Store Pickup",
};

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOptionForm[] = [
  {
    type: "standard",
    enabled: true,
    charge: 0,
    estimate: "3-5 Business Days",
  },
  {
    type: "express",
    enabled: false,
    charge: 12,
    estimate: "1-2 Business Days",
  },
  {
    type: "same_day",
    enabled: false,
    charge: 20,
    estimate: "Today",
  },
  {
    type: "next_day",
    enabled: false,
    charge: 15,
    estimate: "Next Business Day",
  },
  {
    type: "pickup",
    enabled: false,
    charge: 0,
    estimate: "Ready within 2 hours",
  },
];

export const WARRANTY_DURATION_OPTIONS: Array<{
  value: Exclude<WarrantyDurationForm, "">;
  label: string;
}> = [
  { value: "1_month", label: "1 Month" },
  { value: "3_months", label: "3 Months" },
  { value: "6_months", label: "6 Months" },
  { value: "1_year", label: "1 Year" },
  { value: "2_years", label: "2 Years" },
  { value: "3_years", label: "3 Years" },
];

export const WARRANTY_TYPE_OPTIONS: Array<{
  value: Exclude<WarrantyTypeForm, "">;
  label: string;
}> = [
  { value: "manufacturer", label: "Manufacturer Warranty" },
  { value: "store", label: "Store Warranty" },
  { value: "replacement", label: "Replacement Warranty" },
  { value: "limited", label: "Limited Warranty" },
];

export function normalizeDeliveryOptionsForm(
  options?: DeliveryOptionForm[] | null
): DeliveryOptionForm[] {
  if (!options?.length) {
    return DEFAULT_DELIVERY_OPTIONS.map((option) => ({ ...option }));
  }

  const byType = new Map(options.map((option) => [option.type, option]));
  return DEFAULT_DELIVERY_OPTIONS.map((defaultOption) => {
    const existing = byType.get(defaultOption.type);
    if (!existing) return { ...defaultOption };
    return {
      type: defaultOption.type,
      enabled: existing.enabled === true,
      charge: Number.isFinite(existing.charge)
        ? Math.max(0, existing.charge)
        : defaultOption.charge,
      estimate: existing.estimate.trim() || defaultOption.estimate,
    };
  });
}
