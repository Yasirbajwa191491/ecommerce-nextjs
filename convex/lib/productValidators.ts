import { v } from "convex/values";

export const deliveryMethodTypeValidator = v.union(
  v.literal("standard"),
  v.literal("express"),
  v.literal("same_day"),
  v.literal("next_day"),
  v.literal("pickup")
);

export type DeliveryMethodType =
  | "standard"
  | "express"
  | "same_day"
  | "next_day"
  | "pickup";

export const warrantyDurationValidator = v.union(
  v.literal("1_month"),
  v.literal("3_months"),
  v.literal("6_months"),
  v.literal("1_year"),
  v.literal("2_years"),
  v.literal("3_years")
);

export type WarrantyDuration =
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"
  | "2_years"
  | "3_years";

export const warrantyTypeValidator = v.union(
  v.literal("manufacturer"),
  v.literal("store"),
  v.literal("replacement"),
  v.literal("limited")
);

export type WarrantyType =
  | "manufacturer"
  | "store"
  | "replacement"
  | "limited";

export const deliveryOptionValidator = v.object({
  type: deliveryMethodTypeValidator,
  enabled: v.boolean(),
  charge: v.number(),
  estimate: v.string(),
});

export type DeliveryOption = {
  type: DeliveryMethodType;
  enabled: boolean;
  charge: number;
  estimate: string;
};

export const warrantyFieldsValidator = {
  warrantyAvailable: v.optional(v.boolean()),
  warrantyDuration: v.optional(warrantyDurationValidator),
  warrantyType: v.optional(warrantyTypeValidator),
  warrantyDetails: v.optional(v.string()),
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethodType, string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  same_day: "Same Day Delivery",
  next_day: "Next Day Delivery",
  pickup: "Store Pickup",
};

export const WARRANTY_DURATION_LABELS: Record<WarrantyDuration, string> = {
  "1_month": "1 Month",
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
  "2_years": "2 Years",
  "3_years": "3 Years",
};

export const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  manufacturer: "Manufacturer Warranty",
  store: "Store Warranty",
  replacement: "Replacement Warranty",
  limited: "Limited Warranty",
};

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
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

export function getDefaultDeliveryOptions(): DeliveryOption[] {
  return DEFAULT_DELIVERY_OPTIONS.map((option) => ({ ...option }));
}

export function normalizeDeliveryOptions(
  options: DeliveryOption[] | undefined | null
): DeliveryOption[] {
  const defaults = getDefaultDeliveryOptions();
  if (!options?.length) {
    return defaults;
  }

  const byType = new Map(options.map((option) => [option.type, option]));
  return defaults.map((defaultOption) => {
    const existing = byType.get(defaultOption.type);
    if (!existing) {
      return defaultOption;
    }
    const charge = Number.isFinite(existing.charge)
      ? Math.max(0, existing.charge)
      : defaultOption.charge;
    return {
      type: defaultOption.type,
      enabled: existing.enabled === true,
      charge,
      estimate: existing.estimate.trim() || defaultOption.estimate,
    };
  });
}

export function formatWarrantySummary(product: {
  warrantyAvailable?: boolean | null;
  warrantyDuration?: WarrantyDuration | null;
  warrantyType?: WarrantyType | null;
  warrantyDetails?: string | null;
}): string | undefined {
  if (!product.warrantyAvailable) {
    return undefined;
  }

  const parts: string[] = [];
  if (product.warrantyDuration) {
    parts.push(WARRANTY_DURATION_LABELS[product.warrantyDuration]);
  }
  if (product.warrantyType) {
    parts.push(WARRANTY_TYPE_LABELS[product.warrantyType]);
  }
  if (product.warrantyDetails?.trim()) {
    parts.push(product.warrantyDetails.trim());
  }

  return parts.length > 0 ? parts.join(" — ") : "Warranty included";
}
