export type NotificationPermissionState = "granted" | "denied" | "undetermined";

export type PermissionSettingsLike = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: {
    status?: number;
  };
};

const IOS_AUTHORIZED = 2;
const IOS_PROVISIONAL = 3;

/** Whether the native OS permission dialog can still be shown. */
export function canRequestNotificationPermission(
  settings: PermissionSettingsLike
): boolean {
  if (settings.status === "granted") {
    return false;
  }

  if (
    settings.granted === true ||
    settings.ios?.status === IOS_AUTHORIZED ||
    settings.ios?.status === IOS_PROVISIONAL
  ) {
    return false;
  }

  return settings.canAskAgain !== false;
}

export function resolveNotificationPermissionState(
  settings: PermissionSettingsLike
): NotificationPermissionState {
  if (settings.status === "granted") {
    return "granted";
  }

  if (
    settings.granted === true ||
    settings.ios?.status === IOS_AUTHORIZED ||
    settings.ios?.status === IOS_PROVISIONAL
  ) {
    return "granted";
  }

  if (settings.canAskAgain === false) {
    return "denied";
  }

  return "undetermined";
}

export function formatPushRegistrationError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("fcm") ||
    lower.includes("firebase") ||
    lower.includes("google-services")
  ) {
    return "Push delivery is not configured for this Android build yet. Rebuild the APK with Firebase (FCM) credentials in EAS.";
  }
  if (lower.includes("verify a recent order")) {
    return "Place or open your order once more, then tap Register this device.";
  }
  if (lower.includes("project id is missing")) {
    return "This app build is missing the Expo project ID required for push notifications.";
  }
  return message;
}
