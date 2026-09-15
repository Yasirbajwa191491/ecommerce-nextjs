import { v } from "convex/values";

export const QR_TYPES = ["product", "order", "package", "payment", "delivery"] as const;
export type QrType = (typeof QR_TYPES)[number];

export const qrTypeValidator = v.union(
  v.literal("product"),
  v.literal("order"),
  v.literal("package"),
  v.literal("payment"),
  v.literal("delivery")
);

export const QR_STATUSES = ["active", "revoked", "expired"] as const;
export type QrStatus = (typeof QR_STATUSES)[number];

export const qrStatusValidator = v.union(
  v.literal("active"),
  v.literal("revoked"),
  v.literal("expired")
);

export const QR_SCAN_SOURCES = [
  "web",
  "mobile",
  "admin",
  "webhook",
  "unknown",
] as const;
export type QrScanSource = (typeof QR_SCAN_SOURCES)[number];

export const qrScanSourceValidator = v.union(
  v.literal("web"),
  v.literal("mobile"),
  v.literal("admin"),
  v.literal("webhook"),
  v.literal("unknown")
);

/** Lifecycle of a QR interaction — never treat a scan alone as payment success. */
export const QR_SCAN_EVENTS = [
  "resolved",
  "payment_initiated",
  "payment_succeeded",
] as const;
export type QrScanEvent = (typeof QR_SCAN_EVENTS)[number];

export const qrScanEventValidator = v.union(
  v.literal("resolved"),
  v.literal("payment_initiated"),
  v.literal("payment_succeeded")
);

export const QR_RESOLVE_CODES = [
  "ok",
  "invalid",
  "expired",
  "revoked",
  "unauthorized",
  "not_found",
  "payment_unavailable",
  "already_paid",
  "cancelled",
] as const;
export type QrResolveCode = (typeof QR_RESOLVE_CODES)[number];

export const qrResolveCodeValidator = v.union(
  v.literal("ok"),
  v.literal("invalid"),
  v.literal("expired"),
  v.literal("revoked"),
  v.literal("unauthorized"),
  v.literal("not_found"),
  v.literal("payment_unavailable"),
  v.literal("already_paid"),
  v.literal("cancelled")
);

export const QR_PAYMENT_TTL_MS = 30 * 60 * 1000;

export const QR_RESOLVE_MESSAGES: Record<QrResolveCode, string> = {
  ok: "QR code resolved.",
  invalid: "This QR code is not valid.",
  expired: "This QR code has expired.",
  revoked: "This QR code is no longer active.",
  unauthorized: "You are not authorized to use this QR code.",
  not_found: "This QR code is not valid.",
  payment_unavailable: "This payment link is no longer available.",
  already_paid: "This order has already been paid.",
  cancelled: "This order is no longer available for payment.",
};
