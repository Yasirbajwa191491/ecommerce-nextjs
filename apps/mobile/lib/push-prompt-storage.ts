import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFERRED_AT_KEY = "@push/promptDeferredAt";
const DEFER_MS = 3 * 24 * 60 * 60 * 1000;

export async function shouldShowPushPermissionPrompt(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(DEFERRED_AT_KEY);
  if (!raw) {
    return true;
  }

  const deferredAt = Number(raw);
  if (!Number.isFinite(deferredAt)) {
    return true;
  }

  return Date.now() - deferredAt >= DEFER_MS;
}

export async function deferPushPermissionPrompt(): Promise<void> {
  await AsyncStorage.setItem(DEFERRED_AT_KEY, String(Date.now()));
}

export async function clearPushPermissionPromptDeferral(): Promise<void> {
  await AsyncStorage.removeItem(DEFERRED_AT_KEY);
}
