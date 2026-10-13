import { describe, expect, it } from "vitest";

import type { Id } from "../_generated/dataModel";
import { getDefaultDeliveryOptions } from "./productValidators";
import {
  resolveAvailableDeliveryMethods,
  selectCheckoutDeliveryMethod,
} from "./deliveryPricing";

function onlyMethod(type: "pickup" | "express") {
  return getDefaultDeliveryOptions().map((option) => ({
    ...option,
    enabled: option.type === type,
  }));
}

describe("checkout delivery methods", () => {
  it("rejects carts whose products do not share a method", () => {
    const available = resolveAvailableDeliveryMethods([
      {
        _id: "products:pickup" as Id<"products">,
        shipping: true,
        deliveryOptions: onlyMethod("pickup"),
      },
      {
        _id: "products:express" as Id<"products">,
        shipping: true,
        deliveryOptions: onlyMethod("express"),
      },
    ]);

    expect(available).toEqual([]);
    expect(() => selectCheckoutDeliveryMethod(available)).toThrow(/do not share a delivery method/);
    expect(() => selectCheckoutDeliveryMethod(available, "standard")).toThrow(
      /do not share a delivery method/
    );
  });

  it("rejects an explicit method that is not in the intersection", () => {
    const available = resolveAvailableDeliveryMethods([
      {
        _id: "products:standard" as Id<"products">,
        shipping: true,
        deliveryOptions: getDefaultDeliveryOptions(),
      },
    ]);
    expect(available.some((method) => method.type === "express")).toBe(false);
    expect(() => selectCheckoutDeliveryMethod(available, "express")).toThrow(
      /not available/
    );
    expect(selectCheckoutDeliveryMethod(available)).toBe("standard");
  });
});
