import { describe, expect, it } from "vitest";
import {
  assertClientBehaviorEventType,
  assertVisitorId,
  isDuplicateBehaviorEvent,
  purchaseSourceKey,
} from "./behaviorEventPolicy";
import {
  isAuthoritativePurchase,
  mapBehaviorEventType,
  recordExposesPersonalData,
  toPublicBehavioralEvent,
} from "./behavioralExport";
import { overlapAtK, rankAgreement, validCandidateRate } from "./shadowComparison";
import { parseProbePayload } from "./pythonMlShadowFetch";

describe("behavioral event policy", () => {
  it("rejects client purchase events and duplicate recent events", () => {
    expect(() => assertClientBehaviorEventType("purchase")).toThrow(/paid orders/);
    expect(() => assertClientBehaviorEventType("view")).not.toThrow();
    expect(() => assertVisitorId("")).toThrow(/invalid/i);
    expect(
      isDuplicateBehaviorEvent(
        [{ eventType: "view", productId: "p1", occurredAt: 1_000 }],
        "view",
        "p1",
        10_000
      )
    ).toBe(true);
    expect(purchaseSourceKey("order1", "product1")).toBe("purchase:order1:product1");
  });

  it("derives purchases only from paid finalized orders", () => {
    expect(
      isAuthoritativePurchase({ status: "confirmed", paymentStatus: "paid" })
    ).toBe(true);
    expect(
      isAuthoritativePurchase({ status: "cancelled", paymentStatus: "paid" })
    ).toBe(false);
    expect(
      isAuthoritativePurchase({ status: "confirmed", paymentStatus: "failed" })
    ).toBe(false);
    expect(
      isAuthoritativePurchase({
        status: "delivered",
        paymentStatus: "paid",
        stockReleasedAt: 1,
      })
    ).toBe(false);
    expect(mapBehaviorEventType("purchase")).toBeNull();
    expect(mapBehaviorEventType("cart_add")).toBe("add_to_cart");
    const record = toPublicBehavioralEvent({
      eventId: "hashed-event",
      eventType: "purchase",
      productId: "product-1",
      visitorToken: "hashed-visitor",
      occurredAt: 10,
      orderToken: "hashed-order",
      purchaseAuthoritative: true,
    });
    expect(recordExposesPersonalData(record)).toBe(false);
    expect(record.visitor_id).toBe("hashed-visitor");
    expect(JSON.stringify(record)).not.toMatch(/@/);
  });

  it("compares shadow lists without treating overlap as quality", () => {
    expect(overlapAtK(["a", "b"], ["b", "c"], 2)).toBe(0.5);
    expect(rankAgreement(["a", "b"], ["a", "b"], 2)).toBe(1);
    expect(rankAgreement(["a"], ["b"], 2)).toBe(0);
    expect(validCandidateRate(["a", "missing"], new Set(["a"]))).toBe(0.5);
    expect(parseProbePayload({ strategy: "collaborative", recommendations: [{ product_id: "a" }] })).toEqual({
      strategy: "collaborative",
      productIds: ["a"],
    });
    expect(parseProbePayload({ strategy: "neural", recommendations: [{ product_id: "a" }] })?.strategy).toBe(
      "neural"
    );
    expect(parseProbePayload({ recommendations: [{ product_id: "a" }] })).toBeNull();
  });
});
