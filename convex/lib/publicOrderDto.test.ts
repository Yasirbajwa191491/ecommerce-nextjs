import { describe, expect, it } from "vitest";

import { phonesMatch } from "./publicOrderDto";

describe("order phone verification", () => {
  it("rejects the masked suffix and requires the full number", () => {
    const stored = "+1 (555) 123-4567";
    expect(phonesMatch(stored, "4567")).toBe(false);
    expect(phonesMatch(stored, "7")).toBe(false);
    expect(phonesMatch(stored, "5551234567")).toBe(false);
    expect(phonesMatch(stored, "15551234567")).toBe(true);
    expect(phonesMatch(stored, "+1 555-123-4567")).toBe(true);
    expect(phonesMatch(stored, "5551234568")).toBe(false);
  });
});
