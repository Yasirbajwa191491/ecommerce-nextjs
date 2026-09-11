import { describe, expect, it } from "vitest";

import { selectPushTokensForDelivery } from "./pushTokenSelection";

describe("push token selection", () => {
  it("prefers standalone app tokens over Expo Go", () => {
    const selected = selectPushTokensForDelivery([
      { expoPushToken: "ExponentPushToken[expo-go]", executionEnvironment: "storeClient" },
      { expoPushToken: "ExponentPushToken[apk]", executionEnvironment: "standalone" },
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.expoPushToken).toBe("ExponentPushToken[apk]");
  });

  it("falls back to Expo Go when no standalone token exists", () => {
    const selected = selectPushTokensForDelivery([
      { expoPushToken: "ExponentPushToken[expo-go]", executionEnvironment: "storeClient" },
    ]);

    expect(selected).toHaveLength(1);
  });
});
