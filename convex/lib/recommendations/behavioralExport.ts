/**
 * Minimized behavioral export records.
 * Raw visitor ids, emails, and order ids stay inside Convex. The HTTP action
 * replaces them with purpose-scoped tokens before the response is written.
 */

const COMPLETED_ORDER_STATUSES = new Set(["processing", "confirmed", "shipped", "delivered"]);

const EVENT_TYPE_MAP: Record<string, string> = {
  view: "product_view",
  impression: "recommendation_impression",
  click: "recommendation_click",
  cart_add: "add_to_cart",
  wishlist_add: "wishlist_add",
};

export function isAuthoritativePurchase(order: {
  status: string;
  paymentStatus: string;
  stockReleasedAt?: number;
}): boolean {
  if (order.paymentStatus !== "paid") return false;
  if (!COMPLETED_ORDER_STATUSES.has(order.status)) return false;
  return order.stockReleasedAt === undefined;
}

export function mapBehaviorEventType(eventType: string): string | null {
  if (eventType === "purchase") return null;
  return EVENT_TYPE_MAP[eventType] ?? null;
}

export type PublicBehavioralEvent = {
  event_id: string;
  event_type: string;
  product_id: string;
  visitor_id: string;
  occurred_at: number;
  platform: "web" | "mobile" | "unspecified";
  source: "convex_export";
  placement: string | null;
  model_version: string | null;
  order_id: string | null;
  purchase_authoritative: boolean;
};

export function toPublicBehavioralEvent(input: {
  eventId: string;
  eventType: string;
  productId: string;
  visitorToken: string;
  occurredAt: number;
  platform?: "web" | "mobile" | "unspecified";
  placement?: string;
  modelVersion?: string;
  orderToken?: string;
  purchaseAuthoritative?: boolean;
}): PublicBehavioralEvent {
  return {
    event_id: input.eventId,
    event_type: input.eventType,
    product_id: input.productId,
    visitor_id: input.visitorToken,
    occurred_at: input.occurredAt,
    platform: input.platform ?? "unspecified",
    source: "convex_export",
    placement: input.placement ?? null,
    model_version: input.modelVersion ?? null,
    order_id: input.orderToken ?? null,
    purchase_authoritative: input.purchaseAuthoritative === true,
  };
}

const PERSONAL_KEYS = [
  "email",
  "phone",
  "customerEmail",
  "customerPhone",
  "customerKey",
  "address",
  "name",
  "visitorId",
  "orderId",
];

export function recordExposesPersonalData(record: Record<string, unknown>): boolean {
  return PERSONAL_KEYS.some((key) => key in record && record[key] !== undefined);
}
