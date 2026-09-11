import { describe, expect, it } from "vitest";

import {
  buildCheckoutCartFingerprint,
  pendingStripeOrderMatchesCart,
} from "./checkout-cart-fingerprint";

describe("pending stripe checkout resume", () => {
  const cart = {
    email: "Ada@Example.com",
    deliveryMethod: "standard" as const,
    lines: [
      { productId: "prod-b", color: "Red", quantity: 1 },
      { productId: "prod-a", color: "Blue", quantity: 2 },
    ],
  };

  it("resumes only when the saved fingerprint matches the current cart", () => {
    const fingerprint = buildCheckoutCartFingerprint(cart);
    expect(
      pendingStripeOrderMatchesCart(
        {
          orderNumber: "ORD-1",
          email: "ada@example.com",
          cartFingerprint: fingerprint,
        },
        fingerprint
      )
    ).toBe(true);
  });

  it("does not resume a pending order for a different cart", () => {
    const saved = buildCheckoutCartFingerprint(cart);
    const current = buildCheckoutCartFingerprint({
      ...cart,
      lines: [{ productId: "prod-c", color: "Green", quantity: 1 }],
    });

    expect(
      pendingStripeOrderMatchesCart(
        {
          orderNumber: "ORD-1",
          email: "ada@example.com",
          cartFingerprint: saved,
        },
        current
      )
    ).toBe(false);
  });

  it("does not resume a legacy pending order without a fingerprint", () => {
    expect(
      pendingStripeOrderMatchesCart(
        { orderNumber: "ORD-1", email: "ada@example.com" },
        buildCheckoutCartFingerprint(cart)
      )
    ).toBe(false);
  });
});
