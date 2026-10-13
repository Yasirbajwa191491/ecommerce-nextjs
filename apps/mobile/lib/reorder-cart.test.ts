import { describe, expect, it } from "vitest";
import { getReorderCartError } from "./reorder-cart";
import type { CartLineLike } from "./cart-lines";

const entry = (currency: string, quantity = 1, id = "phone") => ({ product: { _id: id, stock: 3, colors: ["Black", "White"], price: 100, currency }, color: "Black", quantity });
describe("reorder batch validation", () => {
  it("rejects mixed currencies before any cart replacement or merge", () => {
    expect(getReorderCartError([], [entry("USD"), entry("PKR", 1, "chair")], "replace")).toContain("USD");
    const current: CartLineLike[] = [{ id: "chair::", productId: "chair", color: "", name: "Chair", image: "", max: 3, price: 1, amount: 1, currency: "PKR" }];
    expect(getReorderCartError(current, [entry("USD")], "merge")).toContain("PKR");
    expect(current).toHaveLength(1);
    expect(getReorderCartError(current, [entry("USD")], "replace")).toBeNull();
  });
  it("validates cumulative stock across existing items and reorder variants", () => {
    const current: CartLineLike[] = [{ id: "phone::white", productId: "phone", color: "White", name: "Phone", image: "", max: 3, price: 100, amount: 2, currency: "USD" }];
    expect(getReorderCartError(current, [entry("USD", 2)], "merge")).toContain("Only 3");
    expect(getReorderCartError([], [entry("USD", 2), entry("USD", 2)], "merge")).toContain("Only 3");
  });
  it("rejects stale colours and quantities without silently replacing variants", () => {
    expect(getReorderCartError([], [{ ...entry("USD"), color: "Blue" }], "merge")).toContain("color");
    expect(getReorderCartError([], [entry("USD", 0)], "merge")).toContain("not available");
  });
});
