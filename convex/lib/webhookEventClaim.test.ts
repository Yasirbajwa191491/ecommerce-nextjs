import { describe, expect, it } from "vitest";

import { webhookEventClaimAction } from "./webhookEventClaim";

describe("webhook event claims", () => {
  it("processes a new event and replays unfinished work", () => {
    expect(webhookEventClaimAction(null)).toBe("process");
    expect(webhookEventClaimAction({ status: "pending" })).toBe("process");
    expect(
      webhookEventClaimAction({ status: "failed", processedAt: undefined })
    ).toBe("process");
  });

  it("skips events that already finished, including legacy receipts", () => {
    expect(webhookEventClaimAction({ status: "processed", processedAt: 10 })).toBe(
      "duplicate"
    );
    expect(webhookEventClaimAction({ processedAt: 10 })).toBe("duplicate");
  });
});
