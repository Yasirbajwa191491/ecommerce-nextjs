import { describe, expect, it } from "vitest";

import { canMutateCustomerProfile } from "./customerProfileAccess";

describe("customer profile access", () => {
  it("allows the first guest write and rejects an unproven overwrite", () => {
    expect(
      canMutateCustomerProfile({
        profileExists: false,
        orderAccessMatches: false,
      })
    ).toBe(true);
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        providedToken: "other",
        orderAccessMatches: false,
      })
    ).toBe(false);
  });

  it("accepts the stored profile token or a matching order access token", () => {
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        providedToken: "secret",
        orderAccessMatches: false,
      })
    ).toBe(true);
    expect(
      canMutateCustomerProfile({
        profileExists: true,
        storedToken: "secret",
        orderAccessMatches: true,
      })
    ).toBe(true);
  });
});
