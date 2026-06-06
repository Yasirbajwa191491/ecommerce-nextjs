import { v } from "convex/values";

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("confirmed"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("refunded"),
  v.literal("failed"),
  v.literal("expired")
);

export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded")
);

export const paymentMethodValidator = v.union(
  v.literal("cod"),
  v.literal("stripe")
);

export const orderSortValidator = v.union(
  v.literal("newest"),
  v.literal("oldest"),
  v.literal("highest_amount"),
  v.literal("lowest_amount")
);

export const orderStatusLogActorValidator = v.union(
  v.literal("system"),
  v.literal("admin"),
  v.literal("customer")
);

export const paymentLogActorValidator = v.union(
  v.literal("system"),
  v.literal("admin"),
  v.literal("webhook")
);

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed"
  | "expired";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod = "cod" | "stripe";

export const ADMIN_ORDER_TAB_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export function formatOrderStatusLabel(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatPaymentStatusLabel(status: PaymentStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatPaymentMethodLabel(method: PaymentMethod): string {
  return method === "cod" ? "Cash On Delivery" : "Stripe";
}
