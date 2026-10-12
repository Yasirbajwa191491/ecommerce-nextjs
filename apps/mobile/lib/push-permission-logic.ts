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
    return "Order alerts are unavailable in this version of the app. You can still track your order here.";
  }
  if (lower.includes("verify a recent order")) {
    return "Open a recent order, then try enabling order alerts again.";
  }
  if (lower.includes("project id is missing")) {
    return "Order alerts are unavailable in this version of the app. You can still track your order here.";
  }
  if (lower.includes("network") || lower.includes("offline") || lower.includes("fetch")) {
    return "Check your internet connection, then try enabling order alerts again.";
  }
  return "We couldn't enable order alerts right now. You can still track your order here and try again later.";
}

export type PushCapability = { available: boolean; reason: "available" | "preview" | "unsupported" | "not_configured"; message: string | null };

export function resolvePushCapability(args: { platform: string; isDevice: boolean; environment: string; enabled: boolean; projectId?: string }): PushCapability {
  if (args.platform !== "android" && args.platform !== "ios" || !args.isDevice) {
    return { available: false, reason: "unsupported", message: "Order alerts aren't available on this device. Track your order in the app." };
  }
  if (args.environment === "storeClient") {
    return { available: false, reason: "preview", message: "Device order alerts aren't available in this preview. Track your order in the app." };
  }
  if (!args.enabled || !args.projectId) {
    return { available: false, reason: "not_configured", message: "Order alerts are unavailable in this version of the app. You can still track your order here." };
  }
  return { available: true, reason: "available", message: null };
}
