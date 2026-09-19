import {
  DEFAULT_APP_LOCK_CONFIG,
  timeoutMsForId,
} from "@/lib/app-lock/constants";
import type { AppLockConfig, AppLockTimeoutId } from "@/lib/app-lock/types";

/**
 * Pure policy helpers for App Lock. No React Native / Expo imports —
 * kept unit-testable without native modules.
 */

export function shouldRequireAuthOnResume(args: {
  enabled: boolean;
  timeoutId: AppLockTimeoutId;
  lastBackgroundAt: number | null;
  now: number;
}): boolean {
  if (!args.enabled) return false;
  // No background timestamp means we have not left for timeout purposes
  // (including immediately after a successful unlock). Cold start is gated
  // by hydration (`unlocked: false` when enabled), not this resume helper.
  if (args.lastBackgroundAt == null) return false;

  const timeoutMs = timeoutMsForId(args.timeoutId);
  if (timeoutMs <= 0) return true;

  return args.now - args.lastBackgroundAt >= timeoutMs;
}

/** True when the new timeout is longer (weaker) than the current one. */
export function isTimeoutRelaxation(
  current: AppLockTimeoutId,
  next: AppLockTimeoutId
): boolean {
  return timeoutMsForId(next) > timeoutMsForId(current);
}

export function isTimeoutExpired(args: {
  timeoutId: AppLockTimeoutId;
  lastBackgroundAt: number;
  now: number;
}): boolean {
  const timeoutMs = timeoutMsForId(args.timeoutId);
  if (timeoutMs <= 0) return true;
  return args.now - args.lastBackgroundAt >= timeoutMs;
}

export function shouldExposeProtectedUi(args: {
  hydrated: boolean;
  enabled: boolean;
  unlocked: boolean;
  storageUnreliable: boolean;
}): boolean {
  if (!args.hydrated) return false;
  if (args.storageUnreliable) return false;
  if (!args.enabled) return true;
  return args.unlocked;
}

export function shouldShowLockScreen(args: {
  hydrated: boolean;
  enabled: boolean;
  unlocked: boolean;
  storageUnreliable: boolean;
}): boolean {
  return !shouldExposeProtectedUi(args);
}

/**
 * Branded "App Locked" UI — only after we know App Lock is on (or storage
 * failed closed). Pre-hydrate uses a neutral bootstrap cover instead so
 * users who never enabled App Lock never see this screen.
 */
export function shouldShowBrandedLockScreen(args: {
  hydrated: boolean;
  enabled: boolean;
  unlocked: boolean;
  storageUnreliable: boolean;
}): boolean {
  if (!args.hydrated) return false;
  return shouldShowLockScreen(args);
}

export function parseAppLockConfig(raw: unknown): AppLockConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.enabled !== "boolean") return null;
  if (
    value.timeoutId !== "immediate" &&
    value.timeoutId !== "1m" &&
    value.timeoutId !== "5m" &&
    value.timeoutId !== "15m"
  ) {
    return null;
  }
  if (
    typeof value.enrolledLevelAtEnable !== "number" ||
    !Number.isFinite(value.enrolledLevelAtEnable)
  ) {
    return null;
  }
  return {
    enabled: value.enabled,
    timeoutId: value.timeoutId,
    enrolledLevelAtEnable: value.enrolledLevelAtEnable,
  };
}

export function createEnabledConfig(args: {
  timeoutId?: AppLockTimeoutId;
  enrolledLevel: number;
}): AppLockConfig {
  return {
    enabled: true,
    timeoutId: args.timeoutId ?? DEFAULT_APP_LOCK_CONFIG.timeoutId,
    enrolledLevelAtEnable: args.enrolledLevel,
  };
}

export function createDisabledConfig(
  previous: AppLockConfig | null
): AppLockConfig {
  return {
    enabled: false,
    timeoutId: previous?.timeoutId ?? DEFAULT_APP_LOCK_CONFIG.timeoutId,
    enrolledLevelAtEnable: 0,
  };
}

export function canNavigateWhileLocked(isLocked: boolean): boolean {
  return !isLocked;
}
