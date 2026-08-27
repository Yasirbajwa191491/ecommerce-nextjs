import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemePreference } from "@/constants/theme";

import {
  DEFAULT_APP_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  PREFERENCES_VERSION,
  type AppPreferences,
  type NotificationPreferences,
  type ShoppingPreferences,
} from "@/lib/preferences/types";

function mergePreferences(partial: Partial<AppPreferences> | null): AppPreferences {
  if (!partial || typeof partial !== "object") {
    return { ...DEFAULT_APP_PREFERENCES };
  }
  return {
    version: PREFERENCES_VERSION,
    theme: partial.theme ?? DEFAULT_APP_PREFERENCES.theme,
    notifications: {
      ...DEFAULT_APP_PREFERENCES.notifications,
      ...partial.notifications,
    },
    shopping: {
      ...DEFAULT_APP_PREFERENCES.shopping,
      ...partial.shopping,
    },
  };
}

export async function readAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    if (!parsed || typeof parsed !== "object" || parsed.version !== PREFERENCES_VERSION) {
      return { ...DEFAULT_APP_PREFERENCES };
    }
    return mergePreferences(parsed);
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export async function writeAppPreferences(preferences: AppPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...preferences, version: PREFERENCES_VERSION })
    );
  } catch {
    // ignore persistence errors
  }
}

export async function updateAppPreferences(
  patch: Partial<Omit<AppPreferences, "version">>
): Promise<AppPreferences> {
  const current = await readAppPreferences();
  const next = mergePreferences({ ...current, ...patch });
  await writeAppPreferences(next);
  return next;
}

export async function setThemePreference(theme: ThemePreference): Promise<AppPreferences> {
  return updateAppPreferences({ theme });
}

export async function setNotificationPreferences(
  notifications: Partial<NotificationPreferences>
): Promise<AppPreferences> {
  const current = await readAppPreferences();
  return updateAppPreferences({
    notifications: { ...current.notifications, ...notifications },
  });
}

export async function setShoppingPreferences(
  shopping: Partial<ShoppingPreferences>
): Promise<AppPreferences> {
  const current = await readAppPreferences();
  return updateAppPreferences({
    shopping: { ...current.shopping, ...shopping },
  });
}

export async function resetAppPreferences(): Promise<AppPreferences> {
  const defaults = { ...DEFAULT_APP_PREFERENCES };
  await writeAppPreferences(defaults);
  return defaults;
}
