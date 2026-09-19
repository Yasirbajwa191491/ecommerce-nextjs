import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  APP_LOCK_TIMEOUT_OPTIONS,
  timeoutMsForId,
} from "@/lib/app-lock/constants";
import {
  __resetAppLockGateForTests,
  getAppLockGateState,
  isAppLockGateActive,
  setAppLockGateState,
  whenAppUnlocked,
} from "@/lib/app-lock/gate";
import {
  canNavigateWhileLocked,
  createDisabledConfig,
  createEnabledConfig,
  isTimeoutRelaxation,
  parseAppLockConfig,
  shouldExposeProtectedUi,
  shouldRequireAuthOnResume,
  shouldShowLockScreen,
} from "@/lib/app-lock/policy";

describe("app-lock policy", () => {
  it("opens normally when App Lock is disabled", () => {
    expect(
      shouldExposeProtectedUi({
        hydrated: true,
        enabled: false,
        unlocked: false,
        storageUnreliable: false,
      })
    ).toBe(true);
    expect(
      shouldShowLockScreen({
        hydrated: true,
        enabled: false,
        unlocked: false,
        storageUnreliable: false,
      })
    ).toBe(false);
  });

  it("requires authentication for protected UI when enabled and locked", () => {
    expect(
      shouldExposeProtectedUi({
        hydrated: true,
        enabled: true,
        unlocked: false,
        storageUnreliable: false,
      })
    ).toBe(false);
    expect(
      shouldShowLockScreen({
        hydrated: true,
        enabled: true,
        unlocked: false,
        storageUnreliable: false,
      })
    ).toBe(true);
  });

  it("exposes UI after successful unlock", () => {
    expect(
      shouldExposeProtectedUi({
        hydrated: true,
        enabled: true,
        unlocked: true,
        storageUnreliable: false,
      })
    ).toBe(true);
  });

  it("fails closed before hydration and when storage is unreliable", () => {
    expect(
      shouldExposeProtectedUi({
        hydrated: false,
        enabled: false,
        unlocked: true,
        storageUnreliable: false,
      })
    ).toBe(false);
    expect(
      shouldExposeProtectedUi({
        hydrated: true,
        enabled: false,
        unlocked: true,
        storageUnreliable: true,
      })
    ).toBe(false);
  });

  it("does not re-lock on resume when there is no background timestamp (post-unlock)", () => {
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "immediate",
        lastBackgroundAt: null,
        now: 10_000,
      })
    ).toBe(false);
  });

  it("does not lock when disabled on resume", () => {
    expect(
      shouldRequireAuthOnResume({
        enabled: false,
        timeoutId: "immediate",
        lastBackgroundAt: 0,
        now: 60_000,
      })
    ).toBe(false);
  });

  it("locks immediately on resume when timeout is immediate", () => {
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "immediate",
        lastBackgroundAt: 1_000,
        now: 1_100,
      })
    ).toBe(true);
  });

  it("respects 1-minute timeout", () => {
    const backgroundedAt = 1_000;
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "1m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 59_000,
      })
    ).toBe(false);
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "1m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 60_000,
      })
    ).toBe(true);
  });

  it("respects 5-minute timeout", () => {
    const backgroundedAt = 5_000;
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "5m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 4 * 60_000,
      })
    ).toBe(false);
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "5m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 5 * 60_000,
      })
    ).toBe(true);
  });

  it("respects 15-minute timeout", () => {
    const backgroundedAt = 8_000;
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "15m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 14 * 60_000,
      })
    ).toBe(false);
    expect(
      shouldRequireAuthOnResume({
        enabled: true,
        timeoutId: "15m",
        lastBackgroundAt: backgroundedAt,
        now: backgroundedAt + 15 * 60_000,
      })
    ).toBe(true);
  });

  it("maps timeout ids to expected durations", () => {
    expect(timeoutMsForId("immediate")).toBe(0);
    expect(timeoutMsForId("1m")).toBe(60_000);
    expect(timeoutMsForId("5m")).toBe(5 * 60_000);
    expect(timeoutMsForId("15m")).toBe(15 * 60_000);
    expect(APP_LOCK_TIMEOUT_OPTIONS).toHaveLength(4);
  });

  it("detects timeout relaxation vs tightening", () => {
    expect(isTimeoutRelaxation("immediate", "15m")).toBe(true);
    expect(isTimeoutRelaxation("1m", "5m")).toBe(true);
    expect(isTimeoutRelaxation("15m", "1m")).toBe(false);
    expect(isTimeoutRelaxation("5m", "5m")).toBe(false);
    expect(isTimeoutRelaxation("15m", "immediate")).toBe(false);
  });

  it("parses valid SecureStore config and rejects invalid payloads", () => {
    expect(
      parseAppLockConfig({
        enabled: true,
        timeoutId: "1m",
        enrolledLevelAtEnable: 2,
      })
    ).toEqual({
      enabled: true,
      timeoutId: "1m",
      enrolledLevelAtEnable: 2,
    });
    expect(parseAppLockConfig({ enabled: true })).toBeNull();
    expect(parseAppLockConfig("bad")).toBeNull();
    expect(parseAppLockConfig(null)).toBeNull();
  });

  it("creates enable/disable configs without weakening defaults incorrectly", () => {
    expect(createEnabledConfig({ enrolledLevel: 3, timeoutId: "5m" })).toEqual({
      enabled: true,
      timeoutId: "5m",
      enrolledLevelAtEnable: 3,
    });
    expect(createDisabledConfig(null).enabled).toBe(false);
    expect(
      createDisabledConfig({
        enabled: true,
        timeoutId: "15m",
        enrolledLevelAtEnable: 3,
      })
    ).toEqual({
      enabled: false,
      timeoutId: "15m",
      enrolledLevelAtEnable: 0,
    });
  });

  it("blocks navigation helpers while locked", () => {
    expect(canNavigateWhileLocked(true)).toBe(false);
    expect(canNavigateWhileLocked(false)).toBe(true);
  });
});

describe("app-lock gate (deep link / notification)", () => {
  beforeEach(() => {
    __resetAppLockGateForTests();
  });

  it("starts fail-closed and blocks until unlock", async () => {
    expect(isAppLockGateActive()).toBe(true);
    expect(canNavigateWhileLocked(isAppLockGateActive())).toBe(false);

    let released = false;
    const wait = whenAppUnlocked().then(() => {
      released = true;
    });

    await Promise.resolve();
    expect(released).toBe(false);

    setAppLockGateState({ locked: false, enabled: true });
    await wait;
    expect(released).toBe(true);
    expect(getAppLockGateState()).toEqual({ locked: false, enabled: true });
  });

  it("does not let notification/QR navigation bypass a locked gate", async () => {
    setAppLockGateState({ locked: true, enabled: true });

    const navigations: string[] = [];
    const navigateAfterUnlock = async (href: string) => {
      await whenAppUnlocked();
      navigations.push(href);
    };

    const pending = navigateAfterUnlock("/order/ABC");
    await Promise.resolve();
    expect(navigations).toEqual([]);

    setAppLockGateState({ locked: false, enabled: true });
    await pending;
    expect(navigations).toEqual(["/order/ABC"]);
  });

  it("resolves immediately when already unlocked (offline-friendly)", async () => {
    setAppLockGateState({ locked: false, enabled: false });
    await expect(whenAppUnlocked()).resolves.toBeUndefined();
  });

  it("does not queue duplicate unlock side-effects when already unlocked", async () => {
    setAppLockGateState({ locked: false, enabled: true });
    const first = whenAppUnlocked();
    const second = whenAppUnlocked();
    await Promise.all([first, second]);
    expect(isAppLockGateActive()).toBe(false);
  });
});

describe("app-lock storage + biometrics (mocked)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("persists config in SecureStore and survives restart read", async () => {
    const store = new Map<string, string>();

    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    vi.doMock("expo-secure-store", () => ({
      isAvailableAsync: vi.fn(async () => true),
      getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
      setItemAsync: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      deleteItemAsync: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    }));

    const { writeAppLockConfig, readAppLockConfig } = await import(
      "@/lib/app-lock/storage"
    );

    const written = await writeAppLockConfig({
      enabled: true,
      timeoutId: "1m",
      enrolledLevelAtEnable: 2,
    });
    expect(written.ok).toBe(true);

    const read = await readAppLockConfig();
    expect(read).toEqual({
      ok: true,
      value: {
        enabled: true,
        timeoutId: "1m",
        enrolledLevelAtEnable: 2,
      },
    });
  });

  it("fails closed on SecureStore read failure", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    vi.doMock("expo-secure-store", () => ({
      isAvailableAsync: vi.fn(async () => true),
      getItemAsync: vi.fn(async () => {
        throw new Error("keychain error");
      }),
      setItemAsync: vi.fn(),
      deleteItemAsync: vi.fn(),
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    }));

    const { readAppLockConfig } = await import("@/lib/app-lock/storage");
    await expect(readAppLockConfig()).resolves.toEqual({
      ok: false,
      error: "read_failed",
    });
  });

  it("fails closed on SecureStore write failure", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    vi.doMock("expo-secure-store", () => ({
      isAvailableAsync: vi.fn(async () => true),
      getItemAsync: vi.fn(),
      setItemAsync: vi.fn(async () => {
        throw new Error("write failed");
      }),
      deleteItemAsync: vi.fn(),
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    }));

    const { writeAppLockConfig } = await import("@/lib/app-lock/storage");
    await expect(
      writeAppLockConfig({
        enabled: true,
        timeoutId: "immediate",
        enrolledLevelAtEnable: 3,
      })
    ).resolves.toEqual({ ok: false, error: "write_failed" });
  });

  it("cannot enable when hardware is missing", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));
    vi.doMock("expo-local-authentication", () => ({
      hasHardwareAsync: vi.fn(async () => false),
      isEnrolledAsync: vi.fn(async () => false),
      supportedAuthenticationTypesAsync: vi.fn(async () => []),
      authenticateAsync: vi.fn(),
      getEnrolledLevelAsync: vi.fn(async () => 0),
      AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
      },
      SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
    }));

    const { getBiometricCapability, authenticateWithBiometrics } = await import(
      "@/lib/app-lock/biometrics"
    );
    await expect(getBiometricCapability()).resolves.toMatchObject({
      status: "no_hardware",
    });
    const auth = await authenticateWithBiometrics();
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.reason).toBe("no_hardware");
    }
  });

  it("cannot enable when biometrics are not enrolled", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    vi.doMock("expo-local-authentication", () => ({
      hasHardwareAsync: vi.fn(async () => true),
      isEnrolledAsync: vi.fn(async () => false),
      supportedAuthenticationTypesAsync: vi.fn(async () => [2]),
      authenticateAsync: vi.fn(),
      getEnrolledLevelAsync: vi.fn(async () => 0),
      AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
      },
      SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
    }));

    const { getBiometricCapability, authenticateWithBiometrics } = await import(
      "@/lib/app-lock/biometrics"
    );
    await expect(getBiometricCapability()).resolves.toMatchObject({
      status: "not_enrolled",
      label: "Face ID",
    });
    const auth = await authenticateWithBiometrics();
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.reason).toBe("not_enrolled");
    }
  });

  it("unlocks on successful biometric and stays locked on failure/cancel", async () => {
    const authenticateAsync = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "user_cancel" })
      .mockResolvedValueOnce({ success: false, error: "authentication_failed" });

    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    vi.doMock("expo-local-authentication", () => ({
      hasHardwareAsync: vi.fn(async () => true),
      isEnrolledAsync: vi.fn(async () => true),
      supportedAuthenticationTypesAsync: vi.fn(async () => [2]),
      authenticateAsync,
      getEnrolledLevelAsync: vi.fn(async () => 3),
      AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
      },
      SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
    }));

    const { authenticateWithBiometrics } = await import("@/lib/app-lock/biometrics");

    await expect(authenticateWithBiometrics()).resolves.toEqual({ ok: true });

    const cancelled = await authenticateWithBiometrics();
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.reason).toBe("cancelled");

    const failed = await authenticateWithBiometrics();
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.reason).toBe("failed");

    expect(authenticateAsync).toHaveBeenCalledTimes(3);
  });

  it("treats lock screen as hiding customer information (no PII in lock messages)", async () => {
    const { appLockMessages } = await import("@/lib/app-lock/messages");
    const blob = JSON.stringify(appLockMessages).toLowerCase();
    expect(blob).not.toMatch(/@|order #|shipping|phone|email|card/);
    expect(appLockMessages.title).toBe("App Locked");
  });
});
