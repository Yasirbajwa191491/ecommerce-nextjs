import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { APP_LOCK_STORAGE_KEY, DEFAULT_APP_LOCK_CONFIG } from "@/lib/app-lock/constants";
import { parseAppLockConfig } from "@/lib/app-lock/policy";
import type { AppLockConfig, AppLockStorageResult } from "@/lib/app-lock/types";

/**
 * App Lock uses SecureStore only — never AsyncStorage.
 * Fail closed on read errors when App Lock may be enabled.
 */

async function isSecureStoreUsable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readAppLockConfig(): Promise<AppLockStorageResult<AppLockConfig>> {
  if (!(await isSecureStoreUsable())) {
    return { ok: false, error: "unavailable" };
  }

  try {
    const raw = await SecureStore.getItemAsync(APP_LOCK_STORAGE_KEY);
    if (raw == null) {
      return { ok: true, value: { ...DEFAULT_APP_LOCK_CONFIG } };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, error: "invalid" };
    }

    const config = parseAppLockConfig(parsedJson);
    if (!config) {
      return { ok: false, error: "invalid" };
    }

    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "read_failed" };
  }
}

export async function writeAppLockConfig(
  config: AppLockConfig
): Promise<AppLockStorageResult<AppLockConfig>> {
  if (!(await isSecureStoreUsable())) {
    return { ok: false, error: "unavailable" };
  }

  try {
    await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, JSON.stringify(config), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "write_failed" };
  }
}

export async function clearAppLockConfig(): Promise<AppLockStorageResult<null>> {
  if (!(await isSecureStoreUsable())) {
    return { ok: false, error: "unavailable" };
  }

  try {
    await SecureStore.deleteItemAsync(APP_LOCK_STORAGE_KEY);
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: "write_failed" };
  }
}
