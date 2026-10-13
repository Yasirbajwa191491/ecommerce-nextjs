import { describe, expect, it } from "vitest";

import {
  buildCheckoutCartFingerprint,
  pendingStripeOrderMatchesCart,
} from "./checkout-cart-fingerprint";

describe("pending stripe checkout resume", () => {
  const cart = {
    email: "Ada@Example.com",
    deliveryMethod: "standard" as const,
    customer: { fullName: "Ada Lovelace", phone: "+923001234567", address: "10 Main Street, Lahore", notes: "Front door" },
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

  it.each(["fullName", "phone", "address", "notes"] as const)(
    "creates a fresh order when the shopper changes %s after cancelling payment",
    (field) => {
      const saved = buildCheckoutCartFingerprint(cart);
      const changed = buildCheckoutCartFingerprint({
        ...cart,
        customer: { ...cart.customer, [field]: "Updated delivery detail" },
      });
      expect(pendingStripeOrderMatchesCart({ orderNumber: "ORD-1", email: cart.email, cartFingerprint: saved }, changed)).toBe(false);
    }
  );

  it("normalizes email, trims customer details and ignores cart line ordering", () => {
    expect(buildCheckoutCartFingerprint({
      ...cart,
      email: " ada@example.com ",
      customer: { ...cart.customer, fullName: " Ada Lovelace " },
      lines: [...cart.lines].reverse(),
    })).toBe(buildCheckoutCartFingerprint(cart));
  });

  it("does not reuse old fingerprints that lack shipping identity", () => {
    const oldFingerprint = JSON.stringify({ email: "ada@example.com", deliveryMethod: "standard", lines: cart.lines });
    expect(pendingStripeOrderMatchesCart({ orderNumber: "ORD-1", email: cart.email, cartFingerprint: oldFingerprint }, buildCheckoutCartFingerprint(cart))).toBe(false);
  });
});
