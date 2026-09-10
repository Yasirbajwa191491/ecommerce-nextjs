import { v } from "convex/values";

export const orderNotificationEventValidator = v.union(
  v.literal("order.created"),
  v.literal("payment.succeeded"),
  v.literal("payment.failed"),
  v.literal("order.confirmed"),
  v.literal("order.processing"),
  v.literal("order.shipped"),
  v.literal("order.delivered"),
  v.literal("order.cancelled"),
  v.literal("order.refunded"),
  v.literal("payment.received"),
  v.literal("order.recovery.reminder"),
  v.literal("order.expired")
);

export type OrderNotificationEvent =
  | "order.created"
  | "payment.succeeded"
  | "payment.failed"
  | "order.confirmed"
  | "order.processing"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.refunded"
  | "payment.received"
  | "order.recovery.reminder"
  | "order.expired";

export const pushPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android"),
  v.literal("unknown")
);

export type PushPlatform = "ios" | "android" | "unknown";

export type NotificationChannel = "push" | "email" | "sms";

export type NotificationPreferenceCategory =
  | "orderUpdates"
  | "paymentUpdates"
  | "promotionalNotifications";
