import { describe, expect, it } from "vitest";

import {
  computeNotificationExpiresAt,
  NOTIFICATION_RETENTION_MS,
} from "./notificationRetention";

describe("notification retention", () => {
  it("retains notifications for 90 days", () => {
    const createdAt = Date.UTC(2026, 0, 1);
    expect(computeNotificationExpiresAt(createdAt)).toBe(
      createdAt + NOTIFICATION_RETENTION_MS
    );
    expect(NOTIFICATION_RETENTION_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });
});
