import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import {
  hasFirstLaunchOsPromptBeenShown,
  markFirstLaunchOsPromptShown,
} from "@/lib/push-first-launch";

describe("push-first-launch", () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
  });

  it("tracks whether the first-launch OS prompt was shown", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(hasFirstLaunchOsPromptBeenShown()).resolves.toBe(false);

    await markFirstLaunchOsPromptShown();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@push/firstLaunchOsPromptShown", "1");
  });
});
