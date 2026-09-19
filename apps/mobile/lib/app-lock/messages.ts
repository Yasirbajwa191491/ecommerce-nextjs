import type { AuthFailureReason, BiometricCapabilityStatus } from "@/lib/app-lock/types";

export const appLockMessages = {
  title: "App Locked",
  subtitle: "Unlock to continue",
  protectedNote: "Your app is protected by biometric authentication.",
  unlockButton: (label: string) => `Use ${label}`,
  unlockHint: "Authenticate to open the app.",
  settingsSection: "Privacy & Security",
  settingsTitle: "App Lock",
  settingsSubtitle: "Protect this app with Face ID, Touch ID, or fingerprint.",
  settingsEnabled: "Enabled",
  requireAuthLabel: "Require authentication",
  timeoutFooter:
    "App Lock is local device privacy. It does not sign you in or authorize orders or payments.",
  noHardware:
    "This device does not support biometric authentication. App Lock is unavailable.",
  notEnrolled:
    "No biometric authentication is enrolled on this device. Please set up Face ID, Touch ID, or a fingerprint in your device settings first.",
  unavailable:
    "Biometric authentication is temporarily unavailable. Please try again in a moment.",
  lockout:
    "Biometric authentication is temporarily locked. Wait a moment, then try again, or check your device settings.",
  cancelled: "Authentication was cancelled. App Lock was not changed.",
  failed: "Authentication failed. Please try again.",
  enableCancelled: "Authentication was cancelled. App Lock was not enabled.",
  disableCancelled: "Authentication was cancelled. App Lock remains enabled.",
  enableFailed: "Could not verify your identity. App Lock was not enabled.",
  disableFailed: "Could not verify your identity. App Lock remains enabled.",
  storageUnavailable:
    "Secure storage is unavailable on this device. App Lock cannot be enabled.",
  storageReadFailed:
    "Could not read App Lock settings securely. Protected content stays locked until this is resolved.",
  storageWriteFailed: "Could not save App Lock settings. Please try again.",
  biometricChanged:
    "Biometric settings on this device have changed. Re-enable App Lock after authenticating.",
  unsupportedPlatform: "App Lock is only available on iOS and Android devices.",
  openDeviceSettings: "Open device settings",
  timeoutRelaxCancelled:
    "Authentication was cancelled. The lock timeout was not changed.",
  timeoutRelaxFailed:
    "Could not verify your identity. The lock timeout was not changed.",
} as const;

export function messageForCapability(
  status: BiometricCapabilityStatus
): string | null {
  switch (status) {
    case "no_hardware":
      return appLockMessages.noHardware;
    case "not_enrolled":
      return appLockMessages.notEnrolled;
    case "unavailable":
      return appLockMessages.unavailable;
    case "unsupported_platform":
      return appLockMessages.unsupportedPlatform;
    case "ready":
      return null;
  }
}

export function messageForAuthFailure(reason: AuthFailureReason): string {
  switch (reason) {
    case "cancelled":
      return appLockMessages.cancelled;
    case "failed":
      return appLockMessages.failed;
    case "unavailable":
      return appLockMessages.unavailable;
    case "not_enrolled":
      return appLockMessages.notEnrolled;
    case "no_hardware":
      return appLockMessages.noHardware;
    case "lockout":
      return appLockMessages.lockout;
    case "unknown":
      return appLockMessages.failed;
  }
}
