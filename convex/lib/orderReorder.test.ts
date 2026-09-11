import { describe, expect, it } from "vitest";

import {
  canReorderOrder,
  evaluateReorderLine,
  shouldPromptReorderNotice,
} from "./orderReorder";

describe("order reorder", () => {
  it("allows reorder for completed or cancelled orders", () => {
    expect(canReorderOrder("delivered")).toBe(true);
    expect(canReorderOrder("cancelled")).toBe(true);
    expect(canReorderOrder("pending")).toBe(false);
  });

  it("marks promotion gifts as unavailable", () => {
    const result = evaluateReorderLine({
      item: {
        _id: "item1" as never,
        _creationTime: 0,
        orderId: "order1" as never,
        productId: "prod1" as never,
        productName: "Gift",
        color: "Red",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        sku: "",
        size: "",
        imageUrl: "",
        isPromotionGift: true,
      },
      product: null,
    });
    expect("reason" in result && result.reason).toBe("promotion_gift");
  });

  it("caps quantity to current stock", () => {
    const result = evaluateReorderLine({
      item: {
        _id: "item1" as never,
        _creationTime: 0,
        orderId: "order1" as never,
        productId: "prod1" as never,
        productName: "Shirt",
        color: "Blue",
        quantity: 5,
        unitPrice: 20,
        lineTotal: 100,
        sku: "",
        size: "",
        imageUrl: "",
        isPromotionGift: false,
      },
      product: {
        _id: "prod1" as never,
        _creationTime: 0,
        name: "Shirt",
        price: 25,
        stock: 2,
        currency: "USD",
        colors: ["Blue"],
        image: [{ url: "https://example.com/shirt.jpg" }],
        active: true,
      } as never,
    });
    expect("quantity" in result && result.quantity).toBe(2);
    expect("requestedQuantity" in result && result.requestedQuantity).toBe(5);
    expect("currentPrice" in result && result.currentPrice).toBe(25);
    expect(
      shouldPromptReorderNotice({
        unavailableCount: 0,
        available: [{ quantity: 2, requestedQuantity: 5 }],
      })
    ).toBe(true);
    expect(
      shouldPromptReorderNotice({
        unavailableCount: 0,
        available: [{ quantity: 5, requestedQuantity: 5 }],
      })
    ).toBe(false);
  });
});
