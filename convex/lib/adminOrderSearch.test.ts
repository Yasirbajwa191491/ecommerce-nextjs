import { describe, expect, it } from "vitest";

import {
  orderMatchesAdminPhoneFilter,
  orderMatchesAdminTextSearch,
} from "./adminOrderSearch";

const alice = {
  orderNumber: "A-1",
  customerName: "Alice",
  customerEmail: "alice@example.com",
  customerPhone: "5551112222",
};

const bob = {
  orderNumber: "B-1",
  customerName: "Bob",
  customerEmail: "bob@example.com",
  customerPhone: "5559990000",
};

describe("admin order search", () => {
  it("does not treat a letter-only search as a phone match", () => {
    expect(orderMatchesAdminTextSearch(alice, "Alice")).toBe(true);
    expect(orderMatchesAdminTextSearch(bob, "Alice")).toBe(false);
  });

  it("matches phones only when the filter contains digits", () => {
    expect(orderMatchesAdminPhoneFilter(alice.customerPhone, "111")).toBe(true);
    expect(orderMatchesAdminPhoneFilter(bob.customerPhone, "Alice")).toBe(false);
  });
});
