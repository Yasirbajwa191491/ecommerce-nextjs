import { describe, expect, it } from "vitest";
import { cartItemsToCheckoutLinesForProducts, sanitizeCartItemsWithProducts, type CartLineLike } from "./cart-lines";
import { getCartAdditionError } from "./cart-addition";

const item: CartLineLike = { id: "p::#ffffff", productId: "p", color: "#fff", amount: 2, name: "Phone", image: "", price: 50, currency: "USD", max: 10 };

describe("cart selection integrity", () => {
  it("preserves a removed color and blocks it rather than replacing it", () => {
    const products = new Map([["p", { colors: ["#000000"], stock: 10 }]]);
    const [result] = sanitizeCartItemsWithProducts([item], products);
    expect(result.color).toBe("#ffffff");
    expect(result.unavailableReason).toContain("color is no longer available");
    expect(cartItemsToCheckoutLinesForProducts([item], products)[0].color).toBe("#ffffff");
  });
  it("clears stale warnings when the same selection becomes available", () => {
    const [result] = sanitizeCartItemsWithProducts([{ ...item, unavailableReason: "old" }], new Map([["p", { colors: ["#FFFFFF"], stock: 10 }]]));
    expect(result.unavailableReason).toBeUndefined();
  });
  it("marks removed products and preserves their identity", () => {
    const [result] = sanitizeCartItemsWithProducts([item], new Map());
    expect(result.unavailableReason).toContain("no longer available");
    expect(result.productId).toBe("p");
  });
  it("marks zero stock and reduced stock without silently reducing quantity", () => {
    for (const stock of [0, 1]) {
      const [result] = sanitizeCartItemsWithProducts([item], new Map([["p", { stock }]]));
      expect(result.unavailableReason).toBeTruthy();
      expect(result.amount).toBe(2);
    }
  });
});

describe("add to cart validation", () => {
  const product = { _id: "p", stock: 5, colors: ["#ffffff", "#000000"], currency: "USD" };
  it("rejects mixed currencies before mutating the cart", () => {
    expect(getCartAdditionError([item], { ...product, currency: "PKR" }, "#fff", 1)).toContain("USD");
    expect(getCartAdditionError([], { ...product, currency: "PKR" }, "#fff", 1)).toBeNull();
  });
  it("accepts equivalent hex colors but rejects removed choices", () => {
    expect(getCartAdditionError([item], product, "#fff", 1)).toBeNull();
    expect(getCartAdditionError([], product, "purple", 1)).toContain("color");
  });
  it("uses stock across all selected variants", () => {
    expect(getCartAdditionError([item], product, "#000000", 4)).toContain("Only 5");
  });
  it("rejects fractional, invalid and unavailable quantities", () => {
    for (const amount of [0, -1, NaN, 1.5, 6]) expect(getCartAdditionError([], product, "", amount)).toBeTruthy();
  });
});
