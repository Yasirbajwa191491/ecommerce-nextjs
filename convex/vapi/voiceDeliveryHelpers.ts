import { v } from "convex/values";
import type { CheckoutPricingResult } from "../lib/checkoutPricing";
import {
  deliveryMethodTypeValidator,
  type DeliveryMethodType,
} from "../lib/productValidators";

function formatVoiceMoney(amount: number, currency: string): string {
  return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
}

export const voiceDeliveryMethodOptionValidator = v.object({
  type: deliveryMethodTypeValidator,
  label: v.string(),
  charge: v.number(),
  estimate: v.string(),
});

const DELIVERY_METHOD_ALIASES: Record<string, DeliveryMethodType> = {
  standard: "standard",
  "standard delivery": "standard",
  express: "express",
  "express delivery": "express",
  same_day: "same_day",
  sameday: "same_day",
  "same day": "same_day",
  "same day delivery": "same_day",
  next_day: "next_day",
  nextday: "next_day",
  "next day": "next_day",
  "next day delivery": "next_day",
  pickup: "pickup",
  "store pickup": "pickup",
  "in store pickup": "pickup",
};

const DELIVERY_METHODS: DeliveryMethodType[] = [
  "standard",
  "express",
  "same_day",
  "next_day",
  "pickup",
];

export function parseVoiceDeliveryMethod(
  value: unknown
): DeliveryMethodType | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;

  if (DELIVERY_METHOD_ALIASES[trimmed]) {
    return DELIVERY_METHOD_ALIASES[trimmed];
  }

  const underscored = trimmed.replace(/[\s-]+/g, "_");
  if (DELIVERY_METHODS.includes(underscored as DeliveryMethodType)) {
    return underscored as DeliveryMethodType;
  }

  return undefined;
}

export function formatVoiceDeliveryCharge(
  charge: number,
  currency: string
): string {
  return charge <= 0 ? "Free" : formatVoiceMoney(charge, currency);
}

export function formatVoiceDeliveryOptionsList(
  methods: Array<{
    type: DeliveryMethodType;
    label: string;
    charge: number;
    estimate: string;
  }>,
  currency: string
): string {
  if (methods.length === 0) {
    return "No delivery methods are configured for this cart.";
  }

  return methods
    .map(
      (method) =>
        `${method.label} (${method.type}): ${formatVoiceDeliveryCharge(method.charge, currency)} — ${method.estimate}`
    )
    .join("\n");
}

export function formatVoiceCartDeliverySummary(
  priced: Pick<
    CheckoutPricingResult,
    | "deliveryMethod"
    | "deliveryMethodLabel"
    | "deliveryCharge"
    | "deliveryEstimate"
    | "shipping"
    | "currency"
  >
): string {
  const isStandard =
    priced.deliveryMethod === "standard" || !priced.deliveryMethod;
  const deliveryFee = isStandard ? priced.shipping : priced.deliveryCharge;
  const feeLabel = isStandard
    ? "Standard shipping"
    : (priced.deliveryMethodLabel ?? "Delivery");

  return [
    `Delivery method: ${priced.deliveryMethodLabel ?? priced.deliveryMethod}`,
    `Estimate: ${priced.deliveryEstimate}`,
    `${feeLabel}: ${formatVoiceDeliveryCharge(deliveryFee, priced.currency)}`,
  ].join("\n");
}

export function formatVoiceOrderConfirmationDelivery(
  order: {
    deliveryMethodLabel?: string;
    deliveryEstimate?: string;
    deliveryCharge?: number;
    shipping: number;
    deliveryMethod?: string;
    currency: string;
  }
): string {
  const isStandard =
    !order.deliveryMethod || order.deliveryMethod === "standard";
  const fee = isStandard ? order.shipping : (order.deliveryCharge ?? 0);
  const lines = [
    order.deliveryMethodLabel
      ? `Delivery: ${order.deliveryMethodLabel}`
      : null,
    order.deliveryEstimate ? `Estimate: ${order.deliveryEstimate}` : null,
    `${isStandard ? "Shipping" : "Delivery fee"}: ${formatVoiceDeliveryCharge(fee, order.currency)}`,
  ].filter(Boolean);

  return lines.join("\n");
}
