import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  canRequestNotificationPermission,
  formatPushRegistrationError,
  resolveNotificationPermissionState,
  type NotificationPermissionState,
} from "@/lib/push-permission-logic";
import type { PushPlatform } from "@/types/notifications";

export type { NotificationPermissionState };
export { canRequestNotificationPermission, formatPushRegistrationError };

export function configureForegroundNotificationBehavior() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("order-updates", {
    name: "Order updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6254f3",
  });
}

export function getPushPlatform(): PushPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "unknown";
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || typeof projectId !== "string") {
    throw new Error("Expo project ID is missing from app config.");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  return resolveNotificationPermissionState(settings);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = await Notifications.getPermissionsAsync();
  const currentState = resolveNotificationPermissionState(current);
  if (currentState === "granted") {
    return "granted";
  }
  if (!canRequestNotificationPermission(current)) {
    return "denied";
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
    android: {},
  });

  return resolveNotificationPermissionState(requested);
}

export type PushNotificationData = {
  type?: string;
  event?: string;
  eventKey?: string;
  orderId?: string;
  orderNumber?: string;
  deepLinkPath?: string;
};

export function parsePushNotificationData(
  data: Record<string, unknown> | undefined
): PushNotificationData | null {
  if (!data || data.type !== "order.notification") {
    return null;
  }

  return {
    type: typeof data.type === "string" ? data.type : undefined,
    event: typeof data.event === "string" ? data.event : undefined,
    eventKey: typeof data.eventKey === "string" ? data.eventKey : undefined,
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : undefined,
    deepLinkPath: typeof data.deepLinkPath === "string" ? data.deepLinkPath : undefined,
  };
}
