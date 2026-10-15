/** Client behavior events. Purchases are not accepted from the browser or app. */

export const BEHAVIOR_DEDUPE_MS = 30_000;
export const MAX_BEHAVIOR_BATCH = 25;
export const MAX_VISITOR_ID_LENGTH = 128;
export const MAX_METADATA_LENGTH = 256;

export function assertClientBehaviorEventType(eventType: string): void {
  if (eventType === "purchase") {
    throw new Error("Purchase events are recorded from paid orders");
  }
}

export function assertVisitorId(visitorId: string): void {
  const cleaned = visitorId.trim();
  if (!cleaned || cleaned.length > MAX_VISITOR_ID_LENGTH || /[\r\n]/.test(cleaned)) {
    throw new Error("Visitor id is invalid");
  }
}

export function purchaseSourceKey(orderId: string, productId: string): string {
  return `purchase:${orderId}:${productId}`;
}

export function isDuplicateBehaviorEvent(
  recent: { eventType: string; productId?: string; occurredAt: number }[],
  eventType: string,
  productId: string | undefined,
  now: number
): boolean {
  return recent.some(
    (event) =>
      event.eventType === eventType &&
      event.productId === productId &&
      now - event.occurredAt >= 0 &&
      now - event.occurredAt < BEHAVIOR_DEDUPE_MS
  );
}
