import {
  DEFAULT_DELIVERY_OPTIONS,
  DELIVERY_METHOD_LABELS,
  normalizeDeliveryOptionsForm,
  type DeliveryOptionForm,
} from "@/lib/delivery-form-defaults";

export { DELIVERY_METHOD_LABELS };

export type ProductDisplaySource = {
  warrantyAvailable?: boolean | null;
  warrantyDuration?: string | null;
  warrantyType?: string | null;
  warrantyDetails?: string | null;
  deliveryOptions?: DeliveryOptionForm[] | null;
  shipping?: boolean | null;
  shippingCharges?: number | null;
};

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

export function formatWarrantySummary(product: ProductDisplaySource): string | undefined {
  if (!product.warrantyAvailable) return undefined;

  const parts: string[] = [];
  if (product.warrantyDuration && WARRANTY_DURATION_LABELS[product.warrantyDuration]) {
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

export function getEnabledDeliveryOptions(product: ProductDisplaySource) {
  return normalizeDeliveryOptionsForm(product.deliveryOptions).filter(
    (option) => option.enabled
  );
}

export function getWarrantyLabel(product: ProductDisplaySource): string | null {
  if (!product.warrantyAvailable) return null;
  return formatWarrantySummary(product) ?? "Warranty included";
}

export function describeDeliveryOption(
  product: ProductDisplaySource,
  type: DeliveryOptionForm["type"]
) {
  const option = getEnabledDeliveryOptions(product).find((entry) => entry.type === type);
  if (!option) return null;

  if (type === "standard") {
    const charge = product.shipping === true ? 0 : (product.shippingCharges ?? 0);
    return {
      label: DELIVERY_METHOD_LABELS.standard,
      charge,
      estimate: option.estimate,
    };
  }

  return {
    label: DELIVERY_METHOD_LABELS[type],
    charge: option.charge,
    estimate: option.estimate,
  };
}

export function getDefaultDeliveryOptionsForDisplay() {
  return DEFAULT_DELIVERY_OPTIONS.map((option) => ({ ...option }));
}
