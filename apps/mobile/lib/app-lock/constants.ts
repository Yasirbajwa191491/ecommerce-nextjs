import type { AppLockConfig, AppLockTimeoutId } from "@/lib/app-lock/types";

export const APP_LOCK_STORAGE_KEY = "app_lock_config_v1";

export const APP_LOCK_TIMEOUT_OPTIONS: readonly {
  id: AppLockTimeoutId;
  label: string;
  ms: number;
}[] = [
  { id: "immediate", label: "Immediately", ms: 0 },
  { id: "1m", label: "After 1 minute", ms: 60_000 },
  { id: "5m", label: "After 5 minutes", ms: 5 * 60_000 },
  { id: "15m", label: "After 15 minutes", ms: 15 * 60_000 },
] as const;

export const DEFAULT_APP_LOCK_TIMEOUT_ID: AppLockTimeoutId = "1m";

/**
 * Android BiometricPrompt temporary lockout after repeated failures is
 * typically 30 seconds. The OS does not expose remaining time via Expo, so
 * we show this countdown when `authenticateAsync` returns `lockout`.
 */
export const BIOMETRIC_TEMP_LOCKOUT_MS = 30_000;

export const DEFAULT_APP_LOCK_CONFIG: AppLockConfig = {
  enabled: false,
  timeoutId: DEFAULT_APP_LOCK_TIMEOUT_ID,
  enrolledLevelAtEnable: 0,
};

export function timeoutMsForId(timeoutId: AppLockTimeoutId): number {
  const match = APP_LOCK_TIMEOUT_OPTIONS.find((option) => option.id === timeoutId);
  return match?.ms ?? 60_000;
}
