import { describe, expect, it } from "vitest";

import {
  canRequestNotificationPermission,
  formatPushRegistrationError,
  resolvePushCapability,
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

  it("keeps build diagnostics out of customer errors", () => {
    expect(formatPushRegistrationError("Default FirebaseApp is not initialized")).toContain(
      "You can still track your order"
    );
    expect(formatPushRegistrationError("Expo project ID is missing")).not.toMatch(/Expo|FCM|Firebase|APK|EAS/);
  });

  it.each([
    { platform: "web", isDevice: true, environment: "standalone", enabled: true, projectId: "project" },
    { platform: "android", isDevice: false, environment: "standalone", enabled: true, projectId: "project" },
    { platform: "android", isDevice: true, environment: "storeClient", enabled: true, projectId: "project" },
    { platform: "android", isDevice: true, environment: "standalone", enabled: false, projectId: "project" },
    { platform: "android", isDevice: true, environment: "standalone", enabled: true },
  ])("does not offer enrollment in unsupported or unconfigured environments: %j", (args) => {
    expect(resolvePushCapability(args).available).toBe(false);
  });

  it("supports an explicitly configured physical native build", () => {
    expect(resolvePushCapability({ platform: "android", isDevice: true, environment: "bare", enabled: true, projectId: "project" }).available).toBe(true);
  });
});
