import { describe, expect, it } from "vitest";

import {
  isHeldStockReleased,
  shouldHoldStockAgain,
  shouldReleaseHeldStock,
} from "./inventory";

describe("inventory hold/release gate", () => {
  it("treats missing stockReleasedAt as still held", () => {
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
