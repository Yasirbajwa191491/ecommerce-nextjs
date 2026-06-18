import type { Doc, Id } from "../_generated/dataModel";
import { roundMoney } from "./pricing";
import {
  DELIVERY_METHOD_LABELS,
  type DeliveryMethodType,
  type DeliveryOption,
  getDefaultDeliveryOptions,
  normalizeDeliveryOptions,
} from "./productValidators";

export type DeliveryMethodOption = {
  type: DeliveryMethodType;
  label: string;
  charge: number;
  estimate: string;
};

export function getProductDeliveryOptions(
  product: Pick<Doc<"products">, "deliveryOptions">
): DeliveryOption[] {
  return normalizeDeliveryOptions(product.deliveryOptions);
}

export function resolveAvailableDeliveryMethods(
  products: Array<
    Pick<
      Doc<"products">,
      "_id" | "shipping" | "shippingCharges" | "deliveryOptions"
    >
  >
): DeliveryMethodOption[] {
  if (products.length === 0) return [];

  const normalized = products.map((product) => ({
    product,
    options: getProductDeliveryOptions(product),
  }));

  const allTypes: DeliveryMethodType[] = [
    "standard",
    "express",
    "same_day",
    "next_day",
    "pickup",
  ];

  const results: DeliveryMethodOption[] = [];

  for (const type of allTypes) {
    const enabledForAll = normalized.every(({ options }) => {
      const option = options.find((entry) => entry.type === type);
      return option?.enabled === true;
    });

    if (!enabledForAll) continue;

    let totalCharge = 0;
    const allocated = new Set<string>();
    let estimate = "";

    for (const { product, options } of normalized) {
      const option = options.find((entry) => entry.type === type)!;

      if (type === "standard") {
        if (!product.shipping && !allocated.has(product._id)) {
          allocated.add(product._id);
          totalCharge += roundMoney(product.shippingCharges ?? 0);
        }
      } else if (!allocated.has(product._id)) {
        allocated.add(product._id);
        totalCharge += roundMoney(option.charge);
      }

      if (option.estimate.length > estimate.length) {
        estimate = option.estimate;
      }
    }

    results.push({
      type,
      label: DELIVERY_METHOD_LABELS[type],
      charge: roundMoney(totalCharge),
      estimate: estimate || DELIVERY_METHOD_LABELS[type],
    });
  }

  return results;
}

export function calculateDeliveryChargeForMethod(
  products: Array<
    Pick<
      Doc<"products">,
      "_id" | "shipping" | "shippingCharges" | "deliveryOptions"
    >
  >,
  method: DeliveryMethodType
): { charge: number; estimate: string; label: string } {
  const available = resolveAvailableDeliveryMethods(products);
  const match = available.find((entry) => entry.type === method);
  if (!match) {
    throw new Error("Selected delivery method is not available for your cart");
  }
  return {
    charge: match.charge,
    estimate: match.estimate,
    label: match.label,
  };
}

export function getDefaultDeliveryMethod(
  products: Array<
    Pick<
      Doc<"products">,
      "_id" | "shipping" | "shippingCharges" | "deliveryOptions"
    >
  >
): DeliveryMethodType {
  const available = resolveAvailableDeliveryMethods(products);
  return available[0]?.type ?? "standard";
}

export function productHasDeliveryMethod(
  product: Pick<
    Doc<"products">,
    "shipping" | "shippingCharges" | "deliveryOptions"
  >,
  method: DeliveryMethodType
): boolean {
  const options = getProductDeliveryOptions(product);
  const option = options.find((entry) => entry.type === method);
  if (!option?.enabled) return false;
  if (method === "standard") return true;
  return true;
}

export { getDefaultDeliveryOptions, normalizeDeliveryOptions };
