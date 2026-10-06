import { describe, expect, it } from "vitest";

import { canMutateCustomerProfile } from "./customerProfileAccess";

describe("customer profile access", () => {
  it("allows the first guest write and rejects an unproven overwrite", () => {
    expect(
      canMutateCustomerProfile({
        profileExists: false,
      })
    ).toBe(true);
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        providedToken: "other",
      })
    ).toBe(false);
  });

  it("accepts only the stored profile capability for an existing profile", () => {
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        providedToken: "secret",
      })
    ).toBe(true);
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        providedToken: "new-order-token",
      })
    ).toBe(false);
  });

  it("does not claim a legacy profile with no stored capability", () => {
    expect(canMutateCustomerProfile({ profileExists: true, providedToken: "new-token" })).toBe(false);
    expect(canMutateCustomerProfile({ profileExists: true })).toBe(false);
  });
});
