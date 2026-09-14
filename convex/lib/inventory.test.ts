import { describe, expect, it } from "vitest";

import {
  isHeldStockReleased,
  shouldCommitInventory,
  shouldHoldStockAgain,
  shouldReleaseHeldStock,
} from "./inventory";

describe("inventory hold/release gate", () => {
  it("treats missing stockReleasedAt as currently deducted", () => {
    expect(isHeldStockReleased(undefined)).toBe(false);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
    expect(shouldHoldStockAgain(undefined)).toBe(false);
  });

  it("does not infer release from cancelled/refunded/failed/expired status", () => {
    expect(isHeldStockReleased(undefined)).toBe(false);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
  });

  it("releases only when the flag is unset and re-holds only when it is set", () => {
    expect(shouldReleaseHeldStock(1_710_000_000_000)).toBe(false);
    expect(shouldHoldStockAgain(1_710_000_000_000)).toBe(true);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
    expect(shouldHoldStockAgain(undefined)).toBe(false);
  });
});

describe("when inventory is committed", () => {
  it("does not deduct Stripe stock until the payment is paid", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldCommitInventory({
        paymentMethod: "stripe",
        paymentStatus: "paid",
        status: "confirmed",
      })
    ).toBe(true);
  });

  it("does not deduct COD stock while pending or processing", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "processing",
      })
    ).toBe(false);
  });

  it("deducts COD stock after admin confirms, ships, or delivers", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "confirmed",
      })
    ).toBe(true);
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "paid",
        status: "shipped",
      })
    ).toBe(true);
  });
});
