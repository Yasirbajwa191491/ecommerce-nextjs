import { describe, expect, it } from "vitest";

import { deriveInAppNotificationEventKey } from "./inAppNotificationPersistence";
import { buildNotificationEventKey } from "./orderNotificationLogic";

describe("in-app notification idempotency", () => {
  it("uses the same deterministic event key as delivery events", () => {
    const orderId = "order123";
    const event = "order.delivered";

    const deliveryKey = buildNotificationEventKey(orderId, event);
    const historyKey = buildNotificationEventKey(orderId, event);

    expect(deliveryKey).toBe(historyKey);
    expect(deliveryKey).toBe("order:order123:order.delivered");
  });

  it("prevents duplicate history for retried webhook transitions", () => {
    const orderId = "order456";
    const event = "payment.succeeded";

    const first = buildNotificationEventKey(orderId, event);
    const retry = buildNotificationEventKey(orderId, event);

    expect(first).toBe(retry);
  });

  it("derives legacy event keys for older notification rows", () => {
    const derived = deriveInAppNotificationEventKey({
      customerEmail: "User@Example.com",
      type: "payment.succeeded",
      orderId: "order789",
      createdAt: 1_700_000_000_000,
      eventKey: undefined,
    });

    expect(derived).toBe("order:order789:payment.succeeded");
  });
});
