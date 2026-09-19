export type { AppLockConfig, AppLockTimeoutId, BiometricCapability } from "@/lib/app-lock/types";
export {
  APP_LOCK_TIMEOUT_OPTIONS,
  DEFAULT_APP_LOCK_CONFIG,
  DEFAULT_APP_LOCK_TIMEOUT_ID,
  timeoutMsForId,
} from "@/lib/app-lock/constants";
export { appLockMessages, messageForCapability } from "@/lib/app-lock/messages";
export {
  canNavigateWhileLocked,
  createDisabledConfig,
  createEnabledConfig,
  isTimeoutExpired,
  isTimeoutRelaxation,
  parseAppLockConfig,
  shouldExposeProtectedUi,
  shouldRequireAuthOnResume,
  shouldShowLockScreen,
} from "@/lib/app-lock/policy";
export {
  getAppLockGateState,
  isAppLockGateActive,
  setAppLockGateState,
  whenAppUnlocked,
} from "@/lib/app-lock/gate";
export {
  authenticateWithBiometrics,
  getBiometricCapability,
  getCurrentEnrolledLevel,
  isBiometricEnrollmentValid,
} from "@/lib/app-lock/biometrics";
export {
  clearAppLockConfig,
  readAppLockConfig,
  writeAppLockConfig,
} from "@/lib/app-lock/storage";
