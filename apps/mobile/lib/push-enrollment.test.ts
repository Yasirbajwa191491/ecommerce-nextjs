import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/checkout-customer-storage", () => ({
  loadCheckoutCustomer: vi.fn(),
  loadPushEnrollmentProof: vi.fn(),
  loadLastOrderInfo: vi.fn(),
}));

import {
  loadCheckoutCustomer,
  loadLastOrderInfo,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import { resolvePushEnrollmentCredentials } from "@/lib/push-enrollment";

describe("resolvePushEnrollmentCredentials", () => {
  it("does not pair a customer's email with another customer's order proof", async () => {
    vi.mocked(loadCheckoutCustomer).mockResolvedValue({
      fullName: "Test User",
      email: "Checkout@Example.com",
      phone: "123",
      address: "Street",
    });
    vi.mocked(loadPushEnrollmentProof).mockResolvedValue({
      email: "proof@example.com",
      accessToken: "token-from-proof",
    });
    vi.mocked(loadLastOrderInfo).mockResolvedValue({
      orderNumber: "ORD-1",
      email: "proof@example.com",
      accessToken: "token-from-last-order",
    });

    await expect(resolvePushEnrollmentCredentials()).resolves.toEqual({
      customerEmail: "checkout@example.com",
      accessToken: undefined,
    });
  });

  it("falls back to enrollment proof and last order info", async () => {
    vi.mocked(loadCheckoutCustomer).mockResolvedValue(null);
    vi.mocked(loadPushEnrollmentProof).mockResolvedValue({
      email: "proof@example.com",
      accessToken: null,
    });
    vi.mocked(loadLastOrderInfo).mockResolvedValue({
      orderNumber: "ORD-1",
      email: "proof@example.com",
      accessToken: "token-from-last-order",
    });

    await expect(resolvePushEnrollmentCredentials()).resolves.toEqual({
      customerEmail: "proof@example.com",
      accessToken: "token-from-last-order",
    });
  });
});
