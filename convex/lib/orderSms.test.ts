import { describe, expect, it } from "vitest";

import { getChannelsForEvent } from "./notificationChannels";
import type { OrderNotificationEvent } from "./notificationTypes";
import {
  SMS_ORDER_EVENTS,
  buildOrderSmsBody,
  buildTrackOrderUrl,
  isSmsOrderEvent,
  resolveMaxSmsBodyLength,
  shouldSendSmsForEvent,
  willSendOrderConfirmationSms,
} from "./orderSms";

const ALL_EVENTS: OrderNotificationEvent[] = [
  "order.created",
  "payment.succeeded",
  "payment.failed",
  "order.confirmed",
  "order.processing",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.refunded",
  "payment.received",
  "order.recovery.reminder",
  "order.expired",
];

const baseArgs = {
  customerName: "Yasir Sohail",
  orderNumber: "ORD-20260914-ABC123",
  total: 49.99,
  currency: "USD",
  paymentMethod: "cod" as const,
  paymentStatus: "pending" as const,
  trackOrderUrl: "https://store.example.com/track-order/ORD-20260914-ABC123",
  items: [
    {
      productName: "Wireless Headphones",
      color: "black",
      quantity: 1,
      lineTotal: 49.99,
    },
  ],
};

describe("order SMS event mapping", () => {
  it("sends SMS for confirmation and fulfillment status events", () => {
    expect(SMS_ORDER_EVENTS).toEqual([
      "order.created",
      "payment.succeeded",
      "order.confirmed",
      "order.processing",
      "order.shipped",
      "order.delivered",
      "order.cancelled",
      "order.refunded",
    ]);

    for (const event of ALL_EVENTS) {
      expect(shouldSendSmsForEvent(event)).toBe(isSmsOrderEvent(event));
      if (shouldSendSmsForEvent(event)) {
        expect(getChannelsForEvent(event)).toContain("sms");
      } else {
        expect(getChannelsForEvent(event)).not.toContain("sms");
      }
    }
  });
});

describe("order SMS bodies", () => {
  it("builds a confirmation SMS with items, total, and track link", () => {
    const body = buildOrderSmsBody({
      ...baseArgs,
      event: "order.created",
    });
    expect(body).toContain("ORD-20260914-ABC123");
    expect(body).toContain("confirmed");
    expect(body).toMatch(/Wireless Headphones|items/);
    expect(body).toContain("COD");
  });

  it("uses the same confirmation copy after Stripe payment succeeds", () => {
    const body = buildOrderSmsBody({
      ...baseArgs,
      event: "payment.succeeded",
      paymentMethod: "stripe",
      paymentStatus: "paid",
    });
    expect(body).toContain("confirmed");
    expect(body).toContain("Paid");
  });

  it("builds confirmed, processing, shipped, delivered, and cancelled updates", () => {
    expect(
      buildOrderSmsBody({ ...baseArgs, event: "order.confirmed" })
    ).toMatch(/has been confirmed/);
    expect(
      buildOrderSmsBody({ ...baseArgs, event: "order.processing" })
    ).toMatch(/being prepared/);
    expect(
      buildOrderSmsBody({ ...baseArgs, event: "order.shipped" })
    ).toMatch(/shipped/);
    expect(
      buildOrderSmsBody({ ...baseArgs, event: "order.delivered" })
    ).toMatch(/delivered/);
    expect(
      buildOrderSmsBody({
        ...baseArgs,
        event: "order.cancelled",
        cancellationReason: "Changed my mind",
      })
    ).toMatch(/cancelled/);
    expect(
      buildOrderSmsBody({ ...baseArgs, event: "order.refunded" })
    ).toMatch(/refund/);
  });

  it("does not build SMS for events that are not in the shared channel list", () => {
    expect(buildOrderSmsBody({ ...baseArgs, event: "payment.failed" })).toBeNull();
    expect(buildOrderSmsBody({ ...baseArgs, event: "payment.received" })).toBeNull();
  });

  it("stays within the default single-segment length", () => {
    const body = buildOrderSmsBody({
      ...baseArgs,
      event: "order.created",
      items: [
        {
          productName: "Super Extra Long Product Name That Should Be Truncated",
          color: "red",
          quantity: 3,
          lineTotal: 199.99,
        },
        {
          productName: "Another Item",
          color: "blue",
          quantity: 2,
          lineTotal: 40,
        },
      ],
    });
    expect(body).not.toBeNull();
    expect(body!.length).toBeLessThanOrEqual(resolveMaxSmsBodyLength());
  });

  it("builds the shared web track-order URL", () => {
    expect(buildTrackOrderUrl("https://store.example.com/", "ORD-1")).toBe(
      "https://store.example.com/track-order/ORD-1"
    );
  });
});

describe("checkout success SMS copy", () => {
  it("promises confirmation SMS for COD and paid Stripe only", () => {
    expect(
      willSendOrderConfirmationSms({
        smsEnabled: true,
        paymentMethod: "cod",
        paymentStatus: "pending",
      })
    ).toBe(true);
    expect(
      willSendOrderConfirmationSms({
        smsEnabled: true,
        paymentMethod: "stripe",
        paymentStatus: "paid",
      })
    ).toBe(true);
    expect(
      willSendOrderConfirmationSms({
        smsEnabled: true,
        paymentMethod: "stripe",
        paymentStatus: "pending",
      })
    ).toBe(false);
    expect(
      willSendOrderConfirmationSms({
        smsEnabled: true,
        paymentMethod: "stripe",
        paymentStatus: "failed",
      })
    ).toBe(false);
    expect(
      willSendOrderConfirmationSms({
        smsEnabled: false,
        paymentMethod: "cod",
        paymentStatus: "pending",
      })
    ).toBe(false);
  });
});
