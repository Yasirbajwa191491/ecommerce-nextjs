import { describe, expect, it } from "vitest";

import {
  canRequestNotificationPermission,
  formatPushRegistrationError,
} from "@/lib/push-permission-logic";

describe("push permission logic", () => {
  it("allows requesting permission when Android reports denied but canAskAgain is true", () => {
    expect(
      canRequestNotificationPermission({
        status: "denied",
        granted: false,
        canAskAgain: true,
      })
    ).toBe(true);
  });

  it("blocks requesting permission when the user permanently denied", () => {
    expect(
      canRequestNotificationPermission({
        status: "denied",
        granted: false,
        canAskAgain: false,
      })
    ).toBe(false);
  });

  it("formats FCM setup errors clearly", () => {
    expect(formatPushRegistrationError("Default FirebaseApp is not initialized")).toContain(
      "Firebase (FCM)"
    );
  });
});
