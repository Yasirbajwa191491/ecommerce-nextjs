import { formatCurrencyAmount } from "@ecommerce/shared";

import type { Product } from "@/types/product";

type DeliveryOption = {
  type: "standard" | "express" | "same_day" | "next_day" | "pickup";
  enabled: boolean;
  charge: number;
  estimate: string;
};

const DELIVERY_METHOD_LABELS: Record<DeliveryOption["type"], string> = {
  standard: "Standard Delivery",
  express: "Express Delivery",
  same_day: "Same Day Delivery",
  next_day: "Next Day Delivery",
  pickup: "Store Pickup",
};

const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  { type: "standard", enabled: true, charge: 0, estimate: "3-5 Business Days" },
  { type: "express", enabled: false, charge: 12, estimate: "1-2 Business Days" },
  { type: "same_day", enabled: false, charge: 20, estimate: "Today" },
  { type: "next_day", enabled: false, charge: 15, estimate: "Next Business Day" },
  { type: "pickup", enabled: false, charge: 0, estimate: "Ready within 2 hours" },
];

const WARRANTY_DURATION_LABELS: Record<string, string> = {
  "1_month": "1 Month",
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
  "2_years": "2 Years",
  "3_years": "3 Years",
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer Warranty",
  store: "Store Warranty",
  replacement: "Replacement Warranty",
  limited: "Limited Warranty",
};

function normalizeDeliveryOptions(options?: DeliveryOption[] | null): DeliveryOption[] {
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

export function getEnabledDeliveryOptions(product: Product) {
  return normalizeDeliveryOptions(
    product.deliveryOptions as DeliveryOption[] | undefined
  ).filter((option) => option.enabled);
}

export function getWarrantyLabel(product: Product): string | null {
  if (!product.warrantyAvailable) return null;

  const parts: string[] = [];
  if (
    product.warrantyDuration &&
    WARRANTY_DURATION_LABELS[product.warrantyDuration]
  ) {
    parts.push(WARRANTY_DURATION_LABELS[product.warrantyDuration]!);
  }
  if (product.warrantyType && WARRANTY_TYPE_LABELS[product.warrantyType]) {
    parts.push(WARRANTY_TYPE_LABELS[product.warrantyType]!);
  }
  if (product.warrantyDetails?.trim()) {
    parts.push(product.warrantyDetails.trim());
  }

  return parts.length > 0 ? parts.join(" — ") : "Warranty included";
}

export type DeliveryOptionDisplay = {
  type: DeliveryOption["type"];
  label: string;
  charge: number;
  estimate: string;
};

export function describeDeliveryOption(
  product: Product,
  type: DeliveryOption["type"]
): DeliveryOptionDisplay | null {
  const option = getEnabledDeliveryOptions(product).find((entry) => entry.type === type);
  if (!option) return null;

  if (type === "standard") {
    const charge = product.shipping === true ? 0 : (product.shippingCharges ?? 0);
    return {
      type,
      label: DELIVERY_METHOD_LABELS.standard,
      charge,
      estimate: option.estimate,
    };
  }

  return {
    type,
    label: DELIVERY_METHOD_LABELS[type],
    charge: option.charge,
    estimate: option.estimate,
  };
}

export function formatDeliveryCharge(charge: number, currency?: string | null): string {
  if (charge <= 0) return "Free";
  return formatCurrencyAmount(charge, currency ?? "USD");
}

export function formatShippingLine(product: Product): string {
  if (product.shipping === true) return "Free Shipping";
  return `Shipping Charges: ${formatCurrencyAmount(
    product.shippingCharges ?? 0,
    product.currency ?? "USD"
  )}`;
}
